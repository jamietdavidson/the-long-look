import {useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {
  Award,
  ChevronDown,
  ChevronUp,
  Frame,
  Globe,
  Layers,
  Truck,
} from 'lucide-react';
import {getProductOptions} from '@shopify/hydrogen';
import {DisplaysWellWith} from '~/components/DisplaysWellWith';
import {SizeOptionTable} from '~/components/SizeOptionTable';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {getPrintHandleLineAttributes} from '~/lib/cart';
import {
  formatPrintDimensions,
  FRAMED_PICTURE_SIZES,
  FRAMED_PICTURE_SIZE_LABELS,
  resolveNamedFramedPictureSize,
  sortSizeOptionValues,
} from '~/lib/framed-picture';
import {
  DEFAULT_FRAME_OPTIONS,
  DEFAULT_MOUNT_OPTIONS,
  getResolvedFrameValue,
  getResolvedMountValue,
  isExcludedFrameOption,
} from '~/lib/print-options';
import {cn} from '~/lib/utils';

/**
 * @param {{
 *   product: import('storefrontapi.generated').ProductFragment;
 *   selectedVariant: import('storefrontapi.generated').ProductFragment['selectedOrFirstAvailableVariant'];
 *   printHandle?: string;
 *   orientation?: import('~/lib/framed-picture').PictureOrientation;
 *   relatedProducts?: Array<import('~/lib/content-api').PictureCard>;
 * }}
 */
export function PrintPurchasePanel({
  product,
  selectedVariant,
  printHandle,
  orientation = 'vertical',
  relatedProducts = [],
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {open} = useAside();

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const sizeOption = productOptions.find(
    (option) => option.name.toLowerCase() === 'size',
  );
  const frameOption = productOptions.find(
    (option) => option.name.toLowerCase() === 'frame',
  );
  const mountOption = productOptions.find(
    (option) => option.name.toLowerCase() === 'mount',
  );

  const cartLines =
    selectedVariant
      ? [
          {
            merchandiseId: selectedVariant.id,
            quantity: 1,
            selectedVariant,
            attributes: getPrintHandleLineAttributes(printHandle),
          },
        ]
      : [];

  const analytics = {
    products: [
      {
        id: product.id,
        title: product.title,
        price: selectedVariant?.price.amount || '0',
        vendor: product.vendor,
        variantId: selectedVariant?.id || '',
        variantTitle: selectedVariant?.title || '',
        quantity: 1,
      },
    ],
  };

  const selectOptionValue = (variantUriQuery, selected) => {
    if (!selected) {
      const params = new URLSearchParams(variantUriQuery);
      for (const [key, value] of searchParams.entries()) {
        if (key === 'frame' || key === 'mount') {
          params.set(key, value);
        }
      }
      void navigate(`?${params.toString()}`, {
        replace: true,
        preventScrollReset: true,
      });
    }
  };

  const selectFallbackParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    void navigate(`?${params.toString()}`, {
      replace: true,
      preventScrollReset: true,
    });
  };

  const selectedFrame = getResolvedFrameValue(selectedVariant, searchParams);
  const selectedMount = getResolvedMountValue(selectedVariant, searchParams);

  return (
    <div className="space-y-6">
      <PrintFeatureList />

      <div className="overflow-hidden">
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors',
            expanded
              ? 'bg-neutral-100 text-neutral-900'
              : 'bg-neutral-900 text-white hover:bg-neutral-800',
          )}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {!expanded ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-[#3b82f6]"
            />
          ) : null}
          <span>Select Size, Frame &amp; Mount</span>
          {expanded ? (
            <ChevronUp className="size-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <ChevronDown className="size-4 shrink-0" strokeWidth={1.75} />
          )}
        </button>

        {expanded ? (
          <div className="space-y-8 bg-white pt-6 pb-8">
            {sizeOption && sizeOption.optionValues.length > 0 ? (
              <SizeTable
                option={sizeOption}
                orientation={orientation}
                onSelect={selectOptionValue}
              />
            ) : null}

            <FrameSwatches
              option={frameOption}
              selectedFrame={selectedFrame}
              onSelectShopify={selectOptionValue}
              onSelectFallback={(value) => selectFallbackParam('frame', value)}
            />

            <MountToggle
              option={mountOption}
              selectedMount={selectedMount}
              onSelectShopify={selectOptionValue}
              onSelectFallback={(value) => selectFallbackParam('mount', value)}
            />

            <AddToCartButton
              analytics={analytics}
              className="w-full bg-neutral-500 px-6 py-4 text-center text-xs font-medium tracking-[0.2em] text-white uppercase transition-colors hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!selectedVariant || !selectedVariant.availableForSale}
              onClick={() => {
                open('cart');
              }}
              lines={cartLines}
            >
              {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
            </AddToCartButton>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <PrintFulfillmentNotes />
        <DisplaysWellWith products={relatedProducts} />
      </div>
    </div>
  );
}

export function PrintFeatureList() {
  return (
    <ul className="space-y-3 text-sm text-neutral-700">
      <li className="flex items-start gap-3">
        <Award className="mt-0.5 size-4 shrink-0 text-neutral-400" strokeWidth={1.5} />
        <span>Archival pigment print on cotton rag paper</span>
      </li>
      <li className="flex items-start gap-3">
        <Frame className="mt-0.5 size-4 shrink-0 text-neutral-400" strokeWidth={1.5} />
        <span>
          <Link to="/about" className="underline underline-offset-2">
            Frame included
          </Link>
        </span>
      </li>
      <li className="flex items-start gap-3">
        <Layers className="mt-0.5 size-4 shrink-0 text-neutral-400" strokeWidth={1.5} />
        <span>Six sizes available</span>
      </li>
    </ul>
  );
}

export function PrintFulfillmentNotes() {
  return (
    <ul className="space-y-3 text-sm text-neutral-600">
      <li className="flex items-start gap-3">
        <Truck className="mt-0.5 size-4 shrink-0 text-neutral-400" strokeWidth={1.5} />
        <span>Delivered in 14 business days</span>
      </li>
      <li className="flex items-start gap-3">
        <Globe className="mt-0.5 size-4 shrink-0 text-neutral-400" strokeWidth={1.5} />
        <span>Printed and framed locally in Canada</span>
      </li>
    </ul>
  );
}

/**
 * @param {{
 *   option: import('@shopify/hydrogen').MappedProductOptions;
 *   orientation: import('~/lib/framed-picture').PictureOrientation;
 *   onSelect: (variantUriQuery: string, selected: boolean) => void;
 * }}
 */
function SizeTable({option, orientation, onSelect}) {
  const values = sortSizeOptionValues(option.optionValues);

  return (
    <SizeOptionTable
      rows={values.map((value) => {
        const namedSize = resolveNamedFramedPictureSize(value.name);
        const spec = namedSize ? FRAMED_PICTURE_SIZES[namedSize] : null;
        const label = namedSize
          ? FRAMED_PICTURE_SIZE_LABELS[namedSize]
          : value.name;
        const dimensions = spec
          ? formatPrintDimensions(spec, orientation)
          : null;

        return {
          key: value.name,
          label,
          dimensions,
          price: value.firstSelectableVariant?.price ?? null,
          selected: value.selected,
          disabled: !value.exists,
          onSelect: () => onSelect(value.variantUriQuery, value.selected),
        };
      })}
    />
  );
}

/**
 * @param {{
 *   option?: import('@shopify/hydrogen').MappedProductOptions;
 *   selectedFrame: string;
 *   onSelectShopify: (variantUriQuery: string, selected: boolean) => void;
 *   onSelectFallback: (value: string) => void;
 * }}
 */
function FrameSwatches({
  option,
  selectedFrame,
  onSelectShopify,
  onSelectFallback,
}) {
  const useShopify = Boolean(option?.optionValues?.length);
  const shopifyValues =
    option?.optionValues.filter((value) => !isExcludedFrameOption(value.name)) ??
    [];
  const fallbackValues = DEFAULT_FRAME_OPTIONS.map((name) => ({
    name,
    selected: name.toLowerCase() === selectedFrame.toLowerCase(),
    exists: true,
  }));
  const values =
    useShopify && shopifyValues.length > 0 ? shopifyValues : fallbackValues;

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-neutral-900">Frame:</h3>
      <div className="inline-flex w-fit divide-x divide-neutral-200 border border-neutral-200">
          {values.map((value) => {
            const selected = useShopify
              ? value.selected
              : value.name.toLowerCase() === selectedFrame.toLowerCase();

            return (
              <button
                key={value.name}
                type="button"
                disabled={useShopify ? !value.exists : false}
                onClick={() =>
                  useShopify
                    ? onSelectShopify(value.variantUriQuery, value.selected)
                    : onSelectFallback(value.name)
                }
                className={cn(
                  'flex size-11 items-center justify-center transition-colors',
                  selected
                    ? 'bg-neutral-100'
                    : 'bg-white hover:bg-neutral-50',
                  useShopify && !value.exists && 'cursor-not-allowed opacity-40',
                )}
                aria-label={value.name}
                title={value.name}
              >
                <FrameSwatch name={value.name} swatch={value.swatch} />
              </button>
            );
          })}
      </div>
    </div>
  );
}

/** @param {{name: string; swatch?: {color?: string | null; image?: {previewImage?: {url?: string | null} | null} | null} | null}} */
function FrameSwatch({name, swatch}) {
  const normalized = name.toLowerCase();
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (image) {
    return (
      <span
        className="size-6 rounded-full bg-cover bg-center"
        style={{backgroundImage: `url(${image})`}}
      />
    );
  }

  if (normalized.includes('no frame') || normalized.includes('unframed')) {
    return (
      <span className="relative size-6 rounded-full border border-neutral-300 bg-white">
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-px w-6 rotate-45 bg-neutral-400" />
        </span>
      </span>
    );
  }

  if (normalized.includes('white')) {
    return (
      <span className="size-6 rounded-full border border-neutral-300 bg-white" />
    );
  }

  if (normalized.includes('natural') || normalized.includes('wood')) {
    return (
      <span
        className="size-6 rounded-full"
        style={{
          background:
            'linear-gradient(135deg, #d4b896 0%, #a67c52 45%, #c9a66b 100%)',
        }}
      />
    );
  }

  return (
    <span
      className="size-6 rounded-full"
      style={{backgroundColor: color || '#1a1a1a'}}
    />
  );
}

/**
 * @param {{
 *   option?: import('@shopify/hydrogen').MappedProductOptions;
 *   selectedMount: string;
 *   onSelectShopify: (variantUriQuery: string, selected: boolean) => void;
 *   onSelectFallback: (value: string) => void;
 * }}
 */
function MountToggle({
  option,
  selectedMount,
  onSelectShopify,
  onSelectFallback,
}) {
  const useShopify = Boolean(option?.optionValues?.length);

  const values = useShopify
    ? option.optionValues
    : DEFAULT_MOUNT_OPTIONS.map((name) => ({
        name,
        selected: name.toLowerCase() === selectedMount.toLowerCase(),
        exists: true,
      }));

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-neutral-900">Mount:</h3>
      <div className="grid grid-cols-2 divide-x divide-neutral-200 border border-neutral-200">
        {values.map((value) => {
          const selected = useShopify
            ? value.selected
            : value.name.toLowerCase() === selectedMount.toLowerCase();

          return (
            <button
              key={value.name}
              type="button"
              disabled={useShopify ? !value.exists : false}
              onClick={() =>
                useShopify
                  ? onSelectShopify(value.variantUriQuery, value.selected)
                  : onSelectFallback(value.name)
              }
              className={cn(
                'px-4 py-3 text-sm font-medium transition-colors',
                selected
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50',
                useShopify && !value.exists && 'cursor-not-allowed opacity-40',
              )}
            >
              {value.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Export for preview mode on print detail without a linked product. */
export {FrameSwatches, MountToggle};
