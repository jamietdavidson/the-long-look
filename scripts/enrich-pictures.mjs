#!/usr/bin/env node
/**
 * Name, describe, and sell each picture metaobject:
 * - Updates title, description, and handle
 * - Creates a product with print size variants
 * - Links product to picture and publishes to storefront channels
 */
import {execFileSync} from 'node:child_process';

const STORE = process.env.SHOPIFY_STORE ?? 'qdgy1c-iu.myshopify.com';
const CLI_PREFIX = {SHOPIFY_CLI_AGENT_INFO: 'n:composer|v:1.0|p:cursor'};
const HYDROGEN_PUBLICATION = 'gid://shopify/Publication/191112446178';
const ONLINE_STORE_PUBLICATION = 'gid://shopify/Publication/187030733026';
const VENDOR = 'Thomas Beardmore';
const PRINT_SIZES = [
  {name: '8" x 10"', price: 65},
  {name: '11" x 14"', price: 95},
  {name: '16" x 20"', price: 145},
];

/** @type {Record<string, {handle: string, title: string, description: string}>} */
const CATALOG = {
  '0011-14a': {
    handle: 'gucci-crossing-milan',
    title: 'Gucci Crossing, Milan',
    description:
      'A sun-drenched Milan intersection with pedestrians, a tour bus, and the iconic Gucci sign atop classical stone architecture.',
  },
  '001496380012': {
    handle: 'radiant-forest-light',
    title: 'Radiant Forest Light',
    description:
      'Sunbeams pierce a dense evergreen treeline and sparkle across rippled lake water in this dramatic monochrome landscape.',
  },
  '001496380028': {
    handle: 'nocturnal-trail',
    title: 'Nocturnal Trail',
    description:
      'Headlights glow through deep woodland shadows in a gritty, cinematic night scene.',
  },
  '001667320027': {
    handle: 'misty-ascent',
    title: 'Misty Ascent',
    description:
      'Birds in flight above a fog-covered lake, with a faint forest reflection creating an ethereal, minimalist scene.',
  },
  'misty-ascent': {
    handle: 'misty-ascent',
    title: 'Misty Ascent',
    description:
      'Birds in flight above a fog-covered lake, with a faint forest reflection creating an ethereal, minimalist scene.',
  },
  '001667320028': {
    handle: 'silhouetted-flight',
    title: 'Silhouetted Flight',
    description:
      'A flock of birds as dark silhouettes against a pale, grainy sky — high-contrast and atmospheric.',
  },
  '0016-22': {
    handle: 'architectural-duality',
    title: 'Architectural Duality',
    description:
      'Ancient stone ruins and textured masonry bisected by a sharp geometric composition.',
  },
  '0032-6': {
    handle: 'the-endless-passage',
    title: 'The Endless Passage',
    description:
      'A symmetrical view down a vaulted concrete tunnel, lit by overhead lamps leading toward distant figures.',
  },
  '0033-5': {
    handle: 'coastal-dusk-silhouette',
    title: 'Coastal Dusk Silhouette',
    description:
      'A sun-fringed cloud bank looms over a silhouetted coastline with calm, golden-reflecting water.',
  },
  'roadtrip-138': {
    handle: 'monochrome-mountain-horizon',
    title: 'Monochrome Mountain Horizon',
    description:
      'The sun sets behind a mountain ridge in grainy, atmospheric black and white.',
  },
  'roadtrip-19': {
    handle: 'the-descent',
    title: 'The Descent',
    description:
      'A lone mountain biker navigates a steep rocky ridge between craggy formations in high-contrast monochrome.',
  },
  'roadtrip-49': {
    handle: 'desert-wanderer',
    title: 'Desert Wanderer',
    description:
      'A reddish-brown cow crosses sun-drenched desert scrub with distant mesas under a clear blue sky.',
  },
  'roadtrip-52': {
    handle: 'sedimentary-horizons',
    title: 'Sedimentary Horizons',
    description:
      'Layered red sandstone tilts toward a pale mesa beneath an expansive desert sky.',
  },
  'roadtrip-56': {
    handle: 'the-road-to-zion',
    title: 'The Road to Zion',
    description:
      'A winding canyon road curves through red rock cliffs toward a towering white sandstone peak.',
  },
  'roadtrip-59': {
    handle: 'desert-horizon',
    title: 'Desert Horizon',
    description:
      'An overlanding truck silhouetted at golden hour as a figure leaps through the sand.',
  },
};

function shopifyExecute(query, variables, {mutate = false} = {}) {
  const args = ['store', 'execute', '--store', STORE, '--query', query];
  if (mutate) args.push('--allow-mutations');
  if (variables) args.push('--variables', JSON.stringify(variables));

  const stdout = execFileSync('shopify', args, {
    encoding: 'utf8',
    env: {...process.env, ...CLI_PREFIX},
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) throw new Error(`No JSON in shopify output:\n${stdout}`);
  return JSON.parse(stdout.slice(jsonStart));
}

function listPictures() {
  const data = shopifyExecute(
    `query {
      metaobjects(type: "picture", first: 50) {
        nodes {
          id
          handle
          product: field(key: "product") { value }
          image: field(key: "image") {
            reference {
              ... on MediaImage { image { url } }
            }
          }
        }
      }
    }`,
  );
  return data.metaobjects.nodes;
}

function buildProductInput({title, description, imageUrl}) {
  return {
    title,
    descriptionHtml: `<p>${description}</p>`,
    vendor: VENDOR,
    productType: 'Fine Art Print',
    status: 'ACTIVE',
    productOptions: [
      {
        name: 'Size',
        values: PRINT_SIZES.map((size) => ({name: size.name})),
      },
    ],
    files: [
      {
        originalSource: imageUrl,
        alt: title,
        contentType: 'IMAGE',
      },
    ],
    variants: PRINT_SIZES.map((size) => ({
      optionValues: [{optionName: 'Size', name: size.name}],
      price: size.price,
    })),
  };
}

function createProduct(input) {
  const data = shopifyExecute(
    `mutation($input: ProductSetInput!, $sync: Boolean!) {
      productSet(synchronous: $sync, input: $input) {
        product { id handle }
        userErrors { field message }
      }
    }`,
    {sync: true, input},
    {mutate: true},
  );
  const errors = data.productSet?.userErrors ?? [];
  if (errors.length) throw new Error(`productSet: ${JSON.stringify(errors)}`);
  return data.productSet.product;
}

function publishProduct(productId) {
  const data = shopifyExecute(
    `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        publishable { ... on Product { id handle } }
        userErrors { field message }
      }
    }`,
    {
      id: productId,
      input: [
        {publicationId: HYDROGEN_PUBLICATION},
        {publicationId: ONLINE_STORE_PUBLICATION},
      ],
    },
    {mutate: true},
  );
  const errors = data.publishablePublish?.userErrors ?? [];
  if (errors.length) throw new Error(`publishablePublish: ${JSON.stringify(errors)}`);
}

function updatePicture({id, handle, title, description, productId}) {
  const data = shopifyExecute(
    `mutation($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message }
      }
    }`,
    {
      id,
      metaobject: {
        handle,
        fields: [
          {key: 'title', value: title},
          {key: 'description', value: description},
          {key: 'product', value: productId},
        ],
      },
    },
    {mutate: true},
  );
  const errors = data.metaobjectUpdate?.userErrors ?? [];
  if (errors.length) throw new Error(`metaobjectUpdate: ${JSON.stringify(errors)}`);
  return data.metaobjectUpdate.metaobject;
}

async function main() {
  const pictures = listPictures();

  for (const picture of pictures) {
    const meta = CATALOG[picture.handle];
    if (!meta) {
      console.warn(`Skipping unknown handle: ${picture.handle}`);
      continue;
    }

    const imageUrl = picture.image?.reference?.image?.url;
    if (!imageUrl) {
      throw new Error(`Missing image URL for ${picture.handle}`);
    }

    console.log(`\n→ ${meta.title}`);

    let productId = picture.product?.value ?? null;
    if (!productId) {
      const product = createProduct(
        buildProductInput({
          title: meta.title,
          description: meta.description,
          imageUrl,
        }),
      );
      productId = product.id;
      publishProduct(productId);
      console.log(`  ✓ product ${product.handle}`);
    } else {
      console.log(`  · product already linked`);
    }

    const updated = updatePicture({
      id: picture.id,
      handle: meta.handle,
      title: meta.title,
      description: meta.description,
      productId,
    });
    console.log(`  ✓ picture ${updated.handle}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
