import type {CodegenConfig} from '@graphql-codegen/cli';
import {getSchema, pluckConfig, preset} from '@shopify/hydrogen-codegen';

export default {
  overwrite: true,
  pluckConfig,
  generates: {
    'app/types/storefrontapi.generated.d.ts': {
      preset,
      schema: getSchema('storefront'),
      documents: [
        './*.{ts,tsx,js,jsx}',
        './app/**/*.{ts,tsx,js,jsx}',
        '!./app/graphql/**/*.{ts,tsx,js,jsx}',
      ],
    },
    'app/types/customer-accountapi.generated.d.ts': {
      preset,
      schema: getSchema('customer-account'),
      documents: ['./app/graphql/customer-account/*.{ts,tsx,js,jsx}'],
    },
  },
} satisfies CodegenConfig;
