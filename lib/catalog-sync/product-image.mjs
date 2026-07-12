import {SHOPIFY} from './config.js';
import {shopifyRequest} from './utils.js';
import {fetchAndOptimizePrintImage} from './optimize-image.mjs';

/**
 * Download an Airtable attachment, optimize to WebP, stage-upload to Shopify,
 * and return a resource URL for productSet `files[].originalSource`.
 *
 * @param {{ sourceUrl: string; alt: string; handle: string }} params
 */
export async function prepareProductImageForShopify($, shopify, {sourceUrl, alt, handle}) {
  const optimized = await fetchAndOptimizePrintImage(sourceUrl);
  const filename = `${handle}.webp`;

  const staged = await shopifyRequest($, shopify, {
    query: `mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    variables: {
      input: [
        {
          filename,
          mimeType: optimized.mimeType,
          resource: 'PRODUCT_IMAGE',
          fileSize: String(optimized.byteLength),
          httpMethod: 'POST',
        },
      ],
    },
  });

  const target = staged.stagedUploadsCreate?.stagedTargets?.[0];
  const stagedErrors = staged.stagedUploadsCreate?.userErrors ?? [];
  if (stagedErrors.length) {
    throw new Error(`stagedUploadsCreate: ${JSON.stringify(stagedErrors)}`);
  }
  if (!target?.url || !target?.resourceUrl) {
    throw new Error('stagedUploadsCreate returned no upload target');
  }

  const form = new FormData();
  for (const param of target.parameters ?? []) {
    form.append(param.name, param.value);
  }
  form.append(
    'file',
    new Blob([optimized.buffer], {type: optimized.mimeType}),
    filename,
  );

  const uploadResponse = await fetch(target.url, {method: 'POST', body: form});
  if (!uploadResponse.ok) {
    const body = await uploadResponse.text();
    throw new Error(`Shopify staged image upload failed (${uploadResponse.status}): ${body}`);
  }

  return {
    resourceUrl: target.resourceUrl,
    alt,
    byteLength: optimized.byteLength,
    sourceWidth: optimized.sourceWidth,
    sourceHeight: optimized.sourceHeight,
  };
}

/** @param {string} productId */
export async function getProductPictureSourceId($, shopify, productId) {
  const mf = SHOPIFY.metafields;
  const data = await shopifyRequest($, shopify, {
    query: `query($id: ID!) {
      product(id: $id) {
        pictureSourceId: metafield(namespace: "${mf.namespace}", key: "${mf.pictureSourceId}") {
          value
        }
      }
    }`,
    variables: {id: productId},
  });
  return data.product?.pictureSourceId?.value ?? null;
}
