import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
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
import {AnimatePresence, motion} from 'framer-motion';
import {getProductOptions, Money} from '@shopify/hydrogen';
import {SizeOptionTable} from '~/components/SizeOptionTable';
import {AddToCartButton} from '~/components/AddToCartButton';
import {FramedPicture} from '~/components/FramedPicture';
import {
  FRAMED_PICTURE_IMAGE_SIZES,
  FramedPictureWall,
} from '~/components/FramedPictureWall';
import {useAside} from '~/components/Aside';
import {getPrintLineAttributes} from '~/lib/cart';
import {
  formatOuterDimensions,
  FRAMED_PICTURE_SIZE_LABELS,
  FRAMED_PICTURE_SIZES,
  getFramedPictureSpecFromVariant,
  getMaxWidthCqiForNamedSize,
  getSummaryStripFitLongSideCqi,
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
import {scrollPageToTop} from '~/lib/page-scroll';

/**
 * @param {{
 *   product: import('storefrontapi.generated').ProductFragment;
 *   selectedVariant: import('storefrontapi.generated').ProductFragment['selectedOrFirstAvailableVariant'];
 *   printHandle?: string;
 *   artistName?: string | null;
 *   orientation?: import('~/lib/framed-picture').PictureOrientation;
 *   galleryInView?: boolean;
 *   title?: string;
 *   image?: {
 *     id?: string;
 *     url: string;
 *     altText?: string | null;
 *     width?: number | null;
 *     height?: number | null;
 *   } | null;
 *   framedSpec?: import('~/lib/framed-picture').FramedPictureSizeSpec;
 *   minPrice?: {amount: string; currencyCode: string} | null;
 * }}
 */
export function PrintPurchasePanel({
  product,
  selectedVariant,
  printHandle,
  artistName,
  orientation = 'vertical',
  galleryInView = true,
  title,
  image,
  framedSpec,
  minPrice,
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {open} = useAside();

  const handleSummaryExpand = useCallback(async () => {
    setExpanded(true);
    await scrollPageToTop({behavior: 'smooth'});
  }, []);

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

  const selectedFrame = getResolvedFrameValue(selectedVariant, searchParams);
  const selectedMount = getResolvedMountValue(selectedVariant, searchParams);

  const cartLines =
    selectedVariant
      ? [
          {
            merchandiseId: selectedVariant.id,
            quantity: 1,
            selectedVariant,
            attributes: getPrintLineAttributes({
              printHandle,
              artistName,
              frame: selectedFrame,
              mount: selectedMount,
              variant: selectedVariant,
            }),
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

  return (
    <div className="space-y-6">
      <PrintFeatureList />

      <PrintFulfillmentNotes />

      <PrintPurchaseDock
        expanded={expanded}
        onToggle={() => setExpanded((open) => !open)}
        onSummaryExpand={handleSummaryExpand}
        galleryInView={galleryInView}
        summary={
          title && framedSpec
            ? {
                title,
                artistName,
                image,
                framedSpec,
                price: selectedVariant?.price ?? minPrice ?? null,
                showFromPrefix: !selectedVariant?.price,
              }
            : undefined
        }
        footer={
          <AddToCartButton
            analytics={analytics}
            className="w-full bg-neutral-900 px-6 py-4 text-center text-xs font-medium tracking-[0.2em] text-white uppercase transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!selectedVariant || !selectedVariant.availableForSale}
            onClick={() => {
              open('cart');
            }}
            lines={cartLines}
          >
            {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
          </AddToCartButton>
        }
      >
      {sizeOption && sizeOption.optionValues.length > 0 ? (
        <SizeTable
          option={sizeOption}
          orientation={orientation}
          frame={selectedFrame}
          mount={selectedMount}
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
    </PrintPurchaseDock>
    </div>
  );
}

/**
 * Mobile bottom sheet / desktop inline purchase options shell.
 *
 * @param {{
 *   expanded: boolean;
 *   onToggle: () => void;
 *   onSummaryExpand?: () => void | Promise<void>;
 *   galleryInView?: boolean;
 *   summary?: {
 *     title: string;
 *     artistName?: string | null;
 *     image?: {
 *       id?: string;
 *       url: string;
 *       altText?: string | null;
 *       width?: number | null;
 *       height?: number | null;
 *     } | null;
 *     framedSpec: import('~/lib/framed-picture').FramedPictureSizeSpec;
 *     price?: {amount: string; currencyCode: string} | null;
 *     showFromPrefix?: boolean;
 *   };
 *   children: import('react').ReactNode;
 *   footer?: import('react').ReactNode;
 * }}
 */
export function PrintPurchaseDock({
  expanded,
  onToggle,
  onSummaryExpand,
  galleryInView = true,
  summary,
  children,
  footer,
}) {
  const showSummary = !expanded && !galleryInView && summary;
  const showCollapsedCta = !expanded && galleryInView;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const renderSummaryCard = () => (
    <motion.div
      key="summary"
      className="pointer-events-auto overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
      initial={{opacity: 0, y: 16}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: 16}}
      transition={{duration: 0.2, ease: 'easeOut'}}
    >
      <PrintPurchaseSummaryCard
        {...summary}
        onExpand={onSummaryExpand ?? onToggle}
      />
    </motion.div>
  );

  const mobileDock = (
    <div className="pointer-events-none fixed inset-x-0 bottom-2.5 z-30 px-2.5 md:hidden">
      <AnimatePresence mode="wait" initial={false}>
        {expanded ? (
          <motion.div
            key="expanded"
            className="pointer-events-auto flex max-h-[50dvh] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            initial={{opacity: 0, y: 16}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 16}}
            transition={{duration: 0.2, ease: 'easeOut'}}
          >
            <button
              type="button"
              className="flex w-full shrink-0 items-center justify-center gap-2 bg-neutral-100 px-4 py-4 text-sm font-medium text-neutral-900 transition-colors"
              onClick={onToggle}
              aria-expanded={expanded}
            >
              <span>Select Size, Frame &amp; Mount</span>
              <ChevronUp className="size-4 shrink-0" strokeWidth={1.75} />
            </button>
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain px-4 pt-6 pb-4">
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-neutral-100 bg-white px-4 py-3">
                {footer}
              </div>
            ) : null}
          </motion.div>
        ) : showSummary ? (
          renderSummaryCard()
        ) : showCollapsedCta ? (
          <motion.div
            key="cta"
            className="pointer-events-auto overflow-hidden rounded-lg bg-neutral-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            initial={{opacity: 0, y: 16}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 16}}
            transition={{duration: 0.2, ease: 'easeOut'}}
          >
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              onClick={onToggle}
              aria-expanded={expanded}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-[#3b82f6]"
              />
              <span>Select Size, Frame &amp; Mount</span>
              <ChevronDown className="size-4 shrink-0" strokeWidth={1.75} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );

  const desktopSummaryDock = (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 hidden px-2.5 md:block">
      <div className="mx-auto max-w-xl">
        <AnimatePresence mode="wait" initial={false}>
          {showSummary ? renderSummaryCard() : null}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="h-[calc(4.75rem+0.625rem)] md:hidden"
        aria-hidden
      />

      {mounted ? createPortal(mobileDock, document.body) : null}
      {mounted ? createPortal(desktopSummaryDock, document.body) : null}

      <div className="hidden overflow-hidden md:block">
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors',
            expanded
              ? 'bg-neutral-100 text-neutral-900'
              : 'bg-neutral-900 text-white hover:bg-neutral-800',
          )}
          onClick={onToggle}
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
            {children}
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}

/**
 * @param {{
 *   title: string;
 *   artistName?: string | null;
 *   image?: {
 *     id?: string;
 *     url: string;
 *     altText?: string | null;
 *     width?: number | null;
 *     height?: number | null;
 *   } | null;
 *   framedSpec: import('~/lib/framed-picture').FramedPictureSizeSpec;
 *   price?: {amount: string; currencyCode: string} | null;
 *   showFromPrefix?: boolean;
 *   onExpand: () => void;
 * }}
 */
function PrintPurchaseSummaryCard({
  title,
  artistName,
  image,
  framedSpec,
  price,
  showFromPrefix = false,
  onExpand,
}) {
  const hasPrice = price && Number(price.amount) > 0;
  const summaryFramedSpec = useMemo(
    () => ({
      ...FRAMED_PICTURE_SIZES.large,
      frameColor: framedSpec.frameColor,
      padding: framedSpec.padding,
      frame: framedSpec.frame,
    }),
    [framedSpec.frame, framedSpec.frameColor, framedSpec.padding],
  );
  const stripRef = useRef(null);
  const [fitLongSideCqi, setFitLongSideCqi] = useState(undefined);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const updateFit = () => {
      const {width, height} = el.getBoundingClientRect();
      setFitLongSideCqi(
        getSummaryStripFitLongSideCqi(
          summaryFramedSpec,
          'large',
          width,
          height,
        ),
      );
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [summaryFramedSpec]);

  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex min-h-18 w-full items-stretch overflow-hidden text-left"
      aria-label={`Configure ${title}`}
    >
      <div className="flex w-18 shrink-0 self-stretch bg-[#ececea]">
        {image?.url ? (
          <FramedPictureWall variant="summaryStrip" containerRef={stripRef}>
            <FramedPicture
              image={image}
              alt={title}
              size={summaryFramedSpec}
              sizes={FRAMED_PICTURE_IMAGE_SIZES.compact}
              interactive={false}
              maxWidthCqi={getMaxWidthCqiForNamedSize('large')}
              maxLongSideCqi={fitLongSideCqi}
            />
          </FramedPictureWall>
        ) : (
          <div className="size-full bg-neutral-100" aria-hidden />
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 py-3 pr-3 pl-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight text-neutral-900 uppercase">
            {title}
          </p>
          {artistName || hasPrice ? (
            <div className="mt-1 flex min-w-0 items-baseline gap-1 text-[13px] leading-snug text-neutral-600">
              {artistName ? (
                <span className="truncate">{artistName}</span>
              ) : null}
              {artistName && hasPrice ? (
                <span className="shrink-0 text-neutral-400">|</span>
              ) : null}
              {hasPrice ? (
                <span className="shrink-0 whitespace-nowrap">
                  {showFromPrefix ? 'from: ' : null}
                  <Money data={price} withoutTrailingZeros />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <ChevronUp
          className="size-4 shrink-0 text-neutral-400"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    </button>
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
 *   frame: string;
 *   mount: string;
 *   onSelect: (variantUriQuery: string, selected: boolean) => void;
 * }}
 */
function SizeTable({option, orientation, frame, mount, onSelect}) {
  const values = sortSizeOptionValues(option.optionValues);

  return (
    <SizeOptionTable
      rows={values.map((value) => {
        const namedSize = resolveNamedFramedPictureSize(value.name);
        const label = namedSize
          ? FRAMED_PICTURE_SIZE_LABELS[namedSize]
          : value.name;
        const dimensions = namedSize
          ? formatOuterDimensions(
              getFramedPictureSpecFromVariant(null, namedSize, {frame, mount}),
              orientation,
            )
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
