#!/usr/bin/env node
/**
 * Upload photos from content/Film Photos/ as picture metaobjects
 * linked to Thomas Beardmore on the Shopify store.
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'content', 'Film Photos');
const STORE = process.env.SHOPIFY_STORE ?? 'qdgy1c-iu.myshopify.com';
const ARTIST_ID = 'gid://shopify/Metaobject/195381788898';
const CLI_PREFIX = {
  SHOPIFY_CLI_AGENT_INFO: 'n:composer|v:1.0|p:cursor',
};

function shopifyExecute(query, variables) {
  const args = [
    'store',
    'execute',
    '--store',
    STORE,
    '--allow-mutations',
    '--query',
    query,
  ];
  if (variables) {
    args.push('--variables', JSON.stringify(variables));
  }

  const stdout = execFileSync('shopify', args, {
    encoding: 'utf8',
    env: {...process.env, ...CLI_PREFIX},
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) {
    throw new Error(`No JSON in shopify output:\n${stdout}`);
  }
  return JSON.parse(stdout.slice(jsonStart));
}

function slugify(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'picture';
}

async function uploadToStagedTarget(filePath, stagedTarget) {
  const form = new FormData();
  for (const {name, value} of stagedTarget.parameters) {
    form.append(name, value);
  }
  form.append(
    'file',
    new Blob([fs.readFileSync(filePath)], {type: 'image/jpeg'}),
    path.basename(filePath),
  );

  const response = await fetch(stagedTarget.url, {method: 'POST', body: form});
  if (!response.ok && response.status !== 201) {
    const text = await response.text();
    throw new Error(`Staged upload failed (${response.status}): ${text}`);
  }
}

async function uploadPhoto(filePath) {
  const filename = path.basename(filePath);
  const handle = slugify(filename);
  const title = path.basename(filename, path.extname(filename));

  console.log(`\n→ ${filename}`);

  const staged = shopifyExecute(
    `mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [
        {
          filename,
          mimeType: 'image/jpeg',
          resource: 'IMAGE',
          httpMethod: 'POST',
        },
      ],
    },
  );

  const stagedErrors = staged.stagedUploadsCreate?.userErrors ?? [];
  if (stagedErrors.length) {
    throw new Error(`stagedUploadsCreate: ${JSON.stringify(stagedErrors)}`);
  }

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  await uploadToStagedTarget(filePath, target);

  const created = shopifyExecute(
    `mutation($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id fileStatus }
        userErrors { field message }
      }
    }`,
    {
      files: [
        {
          alt: title,
          contentType: 'IMAGE',
          originalSource: target.resourceUrl,
        },
      ],
    },
  );

  const fileErrors = created.fileCreate?.userErrors ?? [];
  if (fileErrors.length) {
    throw new Error(`fileCreate: ${JSON.stringify(fileErrors)}`);
  }

  const fileId = created.fileCreate.files[0]?.id;
  if (!fileId) {
    throw new Error(`fileCreate returned no file id for ${filename}`);
  }

  const meta = shopifyExecute(
    `mutation($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message code }
      }
    }`,
    {
      metaobject: {
        type: 'picture',
        handle,
        fields: [
          {key: 'title', value: title},
          {key: 'image', value: fileId},
          {key: 'artist', value: ARTIST_ID},
        ],
      },
    },
  );

  const metaErrors = meta.metaobjectCreate?.userErrors ?? [];
  if (metaErrors.length) {
    throw new Error(`metaobjectCreate: ${JSON.stringify(metaErrors)}`);
  }

  const picture = meta.metaobjectCreate.metaobject;
  console.log(`  ✓ picture ${picture.handle} (${picture.id})`);
  return picture;
}

async function main() {
  const photos = fs
    .readdirSync(PHOTOS_DIR)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort()
    .map((f) => path.join(PHOTOS_DIR, f));

  if (!photos.length) {
    console.error(`No JPEG files found in ${PHOTOS_DIR}`);
    process.exit(1);
  }

  console.log(`Uploading ${photos.length} photos for Thomas Beardmore…`);

  const results = [];
  for (const photo of photos) {
    results.push(await uploadPhoto(photo));
  }

  console.log(`\nDone — ${results.length} pictures created.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
