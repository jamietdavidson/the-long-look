import {SHOPIFY as CATALOG_SHOPIFY} from '../catalog-sync/config.js';
import {shopifyAdminGraphql} from './shopify-admin.mjs';

function variantGid(variantId) {
  if (variantId == null || variantId === '') return null;
  const value = String(variantId);
  return value.startsWith('gid://') ? value : `gid://shopify/ProductVariant/${value}`;
}

/**
 * Resolve Airtable Print + Variant record ids from a Shopify line item.
 * @returns {Promise<{printRecordId: string | null, variantRecordId: string | null}>}
 */
export async function resolveLineItemAirtableLinks($, lineItem) {
  const gid = variantGid(lineItem.variant_id);
  if (!gid) {
    return {printRecordId: null, variantRecordId: null};
  }

  const mf = CATALOG_SHOPIFY.airtableMetafield;
  const fieldKey = CATALOG_SHOPIFY.airtableRecordIdField;

  try {
    const data = await shopifyAdminGraphql(
      $,
      `query($id: ID!) {
        productVariant(id: $id) {
          variantRecordId: metafield(namespace: "${mf.namespace}", key: "${mf.key}") { value }
          product {
            printRecordId: metafield(namespace: "${mf.namespace}", key: "${mf.key}") { value }
          }
        }
      }`,
      {id: gid},
    );

    return {
      variantRecordId: data.productVariant?.variantRecordId?.value ?? null,
      printRecordId: data.productVariant?.product?.printRecordId?.value ?? null,
    };
  } catch {
    return {printRecordId: null, variantRecordId: null};
  }
}
