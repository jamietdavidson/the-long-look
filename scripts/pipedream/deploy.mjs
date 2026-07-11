#!/usr/bin/env node
/**
 * Deploy Pipedream workflow code via REST API + CLI fallback.
 *
 * 1. GET /workflows/{id} → find the Node code step's saved component (sc_...)
 * 2. POST /components with component_id + component_code (update in place)
 * 3. Fall back to `pd publish` if the API update path is rejected
 */
import {execFileSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';

const API_BASE = 'https://api.pipedream.com/v1';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPEDREAM_ROOT = __dirname;

function log(message) {
  console.log(`[pipedream-deploy] ${message}`);
}

function die(message) {
  console.error(`[pipedream-deploy] ERROR: ${message}`);
  process.exit(1);
}

function loadConfig() {
  return JSON.parse(
    readFileSync(join(PIPEDREAM_ROOT, 'deploy.config.json'), 'utf8'),
  );
}

function unwrap(payload) {
  return payload?.data ?? payload;
}

function stripExportsForInline(content) {
  return content.replace(
    /^export\s+(const|let|var|function|async function|class)\s/gm,
    '$1 ',
  );
}

function removeRelativeImports(content) {
  return content.replace(
    /import\s+(?:\{[\s\S]*?\}|[^'"\n]+)\s+from\s+['"]\.\/[^'"]+['"];?\s*/g,
    '',
  );
}

function bundleWorkflow(sourceDir) {
  const scriptPath = join(sourceDir, 'script.js');
  if (!existsSync(scriptPath)) {
    throw new Error(`Missing script.js in ${sourceDir}`);
  }

  const parts = [];
  const configPath = join(sourceDir, 'config.js');
  const utilsPath = join(sourceDir, 'utils.js');

  if (existsSync(configPath)) {
    parts.push(stripExportsForInline(readFileSync(configPath, 'utf8')));
  }

  if (existsSync(utilsPath)) {
    let utils = readFileSync(utilsPath, 'utf8');
    utils = removeRelativeImports(utils);
    parts.push(stripExportsForInline(utils));
  }

  let script = readFileSync(scriptPath, 'utf8');
  script = removeRelativeImports(script);
  parts.push(script);

  return `${parts.join('\n\n').trim()}\n`;
}

function bumpVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  if (!match) {
    return '0.0.1';
  }
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function extractVersion(code) {
  const match = /version:\s*['"]([^'"]+)['"]/.exec(code ?? '');
  return match?.[1] ?? null;
}

function extractKey(code) {
  const match = /key:\s*['"]([^'"]+)['"]/.exec(code ?? '');
  return match?.[1] ?? null;
}

function injectComponentMetadata(bundled, {componentKey, name, version}) {
  const existingKey = extractKey(bundled);
  const targetKey = existingKey ?? componentKey;

  if (existingKey) {
    return bundled.replace(
      /version:\s*['"][^'"]+['"]/,
      `version: '${version}'`,
    );
  }

  const metadata = `  key: '${targetKey}',
  name: '${name.replace(/'/g, "\\'")}',
  version: '${version}',
  type: 'action',
`;

  if (!/export default defineComponent\(\{/.test(bundled)) {
    throw new Error('Bundled code must export defineComponent(...)');
  }

  return bundled.replace(
    /export default defineComponent\(\{/,
    `export default defineComponent({\n${metadata}`,
  );
}

async function pipedreamRequest(apiKey, method, path, {query, body, orgId} = {}) {
  const url = new URL(`${API_BASE}${path}`);
  const params = {...query};
  if (orgId && !params.org_id) {
    params.org_id = orgId;
  }
  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      url.searchParams.set(key, value);
    }
  }

  const payloadBody =
    body && orgId && body.org_id == null ? {...body, org_id: orgId} : body;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: payloadBody ? JSON.stringify(payloadBody) : undefined,
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const detail =
      typeof payload === 'object' && payload?.error
        ? payload.error
        : typeof payload === 'string'
          ? payload
          : JSON.stringify(payload);
    throw new Error(`${method} ${path} failed (${response.status}): ${detail}`);
  }

  return payload;
}

function formatStepSummary(steps) {
  return (steps ?? []).map((step) => ({
    namespace: step.namespace,
    type: step.type,
    lang: step.lang ?? step.runtime,
    component: step.component,
    component_key: step.component_key,
    savedComponentId: step.savedComponent?.id,
  }));
}

function isNodeStep(step) {
  const lang = step.lang ?? step.runtime ?? '';
  return /node/i.test(lang);
}

function findDeployableStep(steps, {stepNamespace, componentKey}) {
  const candidates = (steps ?? []).filter((step) => {
    if (!isNodeStep(step)) {
      return false;
    }
    if (stepNamespace && step.namespace !== stepNamespace) {
      return false;
    }
    if (step.savedComponent?.id) {
      return true;
    }
    if (componentKey && step.component_key === componentKey) {
      return true;
    }
    if (step.component === true || step.type === 'CodeCell') {
      return true;
    }
    return false;
  });

  if (stepNamespace) {
    const match = candidates.find((step) => step.namespace === stepNamespace);
    if (!match) {
      throw new Error(
        `Configured step "${stepNamespace}" not found. Steps: ${JSON.stringify(formatStepSummary(steps))}`,
      );
    }
    return match;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (candidates.length === 0) {
    return null;
  }

  const withSavedComponent = candidates.filter((step) => step.savedComponent?.id);
  if (withSavedComponent.length === 1) {
    return withSavedComponent[0];
  }

  throw new Error(
    `Multiple deployable Node steps found (${candidates.map((s) => s.namespace).join(', ')}). Set "step" in deploy.config.json. Steps: ${JSON.stringify(formatStepSummary(steps))}`,
  );
}

async function publishActionOnly(apiKey, orgId, workflowConfig, bundled, sourceSha) {
  const existing = await getComponent(apiKey, orgId, workflowConfig.componentKey);
  const nextVersion = bumpVersion(existing?.version);
  const publishCode = injectComponentMetadata(bundled, {
    componentKey: workflowConfig.componentKey,
    name: workflowConfig.name,
    version: nextVersion,
  });
  const tempDir = mkdtempSync(join(tmpdir(), 'pipedream-publish-'));
  const publishPath = join(tempDir, `${workflowConfig.source}.js`);
  writeFileSync(publishPath, publishCode, 'utf8');
  configurePdCli(apiKey, orgId);

  let result;
  if (existing?.id) {
    try {
      result = await updateSavedComponent(
        apiKey,
        orgId,
        existing.id,
        publishCode,
      );
    } catch (error) {
      log(`API publish failed, trying pd publish: ${error.message}`);
    }
  }

  if (!result) {
    publishWithCli(publishPath);
  }

  log(
    `Published action ${workflowConfig.componentKey}@${nextVersion} for ${workflowConfig.workflowId} from ${sourceSha}`,
  );
  return {
    status: 'published',
    componentId: result?.id ?? existing?.id,
    version: nextVersion,
  };
}

async function resolveAccessToken() {
  const apiKey = process.env.PIPEDREAM_API_KEY?.trim().replace(/^Bearer\s+/i, '');
  const clientId = process.env.PIPEDREAM_CLIENT_ID?.trim();
  const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET?.trim();

  if (clientId && clientSecret) {
    const response = await fetch(`${API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(
        `OAuth token exchange failed (${response.status}): ${payload?.error ?? JSON.stringify(payload)}`,
      );
    }
    log('Authenticated with OAuth client credentials');
    return {token: payload.access_token, mode: 'oauth'};
  }

  if (apiKey) {
    try {
      await pipedreamRequest(apiKey, 'GET', '/users/me');
      log('Authenticated with user API key');
      return {token: apiKey, mode: 'user_api_key'};
    } catch (error) {
      throw new Error(
        `PIPEDREAM_API_KEY is invalid (${error.message}). ` +
          'Create a User API key at Pipedream → My Account → API Key (not a workspace OAuth client secret). ' +
          'Alternatively set PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET.',
      );
    }
  }

  throw new Error(
    'Set PIPEDREAM_API_KEY (user API key) or PIPEDREAM_CLIENT_ID + PIPEDREAM_CLIENT_SECRET',
  );
}

async function getWorkflow(apiKey, orgId, workflowId, projectId) {
  const payload = await pipedreamRequest(apiKey, 'GET', `/workflows/${workflowId}`, {
    orgId,
    query: {
      project_id: projectId,
      include: 'steps',
    },
  });
  return unwrap(payload);
}

async function getComponent(apiKey, orgId, componentIdOrKey) {
  try {
    const payload = await pipedreamRequest(
      apiKey,
      'GET',
      `/components/${componentIdOrKey}`,
      {orgId},
    );
    return unwrap(payload);
  } catch (error) {
    if (String(error.message).includes('(404)')) {
      return null;
    }
    throw error;
  }
}

async function updateSavedComponent(apiKey, orgId, componentId, componentCode) {
  const attempts = [
    {
      label: 'POST /components with component_id',
      run: () =>
        pipedreamRequest(apiKey, 'POST', '/components', {
          orgId,
          body: {component_id: componentId, component_code: componentCode},
        }),
    },
    {
      label: 'PUT /components/{id}',
      run: () =>
        pipedreamRequest(apiKey, 'PUT', `/components/${componentId}`, {
          orgId,
          body: {component_code: componentCode},
        }),
    },
    {
      label: 'POST /components code only',
      run: () =>
        pipedreamRequest(apiKey, 'POST', '/components', {
          orgId,
          body: {component_code: componentCode},
        }),
    },
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      const result = await attempt.run();
      log(`Updated via ${attempt.label}`);
      return unwrap(result);
    } catch (error) {
      lastError = error;
      log(`${attempt.label} failed: ${error.message}`);
    }
  }

  throw lastError;
}

function configurePdCli(apiKey, orgId) {
  const configDir = join(process.env.HOME ?? tmpdir(), '.config', 'pipedream');
  execFileSync('mkdir', ['-p', configDir]);
  writeFileSync(
    join(configDir, 'config'),
    [
      'api_key = ' + apiKey,
      'org_id = ' + orgId,
      '',
      '[thelonglook]',
      'api_key = ' + apiKey,
      'org_id = ' + orgId,
      '',
    ].join('\n'),
    'utf8',
  );
}

function ensurePdCli() {
  try {
    execFileSync('pd', ['--version'], {stdio: 'pipe'});
    return;
  } catch {
    log('Installing Pipedream CLI...');
    execFileSync('sh', ['-c', 'curl -fsSL https://cli.pipedream.com/install | sh'], {
      stdio: 'inherit',
    });
  }
}

function publishWithCli(componentPath) {
  ensurePdCli();
  execFileSync('pd', ['publish', componentPath, '--profile', 'thelonglook'], {
    stdio: 'inherit',
  });
  return {};
}

async function deployWorkflow(apiKey, orgId, workflowConfig, projectId, sourceSha) {
  const sourceDir = join(PIPEDREAM_ROOT, workflowConfig.source);
  if (!existsSync(sourceDir)) {
    throw new Error(`Source workflow folder not found: ${workflowConfig.source}`);
  }

  const bundled = bundleWorkflow(sourceDir);
  const workflow = await getWorkflow(apiKey, orgId, workflowConfig.workflowId, projectId);
  const step = findDeployableStep(workflow.steps, workflowConfig);

  if (!step?.savedComponent?.id) {
    log(
      `No inline code step in ${workflowConfig.workflowId}; publishing private action instead. Steps: ${JSON.stringify(formatStepSummary(workflow.steps))}`,
    );
    return publishActionOnly(apiKey, orgId, workflowConfig, bundled, sourceSha);
  }

  const savedComponentId = step.savedComponent.id;
  const existing = await getComponent(apiKey, orgId, savedComponentId);
  const existingCode = existing?.code ?? step.savedComponent?.code ?? '';
  const existingKey =
    existing?.key ?? step.savedComponent?.key ?? extractKey(existingCode);
  const existingVersion =
    existing?.version ??
    step.savedComponent?.version ??
    extractVersion(existingCode);

  const nextVersion = bumpVersion(
    existingKey
      ? (existingVersion || (await getComponent(apiKey, orgId, existingKey))?.version)
      : existingVersion,
  );

  const componentCode = existingKey
    ? injectComponentMetadata(bundled, {
        componentKey: existingKey,
        name: workflowConfig.name,
        version: nextVersion,
      })
    : bundled;

  log(
    `Deploying ${workflowConfig.source} → ${workflowConfig.workflowId}/${step.namespace} (${savedComponentId})`,
  );

  let result;
  try {
    result = await updateSavedComponent(apiKey, orgId, savedComponentId, componentCode);
  } catch (apiError) {
    log(`API update failed, trying pd publish: ${apiError.message}`);
    const tempDir = mkdtempSync(join(tmpdir(), 'pipedream-publish-'));
    const publishPath = join(tempDir, `${workflowConfig.source}.js`);
    const publishCode = injectComponentMetadata(bundled, {
      componentKey: workflowConfig.componentKey,
      name: workflowConfig.name,
      version: nextVersion,
    });
    writeFileSync(publishPath, publishCode, 'utf8');
    configurePdCli(apiKey, orgId);
    result = publishWithCli(publishPath);
    log(
      `Published action ${workflowConfig.componentKey}@${nextVersion} via CLI (update workflow step to this action if needed)`,
    );
  }

  const componentId = result?.id ?? savedComponentId;
  log(
    `Deployed ${workflowConfig.source} (${componentId}) from ${sourceSha}`,
  );

  return {status: 'published', componentId, version: nextVersion};
}

async function main() {
  const orgId = process.env.PIPEDREAM_ORG_ID?.trim();
  const sourceSha = process.env.SOURCE_SHA ?? 'local';
  const config = loadConfig();
  const {token: apiKey} = await resolveAccessToken();
  const projectId = config.projectId;

  if (!orgId) {
    die('PIPEDREAM_ORG_ID is required');
  }

  let published = 0;

  for (const workflowConfig of config.workflows) {
    await deployWorkflow(apiKey, orgId, workflowConfig, projectId, sourceSha);
    published += 1;
  }

  log(`Done. published=${published}`);
}

main().catch((error) => {
  die(error.message);
});
