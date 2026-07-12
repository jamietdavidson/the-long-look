#!/usr/bin/env node
/**
 * Discover Airtable base schema for appC7O4qp56Rdaj7c.
 *
 * Usage:
 *   AIRTABLE_PAT=pat… node scripts/airtable-discover.mjs
 */
const BASE_ID = 'appC7O4qp56Rdaj7c';
const PAT = process.env.AIRTABLE_PAT;

if (!PAT) {
  console.error('Set AIRTABLE_PAT to your Airtable personal access token.');
  process.exit(1);
}

async function airtableFetch(path) {
  const response = await fetch(`https://api.airtable.com/v0${path}`, {
    headers: {Authorization: `Bearer ${PAT}`},
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const bases = await airtableFetch('/meta/bases');
  const base = bases.bases?.find((b) => b.id === BASE_ID);
  if (!base) {
    throw new Error(`Base ${BASE_ID} not found for this token.`);
  }

  const schema = await airtableFetch(`/meta/bases/${BASE_ID}/tables`);
  const tables = (schema.tables ?? []).map((table) => ({
    id: table.id,
    name: table.name,
    primaryFieldId: table.primaryFieldId,
    fields: table.fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
    })),
    views: (table.views ?? []).map((view) => ({
      id: view.id,
      name: view.name,
      type: view.type,
    })),
  }));

  const result = {base: {id: base.id, name: base.name}, tables};
  console.log(JSON.stringify(result, null, 2));

  // Sample first few records from tables that look like print sizes or pictures
  for (const table of tables) {
    if (!/print|size|picture|catalog/i.test(table.name)) continue;
    const records = await airtableFetch(
      `/${BASE_ID}/${encodeURIComponent(table.name)}?maxRecords=3`,
    );
    console.log(`\n--- Sample: ${table.name} ---`);
    console.log(JSON.stringify(records.records ?? [], null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
