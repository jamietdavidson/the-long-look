#!/usr/bin/env bash
# Provision The Long Look content metaobject definitions on a Shopify store.
# Idempotent only when definitions do not yet exist — re-running will error on duplicate types.
set -euo pipefail

STORE="${SHOPIFY_STORE:-qdgy1c-iu.myshopify.com}"
CLI_PREFIX='SHOPIFY_CLI_AGENT_INFO="n:composer|v:1.0|p:cursor"'

run() {
  eval "$CLI_PREFIX shopify store execute --store \"$STORE\" $*"
}

echo "Authenticating..."
eval "$CLI_PREFIX shopify store auth --store \"$STORE\" \
  --scopes read_metaobject_definitions,write_metaobject_definitions,read_metaobjects,write_metaobjects,read_files,write_files"

echo "Creating tag definition..."
TAG_ID=$(run --allow-mutations --query \
  'mutation { metaobjectDefinitionCreate(definition: { type: "tag", name: "Tag", displayNameKey: "label", access: { storefront: PUBLIC_READ }, fieldDefinitions: [{ key: "label", name: "Label", type: "single_line_text_field", required: true }] }) { metaobjectDefinition { id } userErrors { message } } }' \
  | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); const id=d?.metaobjectDefinitionCreate?.metaobjectDefinition?.id; if(!id){console.error(d);process.exit(1)}; console.log(id)")

echo "Tag definition: $TAG_ID"

create_with_refs() {
  local type="$1" name="$2" display="$3" fields="$4"
  run --allow-mutations --query "mutation { metaobjectDefinitionCreate(definition: { type: \"$type\", name: \"$name\", displayNameKey: \"$display\", access: { storefront: PUBLIC_READ }, fieldDefinitions: $fields }) { metaobjectDefinition { id type } userErrors { message } } }"
}

echo "Creating artist definition..."
create_with_refs artist Artist name \
  "[{ key: \"name\", name: \"Name\", type: \"single_line_text_field\", required: true }, { key: \"bio\", name: \"Bio\", type: \"multi_line_text_field\" }, { key: \"birth_year\", name: \"Birth Year\", type: \"number_integer\" }, { key: \"location\", name: \"Location\", type: \"single_line_text_field\" }, { key: \"portrait\", name: \"Portrait\", type: \"file_reference\" }, { key: \"instagram_handle\", name: \"Instagram Handle\", type: \"single_line_text_field\" }, { key: \"airtable_record_id\", name: \"Airtable Record ID\", type: \"single_line_text_field\" }, { key: \"tags\", name: \"Tags\", type: \"list.metaobject_reference\", validations: [{ name: \"metaobject_definition_id\", value: \"$TAG_ID\" }] }]"

ARTIST_ID=$(run --query 'query { metaobjectDefinitions(first: 10, type: "artist") { nodes { id } } }' \
  | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.metaobjectDefinitions.nodes[0].id)")

echo "Creating collection definition..."
create_with_refs collection Collection title \
  "[{ key: \"title\", name: \"Title\", type: \"single_line_text_field\", required: true }, { key: \"description\", name: \"Description\", type: \"multi_line_text_field\" }, { key: \"cover_image\", name: \"Cover Image\", type: \"file_reference\" }, { key: \"airtable_record_id\", name: \"Airtable Record ID\", type: \"single_line_text_field\" }, { key: \"tags\", name: \"Tags\", type: \"list.metaobject_reference\", validations: [{ name: \"metaobject_definition_id\", value: \"$TAG_ID\" }] }]"

COLLECTION_ID=$(run --query 'query { metaobjectDefinitions(first: 10, type: "collection") { nodes { id } } }' \
  | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.metaobjectDefinitions.nodes[0].id)")

echo "Creating picture definition..."
create_with_refs picture Picture title \
  "[{ key: \"title\", name: \"Title\", type: \"single_line_text_field\", required: true }, { key: \"image\", name: \"Image\", type: \"file_reference\", required: true }, { key: \"description\", name: \"Description\", type: \"multi_line_text_field\" }, { key: \"artist\", name: \"Artist\", type: \"metaobject_reference\", required: true, validations: [{ name: \"metaobject_definition_id\", value: \"$ARTIST_ID\" }] }, { key: \"collections\", name: \"Collections\", type: \"list.metaobject_reference\", validations: [{ name: \"metaobject_definition_id\", value: \"$COLLECTION_ID\" }] }, { key: \"tags\", name: \"Tags\", type: \"list.metaobject_reference\", validations: [{ name: \"metaobject_definition_id\", value: \"$TAG_ID\" }] }, { key: \"product\", name: \"Product\", type: \"product_reference\" }, { key: \"airtable_record_id\", name: \"Airtable Record ID\", type: \"single_line_text_field\" }]"

echo "Done. Manage entries in Shopify Admin → Content → Metaobjects."
