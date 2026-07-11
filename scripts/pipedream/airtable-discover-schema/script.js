/**
 * Pipedream: discover Airtable base schema (run once to verify field mappings).
 */
import {fetchAirtableSchema} from './utils.js';

export default defineComponent({
  props: {
    airtable_oauth: {type: 'app', app: 'airtable_oauth'},
  },
  async run({steps, $}) {
    const result = await fetchAirtableSchema($, this.airtable_oauth);
    console.log(JSON.stringify(result, null, 2));
    $.export('schema', result);
    return result;
  },
});
