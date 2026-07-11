#!/usr/bin/env node
/**
 * Compare local bundled workflow code with what's deployed on Pipedream.
 * Does not deploy — read-only diagnostic.
 *
 * Usage:
 *   PIPEDREAM_API_KEY=… PIPEDREAM_ORG_ID=… node scripts/pipedream/compare-deploy.mjs
 */
import {existsSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';

const API_BASE = 'https://api.pipedream.com/v1';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPEDREAM_ROOT = __dirname;

// Reuse deploy helpers by importing deploy.mjs patterns inline (keep script self-contained)

function loadConfig() {
  return JSON.parse(readFileSync(join(PIPEDREAM_ROOT, 'deploy.config.json'), 'utf8'));
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
  const parts = [];
  for (const file of ['config.js', 'utils.js']) {
    const filePath = join(sourceDir, file);
    if (!existsSync(filePath)) continue;
    let content = readFileSync(filePath, 'utf8');
    if (file === 'utils.js') content = removeRelativeImports(content);
    parts.push(stripExportsForInline(content));
  }
  let script = readFileSync(join(sourceDir, 'script.js'), 'utf8');
  script = removeRelativeImports(script);
  parts.push(script);
  return `${parts.join('\n\n').trim()}\n`;
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

function extractVersion(code) {
  const versionMatch = /\bversion:\s*['"]([^'"]+)['"]/.exec(extractComponentHeader(code));
  return versionMatch?.[1] ?? null;
}

function markers(code) {
  return {
    defineComponent: /export default defineComponent\(\{/.test(code),
    plainExport: /export default \{/.test(code) && !/defineComponent/.test(code),
    getTriggerPrintRecord: code.includes('getTriggerPrintRecord'),
    markRecordCommitted: code.includes('markRecordCommitted'),
    collectionField: /collection:\s*'Collection'/.test(code),
    collectionsField: /collections:\s*'Collections'/.test(code),
    listTableRecordsLoop: code.includes('listTableRecords($, airtable, AIRTABLE.artistsTable)'),
    lines: code.split('\n').length,
  };
}

function diffSummary(local, remote) {
  const localMarkers = markers(local);
  const remoteMarkers = markers(remote);
  const checks = [
    'defineComponent',
    'getTriggerPrintRecord',
    'markRecordCommitted',
    'collectionField',
    'listTableRecordsLoop',
  ];
  const mismatches = checks.filter((k) => localMarkers[k] !== remoteMarkers[k]);
  return {localMarkers, remoteMarkers, mismatches};
}

async function pipedreamRequest(apiKey, method, path, {query, orgId} = {}) {
  const url = new URL(`${API_BASE}${path}`);
  const params = {...query};
  if (orgId && !params.org_id) params.org_id = orgId;
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }
  return payload?.data ?? payload;
}

async function main() {
  const apiKey = process.env.PIPEDREAM_API_KEY?.trim().replace(/^Bearer\s+/i, '');
  const orgId = process.env.PIPEDREAM_ORG_ID?.trim();
  if (!apiKey || !orgId) {
    console.error('Set PIPEDREAM_API_KEY and PIPEDREAM_ORG_ID');
    process.exit(1);
  }

  const config = loadConfig();
  const workflowConfig = config.workflows.find((w) => w.source === 'airtable-shopify-sync-catalog');
  const sourceDir = join(PIPEDREAM_ROOT, workflowConfig.source);
  const localBundled = bundleWorkflow(sourceDir);

  const workflow = await pipedreamRequest(apiKey, 'GET', `/workflows/${workflowConfig.workflowId}`, {
    orgId,
    query: {project_id: config.projectId, include: 'steps'},
  });

  const steps = workflow.steps ?? [];
  const codeStep = steps.find((s) => s.savedComponent?.id) ?? steps.find((s) => s.type === 'code');
  const componentId = codeStep?.savedComponent?.id;

  console.log('Workflow:', workflowConfig.workflowId);
  console.log('Steps:', JSON.stringify(steps.map((s) => ({
    namespace: s.namespace,
    type: s.type,
    componentId: s.savedComponent?.id,
  })), null, 2));

  if (!componentId) {
    console.error('No saved component on workflow code step');
    process.exit(1);
  }

  const component = await pipedreamRequest(apiKey, 'GET', `/components/${componentId}`, {orgId});
  const remoteCode = component.code ?? codeStep?.savedComponent?.code ?? '';

  const outDir = mkdtempSync(join(tmpdir(), 'pipedream-compare-'));
  const localPath = join(outDir, 'local-bundled.js');
  const remotePath = join(outDir, 'remote-deployed.js');
  writeFileSync(localPath, localBundled, 'utf8');
  writeFileSync(remotePath, remoteCode, 'utf8');

  const summary = diffSummary(localBundled, remoteCode);
  console.log('\nLocal markers:', summary.localMarkers);
  console.log('Remote markers:', summary.remoteMarkers);
  console.log('Mismatches:', summary.mismatches.length ? summary.mismatches : '(none)');

  console.log('\nRemote component meta:', {
    id: component.id ?? componentId,
    key: component.key ?? extractKey(remoteCode),
    version: component.version ?? extractVersion(remoteCode),
  });

  // Show first differing region around trigger handler
  const needle = 'getTriggerPrintRecord';
  console.log('\nLocal has getTriggerPrintRecord:', localBundled.includes(needle));
  console.log('Remote has getTriggerPrintRecord:', remoteCode.includes(needle));

  const remoteSnippet = remoteCode.slice(0, 600);
  console.log('\nRemote code start:\n', remoteSnippet);

  console.log(`\nWrote full files to:\n  ${localPath}\n  ${remotePath}`);
  console.log(`\nDiff: diff -u ${remotePath} ${localPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
