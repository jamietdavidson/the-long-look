#!/usr/bin/env node
/**
 * Deploy Pipedream workflow code via REST API + CLI fallback.
 *
 * 1. GET /workflows/{id} → find the Node code step's saved component (sc_...)
 * 2. POST /components with component_id + component_code (update in place)
 * 3. Fall back to `pd publish` if the API update path is rejected
 */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
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
  const versionMatch = /\bversion:\s*['"]([^'"]+)['"]/.exec(extractComponentHeader(code));
  return versionMatch?.[1] ?? null;
}

function extractComponentHeader(code) {
  const match = /export default (?:defineComponent\()?\{([\s\S]*?)(?:\n\s*props:|\n\s*async run|\n\s*run\s*\()/.exec(
    code ?? '',
  );
  return match?.[1] ?? '';
}

function extractKey(code) {
  const keyMatch = /\bkey:\s*['"]([^'"]+)['"]/.exec(extractComponentHeader(code));
  return keyMatch?.[1] ?? null;
}

function toPlainComponentExport(code) {
  if (!/export default defineComponent\(\{/.test(code)) {
    return code;
  }
  return code
    .replace(/export default defineComponent\(\{/, 'export default {')
    .replace(/\}\);\s*$/, '};');
}

function buildPublishCode(bundled, {componentKey, name, version}) {
  const withMetadata = injectComponentMetadata(bundled, {
    componentKey,
    name,
    version,
  });
  return toPlainComponentExport(withMetadata);
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
  let nextVersion = bumpVersion(existing?.version);
  const publishCode = buildPublishCode(bundled, {
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
    const publishedVersion = publishActionWithVersionRetry(
      publishPath,
      bundled,
      workflowConfig,
      nextVersion,
    );
    nextVersion = publishedVersion;
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

function codeHash(code) {
  return createHash('sha256').update(code ?? '').digest('hex');
}

function publishedMatchesBundle(publishedCode, bundled) {
  if (!publishedCode || publishedCode.split('\n').length < 20) {
    return false;
  }

  const sharedAnchors = [
    'appC7O4qp56Rdaj7c',
    'resolvePrintRecord',
    'markRecordCommitted',
    'tblcFW8sQcKON8zW4',
  ].filter((anchor) => bundled.includes(anchor));

  const matchedAnchors = sharedAnchors.filter((anchor) =>
    publishedCode.includes(anchor),
  ).length;
  return matchedAnchors >= 2 && publishedCode.length >= bundled.length * 0.5;
}

async function verifyInlineComponentUpdate(apiKey, orgId, componentId, expectedCode, beforeHash) {
  const after = await getComponent(apiKey, orgId, componentId);
  const remoteCode = after?.code ?? '';
  const afterHash = after?.code_hash ?? codeHash(remoteCode);
  const hashChanged = Boolean(beforeHash && afterHash && beforeHash !== afterHash);
  const contentMatches = publishedMatchesBundle(remoteCode, expectedCode);

  return {
    ok: hashChanged || contentMatches,
    remoteCode,
    beforeHash,
    afterHash,
    hashChanged,
    contentMatches,
  };
}

async function publishWorkflowAction(apiKey, orgId, workflowConfig, bundled, startVersion) {
  const existingPublished = workflowConfig.publishedComponentId
    ? await getComponent(apiKey, orgId, workflowConfig.publishedComponentId)
    : await getComponent(apiKey, orgId, workflowConfig.componentKey);
  const nextVersion = bumpVersion(existingPublished?.version ?? startVersion);
  const tempDir = mkdtempSync(join(tmpdir(), 'pipedream-publish-'));
  const publishPath = join(tempDir, `${workflowConfig.source}.js`);
  configurePdCli(apiKey, orgId);
  const publishedVersion = publishActionWithVersionRetry(
    publishPath,
    bundled,
    workflowConfig,
    nextVersion,
  );

  let published;
  let publishedCode = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    published = await getComponent(
      apiKey,
      orgId,
      workflowConfig.publishedComponentId ?? workflowConfig.componentKey,
    );
    publishedCode = published?.code ?? '';
    if (publishedMatchesBundle(publishedCode, bundled)) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  if (!publishedMatchesBundle(publishedCode, bundled)) {
    throw new Error(
      `Published action ${workflowConfig.componentKey}@${publishedVersion} does not contain expected code`,
    );
  }
  log(
    `Published action ${workflowConfig.componentKey}@${publishedVersion} (${published?.id ?? 'unknown id'})`,
  );
  log(
    `If the workflow still shows old inline code, replace the code step with My Actions → ${workflowConfig.componentKey}`,
  );
  return {status: 'published', componentId: published?.id, version: publishedVersion};
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
  const localPd = join(process.env.HOME ?? tmpdir(), '.local', 'bin', 'pd');
  if (existsSync(localPd)) {
    process.env.PATH = `${join(process.env.HOME ?? '', '.local', 'bin')}:${process.env.PATH ?? ''}`;
  }

  try {
    execFileSync('pd', ['--version'], {stdio: 'pipe'});
    return;
  } catch {
    log('Installing Pipedream CLI to ~/.local/bin ...');
    const version = execFileSync('curl', ['-fsSL', 'https://cli.pipedream.com/LATEST_VERSION'], {
      encoding: 'utf8',
    }).trim();
    const os = process.platform === 'darwin' ? 'darwin' : 'linux';
    const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
    const zipPath = join(tmpdir(), 'pd.zip');
    execFileSync('curl', ['-fsSL', '-o', zipPath, `https://cli.pipedream.com/${os}/${arch}/${version}/pd.zip`]);
    const installDir = join(process.env.HOME ?? tmpdir(), '.local', 'bin');
    execFileSync('mkdir', ['-p', installDir]);
    execFileSync('unzip', ['-o', zipPath, '-d', tmpdir()]);
    execFileSync('cp', [join(tmpdir(), 'pd'), join(installDir, 'pd')]);
    execFileSync('chmod', ['+x', join(installDir, 'pd')]);
    process.env.PATH = `${installDir}:${process.env.PATH ?? ''}`;
  }
}

function publishWithCli(componentPath, {dev = false} = {}) {
  ensurePdCli();
  const args = ['publish', componentPath, '--profile', 'thelonglook'];
  if (dev) args.push('--dev');
  try {
    execFileSync('pd', args, {
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}${error.message}`;
    throw new Error(output.trim() || 'pd publish failed');
  }
  return {};
}

function publishActionWithVersionRetry(componentPath, bundled, workflowConfig, startVersion) {
  const writePublishCode = (version) => {
    const publishCode = buildPublishCode(bundled, {
      componentKey: workflowConfig.componentKey,
      name: workflowConfig.name,
      version,
    });
    writeFileSync(componentPath, publishCode, 'utf8');
  };

  let version = startVersion;

  for (let attempt = 0; attempt < 6; attempt++) {
    writePublishCode(version);

    try {
      publishWithCli(componentPath);
      return version;
    } catch (error) {
      const message = String(error.message);
      if (!/already published|409/.test(message)) {
        throw error;
      }
      version = bumpVersion(version);
      log(`Publish version conflict for ${workflowConfig.componentKey}, retrying as ${version}`);
    }
  }

  throw new Error(`Unable to publish ${workflowConfig.componentKey} after version retries`);
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
  const beforeHash = existing?.code_hash ?? codeHash(existing?.code ?? step.savedComponent?.code ?? '');
  const existingCode = existing?.code ?? step.savedComponent?.code ?? '';
  const existingKey =
    existing?.key ?? step.savedComponent?.key ?? extractKey(existingCode);
  const existingVersion =
    existing?.version ??
    step.savedComponent?.version ??
    extractVersion(existingCode);

  let nextVersion = bumpVersion(
    existingKey
      ? (existingVersion || (await getComponent(apiKey, orgId, existingKey))?.version)
      : existingVersion,
  );

  const componentCode = prepareWorkflowComponentCode(bundled, {
    componentKey: existingKey ?? workflowConfig.componentKey,
    name: workflowConfig.name,
    version: nextVersion,
    existingKey,
  });

  log(
    `Deploying ${workflowConfig.source} → ${workflowConfig.workflowId}/${step.namespace} (${savedComponentId})`,
  );

  let inlineUpdated = false;
  try {
    await updateSavedComponent(apiKey, orgId, savedComponentId, componentCode);
    const verification = await verifyInlineComponentUpdate(
      apiKey,
      orgId,
      savedComponentId,
      componentCode,
      beforeHash,
    );
    if (verification.ok) {
      inlineUpdated = true;
      log(`Inline component updated (${savedComponentId}) from ${sourceSha}`);
    } else {
      log(
        `Inline component update did not change code (hash ${verification.beforeHash} → ${verification.afterHash}); falling back to pd publish`,
      );
    }
  } catch (apiError) {
    log(`API inline update failed, trying pd publish: ${apiError.message}`);
  }

  if (!inlineUpdated) {
    return publishWorkflowAction(apiKey, orgId, workflowConfig, bundled, nextVersion);
  }

  return {status: 'published', componentId: savedComponentId, version: nextVersion};
}

function parseCliArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const workflowFilter = argv.find((arg, index) => {
    return argv[index - 1] === '--workflow';
  });
  return {
    dryRun: flags.has('--dry-run'),
    compare: flags.has('--compare'),
    workflowFilter,
  };
}

function codeMarkers(code) {
  return {
    defineComponent: /export default defineComponent\(\{/.test(code),
    plainExport: /export default \{/.test(code) && !/defineComponent/.test(code),
    getTriggerPrintRecord: code.includes('getTriggerPrintRecord'),
    resolvePrintRecord: code.includes('resolvePrintRecord'),
    markRecordCommitted: code.includes('markRecordCommitted'),
    collectionField: /collection:\s*'Collection'/.test(code),
    collectionsField: /collections:\s*'Collections'/.test(code),
    batchArtistSync: code.includes('listTableRecords($, airtable, AIRTABLE.artistsTable)'),
    lines: code.split('\n').length,
  };
}

function prepareWorkflowComponentCode(bundled, {componentKey, name, version, existingKey}) {
  return existingKey
    ? injectComponentMetadata(bundled, {
        componentKey: existingKey,
        name,
        version,
      })
    : bundled;
}

async function compareWorkflow(apiKey, orgId, workflowConfig, projectId) {
  const sourceDir = join(PIPEDREAM_ROOT, workflowConfig.source);
  const bundled = bundleWorkflow(sourceDir);
  const workflow = await getWorkflow(apiKey, orgId, workflowConfig.workflowId, projectId);
  const step = findDeployableStep(workflow.steps, workflowConfig);

  if (!step?.savedComponent?.id) {
    log(`No inline code step for ${workflowConfig.workflowId}`);
    log(`Steps: ${JSON.stringify(formatStepSummary(workflow.steps))}`);
    return;
  }

  const savedComponentId = step.savedComponent.id;
  const existing = await getComponent(apiKey, orgId, savedComponentId);
  const remoteCode = existing?.code ?? step.savedComponent?.code ?? '';
  const existingKey =
    existing?.key ?? step.savedComponent?.key ?? extractKey(remoteCode);
  const existingVersion =
    existing?.version ??
    step.savedComponent?.version ??
    extractVersion(remoteCode);
  const nextVersion = bumpVersion(
    existingKey
      ? (existingVersion || (await getComponent(apiKey, orgId, existingKey))?.version)
      : existingVersion,
  );
  const localDeployCode = prepareWorkflowComponentCode(bundled, {
    componentKey: workflowConfig.componentKey,
    name: workflowConfig.name,
    version: nextVersion,
    existingKey,
  });

  const outDir = mkdtempSync(join(tmpdir(), 'pipedream-compare-'));
  const paths = {
    bundled: join(outDir, `${workflowConfig.source}.bundled.js`),
    deploy: join(outDir, `${workflowConfig.source}.deploy.js`),
    remote: join(outDir, `${workflowConfig.source}.remote.js`),
  };
  writeFileSync(paths.bundled, bundled, 'utf8');
  writeFileSync(paths.deploy, localDeployCode, 'utf8');
  writeFileSync(paths.remote, remoteCode, 'utf8');

  const localMarkers = codeMarkers(localDeployCode);
  const remoteMarkers = codeMarkers(remoteCode);
  const checks = [
    'defineComponent',
    'resolvePrintRecord',
    'getTriggerPrintRecord',
    'markRecordCommitted',
    'collectionField',
    'batchArtistSync',
  ];
  const mismatches = checks.filter((key) => localMarkers[key] !== remoteMarkers[key]);

  log(`Compare ${workflowConfig.source} → ${workflowConfig.workflowId}/${step.namespace} (${savedComponentId})`);
  log(`Remote key=${existingKey ?? '(none)'} version=${existingVersion ?? '(none)'} → next=${nextVersion}`);
  log(`Local deploy markers: ${JSON.stringify(localMarkers)}`);
  log(`Remote markers:       ${JSON.stringify(remoteMarkers)}`);
  log(mismatches.length ? `Mismatch: ${mismatches.join(', ')}` : 'Markers match — remote should match deploy output');
  log(`Files written:\n  ${paths.remote}\n  ${paths.deploy}\n  ${paths.bundled}`);
  log(`Diff remote→deploy: diff -u ${paths.remote} ${paths.deploy}`);
}

async function dryRunWorkflow(workflowConfig) {
  const sourceDir = join(PIPEDREAM_ROOT, workflowConfig.source);
  const bundled = bundleWorkflow(sourceDir);
  const deployCode = prepareWorkflowComponentCode(bundled, {
    componentKey: workflowConfig.componentKey,
    name: workflowConfig.name,
    version: '0.0.1',
    existingKey: workflowConfig.componentKey,
  });
  const publishCode = buildPublishCode(bundled, {
    componentKey: workflowConfig.componentKey,
    name: workflowConfig.name,
    version: '0.0.1',
  });

  const outDir = mkdtempSync(join(tmpdir(), 'pipedream-dry-run-'));
  const paths = {
    bundled: join(outDir, `${workflowConfig.source}.bundled.js`),
    workflowDeploy: join(outDir, `${workflowConfig.source}.workflow-deploy.js`),
    cliPublish: join(outDir, `${workflowConfig.source}.cli-publish.js`),
  };
  writeFileSync(paths.bundled, bundled, 'utf8');
  writeFileSync(paths.workflowDeploy, deployCode, 'utf8');
  writeFileSync(paths.cliPublish, publishCode, 'utf8');

  log(`Dry run ${workflowConfig.source}`);
  log(`Bundled markers:         ${JSON.stringify(codeMarkers(bundled))}`);
  log(`Workflow deploy markers: ${JSON.stringify(codeMarkers(deployCode))}`);
  log(`CLI publish markers:     ${JSON.stringify(codeMarkers(publishCode))}`);
  log(`Files written:\n  ${paths.bundled}\n  ${paths.workflowDeploy}\n  ${paths.cliPublish}`);
}

async function main() {
  const {dryRun, compare, workflowFilter} = parseCliArgs(process.argv.slice(2));
  const config = loadConfig();
  const workflows = config.workflows.filter((workflowConfig) => {
    if (!workflowFilter) return true;
    return (
      workflowConfig.source === workflowFilter ||
      workflowConfig.workflowId === workflowFilter
    );
  });

  if (!workflows.length) {
    die(workflowFilter ? `No workflow matched --workflow ${workflowFilter}` : 'No workflows configured');
  }

  if (dryRun) {
    for (const workflowConfig of workflows) {
      await dryRunWorkflow(workflowConfig);
    }
    return;
  }

  const orgId = process.env.PIPEDREAM_ORG_ID?.trim();
  const sourceSha = process.env.SOURCE_SHA ?? 'local';
  const {token: apiKey} = await resolveAccessToken();
  const projectId = config.projectId;

  if (!orgId) {
    die('PIPEDREAM_ORG_ID is required');
  }

  if (compare) {
    for (const workflowConfig of workflows) {
      await compareWorkflow(apiKey, orgId, workflowConfig, projectId);
    }
    return;
  }

  let published = 0;

  for (const workflowConfig of workflows) {
    await deployWorkflow(apiKey, orgId, workflowConfig, projectId, sourceSha);
    published += 1;
  }

  log(`Done. published=${published}`);
}

main().catch((error) => {
  die(error.message);
});
