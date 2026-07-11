import {axios} from '@pipedream/platform';
import {AIRTABLE} from './config.js';

export async function fetchAirtableSchema($, airtable) {
  const token = airtable.$auth.oauth_access_token;

  const bases = await axios($, {
    url: 'https://api.airtable.com/v0/meta/bases',
    headers: {Authorization: `Bearer ${token}`},
  });

  const base = bases.bases?.find((b) => b.id === AIRTABLE.baseId);
  if (!base) {
    throw new Error(`Base ${AIRTABLE.baseId} not found. Check Airtable account access.`);
  }

  const schema = await axios($, {
    url: `https://api.airtable.com/v0/meta/bases/${AIRTABLE.baseId}/tables`,
    headers: {Authorization: `Bearer ${token}`},
  });

  const tables = (schema.tables ?? []).map((table) => ({
    id: table.id,
    name: table.name,
    fields: table.fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
    })),
    views: (table.views ?? []).map((view) => ({
      id: view.id,
      name: view.name,
    })),
  }));

  return {
    base: {id: base.id, name: base.name},
    tables,
  };
}
