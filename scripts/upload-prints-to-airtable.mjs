#!/usr/bin/env node
/**
 * Upload print photos from content/ into the Airtable Prints table.
 *
 * Files are stored in Airtable first. The Railway catalog-sync service syncs to Shopify
 * when a print enters the Committed view.
 *
 * Usage:
 *   AIRTABLE_PAT=pat… node scripts/upload-prints-to-airtable.mjs
 *   AIRTABLE_PAT=pat… node scripts/upload-prints-to-airtable.mjs --limit 3
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'content', 'Film Photos');
const PAT = process.env.AIRTABLE_PAT;
const BASE_ID = 'appC7O4qp56Rdaj7c';
const PRINTS_TABLE = 'Prints';
const PICTURE_FIELD_ID = 'fldyM2cKNOWimkTHy';
const MAX_BYTES = 5 * 1024 * 1024;

const DEFAULT_ARTIST_ID = 'reckWtjaAViG3yLV5'; // Thomas Beardmore
const DEFAULT_COLLECTION_ID = 'reciLXfWhNzVis5O9'; // The Vancouver Island Collection

const FIELDS = {
  name: 'Name',
  picture: 'Picture',
  artist: 'Artist',
  collection: 'Collection',
  orientation: 'Orientation',
  status: 'Status',
};

if (!PAT) {
  console.error('Set AIRTABLE_PAT to your Airtable personal access token.');
  process.exit(1);
}

function parseArgs(argv) {
  const limitIndex = argv.indexOf('--limit');
  const limit = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : null;
  return {limit: Number.isFinite(limit) && limit > 0 ? limit : null};
}

async function airtable(pathname, {method = 'GET', body} = {}) {
  const response = await fetch(`https://api.airtable.com/v0${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAT}`,
      ...(body ? {'Content-Type': 'application/json'} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${method} ${pathname} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

function titleFromFilename(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function prepareUploadFile(filePath) {
  const originalSize = fs.statSync(filePath).size;
  if (originalSize <= MAX_BYTES) {
    return {uploadPath: filePath, cleanup: false};
  }

  const tempPath = path.join(
    os.tmpdir(),
    `airtable-print-${path.basename(filePath, path.extname(filePath))}.jpg`,
  );
  execFileSync('sips', [
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', '70',
    '-Z', '2400',
    filePath,
    '--out', tempPath,
  ]);

  const compressedSize = fs.statSync(tempPath).size;
  if (compressedSize > MAX_BYTES) {
    throw new Error(
      `Could not compress ${path.basename(filePath)} below 5 MB (${compressedSize} bytes).`,
    );
  }

  console.log(
    `  compressed ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedSize / 1024 / 1024).toFixed(1)}MB`,
  );
  return {uploadPath: tempPath, cleanup: true};
}

async function uploadAttachment(recordId, uploadPath) {
  const filename = path.basename(uploadPath);
  const file = fs.readFileSync(uploadPath);
  const response = await fetch(
    `https://content.airtable.com/v0/${BASE_ID}/${recordId}/${PICTURE_FIELD_ID}/uploadAttachment`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType: 'image/jpeg',
        filename,
        file: file.toString('base64'),
      }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`uploadAttachment failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function createPrintRecord(name) {
  const created = await airtable(`/${BASE_ID}/${encodeURIComponent(PRINTS_TABLE)}`, {
    method: 'POST',
    body: {
      records: [
        {
          fields: {
            [FIELDS.name]: name,
            [FIELDS.orientation]: 'Horizontal',
            [FIELDS.artist]: [DEFAULT_ARTIST_ID],
            [FIELDS.collection]: [DEFAULT_COLLECTION_ID],
            [FIELDS.status]: 'Pending',
          },
        },
      ],
    },
  });
  return created.records[0];
}

async function listExistingNames() {
  const records = await airtable(`/${BASE_ID}/${encodeURIComponent(PRINTS_TABLE)}?maxRecords=100`);
  return new Set(
    (records.records ?? [])
      .map((record) => record.fields?.[FIELDS.name])
      .filter(Boolean),
  );
}

async function main() {
  const {limit} = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(PHOTOS_DIR)) {
    throw new Error(`Photos directory not found: ${PHOTOS_DIR}`);
  }

  const photos = fs
    .readdirSync(PHOTOS_DIR)
    .filter((file) => /\.jpe?g$/i.test(file))
    .sort()
    .map((file) => path.join(PHOTOS_DIR, file));

  if (!photos.length) {
    throw new Error(`No JPEG files found in ${PHOTOS_DIR}`);
  }

  const existingNames = await listExistingNames();
  const pending = photos.filter((file) => !existingNames.has(titleFromFilename(file)));
  const selected = (limit ? pending.slice(0, limit) : pending);

  if (!selected.length) {
    console.log('No new prints to upload.');
    return;
  }

  console.log(`Uploading ${selected.length} print(s) to Airtable…`);

  const results = [];
  for (const filePath of selected) {
    const name = titleFromFilename(filePath);
    console.log(`\n→ ${name}`);
    const {uploadPath, cleanup} = prepareUploadFile(filePath);

    try {
      const record = await createPrintRecord(name);
      await uploadAttachment(record.id, uploadPath);
      results.push({id: record.id, name});
      console.log(`  ✓ ${record.id}`);
    } finally {
      if (cleanup) fs.unlinkSync(uploadPath);
    }
  }

  console.log(`\nDone — ${results.length} print(s) uploaded to Airtable.`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
