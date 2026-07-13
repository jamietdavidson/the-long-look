import {axios} from '../http.mjs';
import {getShopifyAccessToken} from '../shopify-access-token.mjs';
import {SHOPIFY} from './config.js';

function graphqlUrl() {
  const shop =
    process.env.SHOPIFY_SHOP_ID?.trim() ??
    SHOPIFY.shopId ??
    SHOPIFY.shopDomain.replace('.myshopify.com', '');
  return `https://${shop}.myshopify.com/admin/api/${SHOPIFY.apiVersion}/graphql.json`;
}

async function shopifyGraphql($, query, variables = {}) {
  const token = await getShopifyAccessToken();
  if (!token) {
    throw new Error('SHOPIFY_ACCESS_TOKEN is required to upload shipping labels');
  }

  const data = await axios($, {
    method: 'post',
    url: graphqlUrl(),
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    data: {query, variables},
  });

  if (data.errors?.length) {
    throw new Error(data.errors.map((error) => error.message).join('; '));
  }
  return data.data;
}

/**
 * Upload a PDF buffer to Shopify Files and return a public CDN URL for Airtable.
 * @param {Buffer} pdfBuffer
 * @param {string} filename
 */
export async function uploadLabelPdfForAirtable($, pdfBuffer, filename) {
  const staged = await shopifyGraphql(
    $,
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
          mimeType: 'application/pdf',
          resource: 'FILE',
          fileSize: String(pdfBuffer.length),
          httpMethod: 'POST',
        },
      ],
    },
  );

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
    new Blob([pdfBuffer], {type: 'application/pdf'}),
    filename,
  );

  const uploadResponse = await fetch(target.url, {method: 'POST', body: form});
  if (!uploadResponse.ok) {
    const body = await uploadResponse.text();
    throw new Error(`Shopify staged upload failed (${uploadResponse.status}): ${body}`);
  }

  const created = await shopifyGraphql(
    $,
    `mutation($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          ... on GenericFile {
            id
            url
          }
        }
        userErrors { field message }
      }
    }`,
    {
      files: [
        {
          alt: 'Shipping label',
          contentType: 'FILE',
          originalSource: target.resourceUrl,
        },
      ],
    },
  );

  const errors = created.fileCreate?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`fileCreate: ${JSON.stringify(errors)}`);
  }

  const file = created.fileCreate?.files?.[0];
  if (!file?.id) {
    throw new Error('fileCreate returned no file id');
  }

  const url = file.url ?? (await waitForGenericFileUrl($, file.id));
  if (!url) {
    throw new Error('fileCreate returned no public file URL');
  }

  return url;
}

async function waitForGenericFileUrl($, fileId, {attempts = 8, delayMs = 750} = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const data = await shopifyGraphql(
      $,
      `query($id: ID!) {
        node(id: $id) {
          ... on GenericFile { url }
        }
      }`,
      {id: fileId},
    );
    const url = data.node?.url;
    if (url) return url;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}
