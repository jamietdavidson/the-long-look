export type FrameColor = 'white' | 'black' | 'natural';
export type PictureOrientation = 'vertical' | 'horizontal';

export type FramedPictureSizeSpec = {
  /** Shorter print edge in inches — sets proportions, not rendered pixels. */
  shortSide: number;
  /** Longer print edge in inches — sets proportions, not rendered pixels. */
  longSide: number;
  /** Mat border in inches. */
  padding: number;
  /** Outer frame border in inches. */
  frame: number;
  frameColor?: FrameColor;
};

export type FramedPictureComputed = {
  pictureAspect: number;
  outerAspect: number;
  outerWidth: number;
  outerHeight: number;
  frameCqi: number;
  paddingCqi: number;
  pictureWidthCqi: number;
  frameColor: FrameColor;
  orientation: PictureOrientation;
  colors: {
    frameBorder: string;
    frameFace: string;
    matFace: string;
    frameMatJunction: string;
    matPictureJunction: string;
  };
};

/** Fixed mat and frame width in inches — same physical moulding at every tier. */
const STANDARD_MAT_INCHES = 1.25;
const STANDARD_FRAME_INCHES = 0.625;

/** Default scale for how much of the @container the outer frame may occupy (1 = no adjustment). */
export const FRAMED_PICTURE_DEFAULT_CONTAINER_FILL = 1;

/** Grid listings — outer frame long edge as a fraction of the @container width. */
export const FRAMED_PICTURE_GRID_CONTAINER_FILL = 0.85;

/** Catalog cards use the collector tier with physical inch proportions. */
export const FRAMED_PICTURE_CATALOG_DISPLAY_SIZE = 'collector' as const;

/** Default size on print detail when no variant is selected in the URL. */
export const FRAMED_PICTURE_DEFAULT_NAMED_SIZE = 'large' as const;

/** Detail gallery — min/max outer frame long edge (% of @container width); tiers step evenly. */
export const FRAMED_PICTURE_DETAIL_MIN_LONG_SIDE_CQI = 50;
export const FRAMED_PICTURE_DETAIL_MAX_LONG_SIDE_CQI = 88;

/** Detail gallery — min/max long-edge height fill; tiers step evenly between. */
export const FRAMED_PICTURE_DETAIL_MIN_HEIGHT_FILL = 0.5;
export const FRAMED_PICTURE_DETAIL_MAX_HEIGHT_FILL = 0.88;

/**
 * Named print sizes — standard 2:3 aspect ratio (short × long) at every tier.
 * Inch values define proportions only; the parent @container controls on-screen scale.
 */
export const FRAMED_PICTURE_SIZES = {
  small: {
    shortSide: 8,
    longSide: 12,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
  medium: {
    shortSide: 12,
    longSide: 18,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
  large: {
    shortSide: 16,
    longSide: 24,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
  giant: {
    shortSide: 20,
    longSide: 30,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
  collector: {
    shortSide: 30,
    longSide: 45,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
  exhibition: {
    shortSide: 40,
    longSide: 60,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
} satisfies Record<string, FramedPictureSizeSpec>;

export type FramedPictureNamedSize = keyof typeof FRAMED_PICTURE_SIZES;

type VariantMetafield = {
  namespace?: string | null;
  key?: string | null;
  value?: string | null;
};

/** Read a print dimension metafield synced from Airtable via Pipedream. */
export function getVariantPrintMetafield(
  variant: {metafields?: VariantMetafield[] | null} | null | undefined,
  key: string,
) {
  return variant?.metafields?.find(
    (field) => field?.namespace === 'print' && field?.key === key,
  )?.value;
}

function parseInchesMetafield(value?: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Size tier rank (1 = smallest) from Shopify variant metafield. */
export function getVariantSizeRank(
  variant: {metafields?: VariantMetafield[] | null} | null | undefined,
) {
  return parseInchesMetafield(getVariantPrintMetafield(variant, 'rank'));
}

/** Build framed-picture spec from Shopify variant metafields (Airtable source of truth). */
export function getFramedPictureSpecFromVariantMetafields(
  variant: {
    metafields?: VariantMetafield[] | null;
    selectedOptions?: Array<{name: string; value: string}>;
  } | null | undefined,
): FramedPictureSizeSpec | null {
  const shortSide = parseInchesMetafield(
    getVariantPrintMetafield(variant, 'short_inches'),
  );
  const longSide = parseInchesMetafield(
    getVariantPrintMetafield(variant, 'long_inches'),
  );
  if (!shortSide || !longSide) return null;

  const paddingInches =
    parseInchesMetafield(getVariantPrintMetafield(variant, 'padding_inches')) ??
    STANDARD_MAT_INCHES;
  const frameWidthInches =
    parseInchesMetafield(
      getVariantPrintMetafield(variant, 'frame_width_inches'),
    ) ?? STANDARD_FRAME_INCHES;

  const frameValue = variant?.selectedOptions?.find(
    (option) => option.name.toLowerCase() === 'frame',
  )?.value;
  const mountValue = variant?.selectedOptions?.find(
    (option) => option.name.toLowerCase() === 'mount',
  )?.value;
  const normalizedFrame = frameValue?.toLowerCase().trim() ?? '';

  return {
    shortSide,
    longSide,
    padding:
      resolveMountFromOption(mountValue) === 'fullBleed' ? 0 : paddingInches,
    frame:
      normalizedFrame.includes('no frame') ||
      normalizedFrame.includes('unframed') ||
      normalizedFrame.includes('none')
        ? 0
        : frameWidthInches,
    frameColor: resolveFrameColorFromOption(frameValue),
  };
}

/** Print tiers in ascending size order for detail-page interpolation. */
export const FRAMED_PICTURE_NAMED_SIZE_ORDER = [
  'small',
  'medium',
  'large',
  'giant',
  'collector',
  'exhibition',
] as const satisfies readonly FramedPictureNamedSize[];

function lerpDetailTierValue(
  namedSize: FramedPictureNamedSize,
  min: number,
  max: number,
) {
  const index = FRAMED_PICTURE_NAMED_SIZE_ORDER.indexOf(namedSize);
  if (index < 0) return max;

  const steps = FRAMED_PICTURE_NAMED_SIZE_ORDER.length - 1;
  if (steps === 0) return max;

  return min + (index / steps) * (max - min);
}

export function getDetailMaxLongSideCqiForNamedSize(
  namedSize: FramedPictureNamedSize,
) {
  return lerpDetailTierValue(
    namedSize,
    FRAMED_PICTURE_DETAIL_MIN_LONG_SIDE_CQI,
    FRAMED_PICTURE_DETAIL_MAX_LONG_SIDE_CQI,
  );
}

export function getDetailMaxHeightFillForNamedSize(
  namedSize: FramedPictureNamedSize,
) {
  return lerpDetailTierValue(
    namedSize,
    FRAMED_PICTURE_DETAIL_MIN_HEIGHT_FILL,
    FRAMED_PICTURE_DETAIL_MAX_HEIGHT_FILL,
  );
}

export const FRAMED_PICTURE_SIZE_LABELS: Record<FramedPictureNamedSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  giant: 'Giant',
  collector: 'Collector',
  exhibition: 'Exhibition',
};

/** Max outer frame width (% of @container) per named print size. */
export const FRAMED_PICTURE_MAX_WIDTH_CQI: Record<
  FramedPictureNamedSize,
  number
> = {
  small: 50,
  medium: 65,
  large: 78,
  giant: 88,
  collector: 92,
  exhibition: 92,
};

/** Resolve catalog tier from print inch dimensions (ignores frame/mount overrides). */
export function resolveNamedSizeFromSpec(
  spec: Pick<FramedPictureSizeSpec, 'shortSide' | 'longSide'>,
): FramedPictureNamedSize | undefined {
  for (const key of Object.keys(
    FRAMED_PICTURE_SIZES,
  ) as FramedPictureNamedSize[]) {
    const template = FRAMED_PICTURE_SIZES[key];
    if (
      spec.shortSide === template.shortSide &&
      spec.longSide === template.longSide
    ) {
      return key;
    }
  }

  return undefined;
}

export function getMaxWidthCqiForNamedSize(
  namedSize?: FramedPictureNamedSize,
): number {
  if (namedSize) return FRAMED_PICTURE_MAX_WIDTH_CQI[namedSize];
  return DEFAULT_MAX_FRAME_WIDTH_CQI;
}

function getLayoutOuterAspectForTierCap(
  spec: FramedPictureSizeSpec,
  layoutPadding: number,
  layoutFrame: number,
) {
  const verticalLayout = getLayoutOuterDimensions(
    {shortSide: spec.shortSide, longSide: spec.longSide, frame: layoutFrame},
    'vertical',
    layoutPadding,
  );

  return verticalLayout.width / verticalLayout.height;
}

/** Mobile detail gallery height — 5/8 viewport; keep in sync with PrintDetailGallery Tailwind classes. */
export const FRAMED_PICTURE_DETAIL_GALLERY_MOBILE_HEIGHT_RATIO = 5 / 8;

/** md breakpoint — keep in sync with PrintDetailGallery `md:w-1/2 md:h-screen`. */
export const FRAMED_PICTURE_DETAIL_GALLERY_DESKTOP_BREAKPOINT_PX = 768;

/** SSR fallback width before @container is measured (typical phone). */
const FRAMED_PICTURE_DETAIL_GALLERY_SSR_WIDTH_PX = 393;

/** Best-effort @container dimensions before layout measurement. */
export function getDetailGalleryViewportEstimate() {
  if (typeof window === 'undefined') {
    return {
      width: FRAMED_PICTURE_DETAIL_GALLERY_SSR_WIDTH_PX,
      height:
        FRAMED_PICTURE_DETAIL_GALLERY_SSR_WIDTH_PX *
        FRAMED_PICTURE_DETAIL_GALLERY_MOBILE_HEIGHT_RATIO,
    };
  }

  const isDesktop = window.matchMedia(
    `(min-width: ${FRAMED_PICTURE_DETAIL_GALLERY_DESKTOP_BREAKPOINT_PX}px)`,
  ).matches;

  if (isDesktop) {
    return {
      width: window.innerWidth / 2,
      height: window.innerHeight,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight * FRAMED_PICTURE_DETAIL_GALLERY_MOBILE_HEIGHT_RATIO,
  };
}

/** Tier caps only — no viewport height binding. Use before @container is measured. */
export function getDetailTierFitCaps(
  spec: FramedPictureSizeSpec,
  namedSize: FramedPictureNamedSize,
) {
  const maxLongSideCqi = getDetailMaxLongSideCqiForNamedSize(namedSize);
  const isFullBleed = spec.padding === 0;
  const isUnframed = spec.frame === 0;
  const layoutPadding = isFullBleed ? STANDARD_MAT_INCHES : spec.padding;
  const layoutFrame = isUnframed ? STANDARD_FRAME_INCHES : spec.frame;
  const verticalOuterAspect = getLayoutOuterAspectForTierCap(
    spec,
    layoutPadding,
    layoutFrame,
  );

  return {
    maxLongSideCqi,
    maxWidthCqi: maxLongSideCqi * verticalOuterAspect,
  };
}

/** Max outer long edge (cqi) for a detail gallery @container. */
export function getDetailFitLongSideCqi(
  spec: FramedPictureSizeSpec,
  namedSize: FramedPictureNamedSize | undefined,
  containerWidth: number,
  containerHeight: number,
) {
  if (containerWidth <= 0 || containerHeight <= 0) return undefined;

  const tierLongSide = namedSize
    ? getDetailMaxLongSideCqiForNamedSize(namedSize)
    : (FRAMED_PICTURE_DETAIL_MIN_LONG_SIDE_CQI +
        FRAMED_PICTURE_DETAIL_MAX_LONG_SIDE_CQI) /
      2;
  const heightFill = namedSize
    ? getDetailMaxHeightFillForNamedSize(namedSize)
    : FRAMED_PICTURE_DETAIL_MAX_HEIGHT_FILL;
  const heightLongSideCap =
    (containerHeight / containerWidth) * 100 * heightFill;

  return Math.min(tierLongSide, heightLongSideCap);
}

/** Cap outer width (cqi) so the frame fits within a detail gallery viewport. */
export function getDetailFitMaxWidthCqi(
  spec: FramedPictureSizeSpec,
  namedSize: FramedPictureNamedSize | undefined,
  containerWidth: number,
  containerHeight: number,
) {
  const targetLongSide = getDetailFitLongSideCqi(
    spec,
    namedSize,
    containerWidth,
    containerHeight,
  );
  if (targetLongSide === undefined) return undefined;

  const isFullBleed = spec.padding === 0;
  const isUnframed = spec.frame === 0;
  const layoutPadding = isFullBleed ? STANDARD_MAT_INCHES : spec.padding;
  const layoutFrame = isUnframed ? STANDARD_FRAME_INCHES : spec.frame;
  const verticalOuterAspect = getLayoutOuterAspectForTierCap(
    spec,
    layoutPadding,
    layoutFrame,
  );

  return targetLongSide * verticalOuterAspect;
}

/** Cap outer long edge for summary-strip / compact thumbnails. */
export function getSummaryStripFitLongSideCqi(
  spec: FramedPictureSizeSpec,
  namedSize: FramedPictureNamedSize,
  containerWidth: number,
  containerHeight: number,
) {
  if (containerWidth <= 0 || containerHeight <= 0) return undefined;

  const maxWidthCqi = getMaxWidthCqiForNamedSize(namedSize);
  const isFullBleed = spec.padding === 0;
  const isUnframed = spec.frame === 0;
  const layoutPadding = isFullBleed ? STANDARD_MAT_INCHES : spec.padding;
  const layoutFrame = isUnframed ? STANDARD_FRAME_INCHES : spec.frame;
  const verticalOuterAspect = getLayoutOuterAspectForTierCap(
    spec,
    layoutPadding,
    layoutFrame,
  );
  const tierLongSideCap = maxWidthCqi / verticalOuterAspect;
  const heightLongSideCap = (containerHeight / containerWidth) * 100;

  return Math.min(tierLongSideCap, heightLongSideCap, 100);
}

/** @param {{width?: number | null; height?: number | null} | null | undefined} image */
export function getOrientationFromImage(image): PictureOrientation {
  if (image?.width && image?.height) {
    return image.width >= image.height ? 'horizontal' : 'vertical';
  }
  return 'vertical';
}

/** Natural width / height for equal-area grid sizing. */
export function getImageAspectRatio(
  image: {width?: number | null; height?: number | null} | null | undefined,
): number {
  if (image?.width && image?.height) {
    return image.width / image.height;
  }
  return 0.75;
}

export function getPictureDimensions(
  spec: Pick<FramedPictureSizeSpec, 'shortSide' | 'longSide'>,
  orientation: PictureOrientation,
) {
  if (orientation === 'horizontal') {
    return {width: spec.longSide, height: spec.shortSide};
  }
  return {width: spec.shortSide, height: spec.longSide};
}

export function formatPrintDimensions(
  spec: Pick<FramedPictureSizeSpec, 'shortSide' | 'longSide'>,
  orientation: PictureOrientation,
) {
  const {width, height} = getPictureDimensions(spec, orientation);
  return `${formatInches(width)}" × ${formatInches(height)}"`;
}

/** Shopify Size option label (short × long, portrait order). */
export function formatPrintSizeShopifyLabel(
  spec: Pick<FramedPictureSizeSpec, 'shortSide' | 'longSide'>,
) {
  return `${formatInches(spec.shortSide)}" x ${formatInches(spec.longSide)}"`;
}

export function getOuterDimensions(
  spec: FramedPictureSizeSpec,
  orientation: PictureOrientation,
) {
  const {width: pictureWidth, height: pictureHeight} = getPictureDimensions(
    spec,
    orientation,
  );
  const {padding, frame} = spec;

  return {
    width: pictureWidth + 2 * padding + 2 * frame,
    height: pictureHeight + 2 * padding + 2 * frame,
  };
}

/** Total outer width × height including mat and frame moulding. */
export function formatOuterDimensions(
  spec: FramedPictureSizeSpec,
  orientation: PictureOrientation,
) {
  const {width, height} = getOuterDimensions(spec, orientation);
  return `${formatInches(width)}" × ${formatInches(height)}"`;
}

function formatInches(value: number) {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

function adjustHexColor(hex: string, amountPercent: number) {
  const normalized = hex.replace('#', '');
  const channels = [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
  const factor = amountPercent / 100;

  return `#${channels
    .map((channel) => {
      const next =
        amountPercent > 0
          ? channel + (255 - channel) * factor
          : channel * (1 + factor);
      return Math.max(0, Math.min(255, Math.round(next)))
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

/** Default max outer width when size tier is unknown. */
const DEFAULT_MAX_FRAME_WIDTH_CQI = 92;

function getLayoutOuterDimensions(
  spec: Pick<FramedPictureSizeSpec, 'shortSide' | 'longSide' | 'frame'>,
  orientation: PictureOrientation,
  layoutPadding: number,
) {
  const {width, height} = getPictureDimensions(spec, orientation);
  const {frame} = spec;

  return {
    width: width + 2 * layoutPadding + 2 * frame,
    height: height + 2 * layoutPadding + 2 * frame,
  };
}

function getOuterDimensionsCqi(
  frameCqi: number,
  paddingCqi: number,
  pictureWidthCqi: number,
  pictureAspect: number,
) {
  const junctionCqi = 0.11 * frameCqi;
  const outerWidthCqi =
    pictureWidthCqi + 2 * frameCqi + 2 * paddingCqi + 2 * junctionCqi;
  const pictureHeightCqi = pictureWidthCqi / pictureAspect;
  const outerHeightCqi =
    pictureHeightCqi + 2 * frameCqi + 2 * paddingCqi + 2 * junctionCqi;

  return {outerWidthCqi, outerHeightCqi};
}

/** Scale all cqi so the outer frame long edge matches `fillRatio` × container width. */
function scaleToOuterContainerFill(
  dimensions: {
    frameCqi: number;
    paddingCqi: number;
    pictureWidthCqi: number;
    pictureAspect: number;
  },
  fillRatio: number,
) {
  const targetLongSideCqi = Math.min(fillRatio, 1) * 100;
  const {outerWidthCqi, outerHeightCqi} = getOuterDimensionsCqi(
    dimensions.frameCqi,
    dimensions.paddingCqi,
    dimensions.pictureWidthCqi,
    dimensions.pictureAspect,
  );
  const longSideCqi = Math.max(outerWidthCqi, outerHeightCqi);
  if (longSideCqi === 0 || longSideCqi === targetLongSideCqi) return dimensions;

  const scale = targetLongSideCqi / longSideCqi;
  return {
    frameCqi: dimensions.frameCqi * scale,
    paddingCqi: dimensions.paddingCqi * scale,
    pictureWidthCqi: dimensions.pictureWidthCqi * scale,
  };
}

/**
 * Scale frame/mat/picture cqi so the long outer edge fits the tier cap.
 * `maxWidthCqi` is the max outer width for vertical orientation; horizontal
 * prints use the same long-edge budget so both orientations read at the same size.
 */
function scaleFramedPictureDimensions(
  dimensions: {
    frameCqi: number;
    paddingCqi: number;
    pictureWidthCqi: number;
    pictureAspect: number;
  },
  targetLongSideCqi: number,
) {
  const {outerWidthCqi, outerHeightCqi} = getOuterDimensionsCqi(
    dimensions.frameCqi,
    dimensions.paddingCqi,
    dimensions.pictureWidthCqi,
    dimensions.pictureAspect,
  );
  const longSideCqi = Math.max(outerWidthCqi, outerHeightCqi);

  if (longSideCqi === 0 || longSideCqi <= targetLongSideCqi) return dimensions;

  const scale = targetLongSideCqi / longSideCqi;
  return {
    frameCqi: dimensions.frameCqi * scale,
    paddingCqi: dimensions.paddingCqi * scale,
    pictureWidthCqi: dimensions.pictureWidthCqi * scale,
  };
}

function fitFramedPictureToContainer(
  dimensions: {
    frameCqi: number;
    paddingCqi: number;
    pictureWidthCqi: number;
    pictureAspect: number;
  },
  maxWidthCqi = DEFAULT_MAX_FRAME_WIDTH_CQI,
  verticalOuterAspect = 1,
) {
  return scaleFramedPictureDimensions(
    dimensions,
    maxWidthCqi / verticalOuterAspect,
  );
}

export function computeFramedPictureSize(
  spec: FramedPictureSizeSpec,
  orientation: PictureOrientation,
  options?: {
    containerFill?: number;
    namedSize?: FramedPictureNamedSize;
    maxWidthCqi?: number;
    maxLongSideCqi?: number;
  },
): FramedPictureComputed {
  const {width: pictureWidth, height: pictureHeight} = getPictureDimensions(
    spec,
    orientation,
  );
  const {padding, frame} = spec;
  const frameColor = spec.frameColor ?? 'black';
  const isFullBleed = padding === 0;
  const isUnframed = frame === 0;
  /** Border-mount padding used to lock picture scale when mat is removed. */
  const layoutPadding = isFullBleed ? STANDARD_MAT_INCHES : padding;
  /** Framed width used to lock picture scale when moulding is removed. */
  const layoutFrame = isUnframed ? STANDARD_FRAME_INCHES : frame;

  const outerWidth = pictureWidth + 2 * padding + 2 * frame;
  const outerHeight = pictureHeight + 2 * padding + 2 * frame;

  const layoutOuterWidth = pictureWidth + 2 * layoutPadding + 2 * layoutFrame;
  const verticalLayout = getLayoutOuterDimensions(
    {shortSide: spec.shortSide, longSide: spec.longSide, frame: layoutFrame},
    'vertical',
    layoutPadding,
  );
  const verticalOuterAspect = verticalLayout.width / verticalLayout.height;

  let frameCqi = (layoutFrame / layoutOuterWidth) * 100;
  let paddingCqi = (layoutPadding / layoutOuterWidth) * 100;
  let pictureWidthCqi = (pictureWidth / layoutOuterWidth) * 100;
  const pictureAspect = pictureWidth / pictureHeight;

  const maxWidthCqi =
    options?.maxWidthCqi ??
    getMaxWidthCqiForNamedSize(options?.namedSize);

  ({frameCqi, paddingCqi, pictureWidthCqi} = fitFramedPictureToContainer(
    {
      frameCqi,
      paddingCqi,
      pictureWidthCqi,
      pictureAspect,
    },
    maxWidthCqi,
    verticalOuterAspect,
  ));

  if (options?.maxLongSideCqi !== undefined) {
    ({frameCqi, paddingCqi, pictureWidthCqi} = scaleFramedPictureDimensions(
      {frameCqi, paddingCqi, pictureWidthCqi, pictureAspect},
      options.maxLongSideCqi,
    ));
  }

  if (isFullBleed) {
    paddingCqi = 0;
  }

  if (isUnframed) {
    frameCqi = 0;
  }

  const containerFill = options?.containerFill ?? FRAMED_PICTURE_DEFAULT_CONTAINER_FILL;
  if (containerFill !== FRAMED_PICTURE_DEFAULT_CONTAINER_FILL) {
    ({frameCqi, paddingCqi, pictureWidthCqi} = scaleToOuterContainerFill(
      {frameCqi, paddingCqi, pictureWidthCqi, pictureAspect},
      containerFill,
    ));
  }

  const baseColors =
    frameColor === 'white'
      ? {
          frameBorder: '#e5e5e5',
          frameFace: '#ffffff',
          matFace: '#ffffff',
        }
      : frameColor === 'natural'
        ? {
            frameBorder: '#8b7355',
            frameFace: '#c4a574',
            matFace: '#ffffff',
          }
        : {
            frameBorder: '#2a2a2a',
            frameFace: '#ffffff',
            matFace: '#ffffff',
          };

  const colors = {
    ...baseColors,
    frameMatJunction:
      frameColor === 'white'
        ? adjustHexColor(baseColors.frameBorder, -10)
        : adjustHexColor(baseColors.frameBorder, 10),
    matPictureJunction: adjustHexColor(baseColors.matFace, -8),
  };

  return {
    pictureAspect,
    outerAspect: outerWidth / outerHeight,
    outerWidth,
    outerHeight,
    frameCqi,
    paddingCqi,
    pictureWidthCqi,
    frameColor,
    orientation,
    colors,
  };
}

export function isFramedPictureNamedSize(
  value: string,
): value is FramedPictureNamedSize {
  return value in FRAMED_PICTURE_SIZES;
}

function matchesDimensionPair(
  label: string,
  shortSide: number,
  longSide: number,
) {
  const pattern = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*["']?\\s*(x|×|\\*)\\s*(\\d+(?:\\.\\d+)?)`,
    'i',
  );
  const match = label.match(pattern);
  if (!match) return false;

  const a = Number(match[1]);
  const b = Number(match[3]);
  const sides = [a, b].sort((x, y) => x - y);
  return sides[0] === shortSide && sides[1] === longSide;
}

/** Map a variant label (e.g. `12" x 18"` or `Medium`) to a named print size. */
export function resolveNamedFramedPictureSize(
  label: string | null | undefined,
): FramedPictureNamedSize | undefined {
  if (!label) return undefined;

  const normalized = label.toLowerCase().trim().replace(/\s+/g, ' ');
  const byLabel = (Object.entries(FRAMED_PICTURE_SIZE_LABELS) as Array<
    [FramedPictureNamedSize, string]
  >).find(([, name]) => name.toLowerCase() === normalized);
  if (byLabel) return byLabel[0];

  /** Airtable size tiers that differ from legacy catalog keys. */
  const airtableAliases: Record<string, FramedPictureNamedSize> = {
    gallery: 'giant',
    museum: 'exhibition',
  };
  if (airtableAliases[normalized]) return airtableAliases[normalized];

  if (isFramedPictureNamedSize(normalized)) return normalized;

  for (const [key, spec] of Object.entries(FRAMED_PICTURE_SIZES) as Array<
    [FramedPictureNamedSize, FramedPictureSizeSpec]
  >) {
    if (matchesDimensionPair(label, spec.shortSide, spec.longSide)) return key;
  }

  return undefined;
}

export function resolveFramedPictureSize({
  size = 'medium',
}: {
  size?: FramedPictureNamedSize | FramedPictureSizeSpec;
}): FramedPictureSizeSpec {
  if (typeof size === 'string') return FRAMED_PICTURE_SIZES[size];
  return size;
}

/** @param {{selectedOptions?: Array<{name: string; value: string}>; title?: string | null}} variant */
export function getFramedSizeFromVariant(variant): FramedPictureNamedSize {
  const sizeOption = variant?.selectedOptions?.find(
    (option) => option.name.toLowerCase() === 'size',
  );
  return (
    resolveNamedFramedPictureSize(sizeOption?.value) ??
    resolveNamedFramedPictureSize(variant?.title) ??
    FRAMED_PICTURE_DEFAULT_NAMED_SIZE
  );
}

/** Human-readable size label for product option values. */
export function formatPrintSizeOptionLabel(
  optionName: string,
  valueName: string,
  orientation: PictureOrientation = 'vertical',
): string {
  if (optionName.toLowerCase() !== 'size') return valueName;

  const named = resolveNamedFramedPictureSize(valueName);
  if (!named) return valueName;

  const spec = FRAMED_PICTURE_SIZES[named];
  return `${FRAMED_PICTURE_SIZE_LABELS[named]} (${formatPrintDimensions(spec, orientation)})`;
}

/** Map a Shopify frame option label to a preview frame color. */
export function resolveFrameColorFromOption(
  value?: string | null,
): FrameColor {
  const normalized = value?.toLowerCase().trim() ?? '';
  if (normalized.includes('white')) return 'white';
  if (normalized.includes('natural') || normalized.includes('wood')) {
    return 'natural';
  }
  return 'black';
}

/** Map a Shopify mount option label to border vs full bleed. */
export function resolveMountFromOption(
  value?: string | null,
): 'border' | 'fullBleed' {
  const normalized = value?.toLowerCase().trim() ?? '';
  if (normalized.includes('full') || normalized.includes('bleed')) {
    return 'fullBleed';
  }
  return 'border';
}

function getSelectedOptionValue(
  variant: {selectedOptions?: Array<{name: string; value: string}>} | null | undefined,
  optionName: string,
) {
  return variant?.selectedOptions?.find(
    (option) => option.name.toLowerCase() === optionName.toLowerCase(),
  )?.value;
}

/** @param {{selectedOptions?: Array<{name: string; value: string}>; title?: string | null}} variant */
export function getFramedPictureSpecFromVariant(
  variant: {
    metafields?: VariantMetafield[] | null;
    selectedOptions?: Array<{name: string; value: string}>;
    title?: string | null;
  } | null | undefined,
  namedSize?: FramedPictureNamedSize,
  overrides?: {frame?: string | null; mount?: string | null},
): FramedPictureSizeSpec {
  const fromMetafields = getFramedPictureSpecFromVariantMetafields(variant);
  const sizeKey = namedSize ?? getFramedSizeFromVariant(variant ?? {});
  const spec: FramedPictureSizeSpec = fromMetafields ?? {
    ...FRAMED_PICTURE_SIZES[sizeKey],
  };

  const frameValue =
    getSelectedOptionValue(variant, 'frame') ?? overrides?.frame ?? null;
  const mountValue =
    getSelectedOptionValue(variant, 'mount') ?? overrides?.mount ?? null;
  const normalizedFrame = frameValue?.toLowerCase().trim() ?? '';

  spec.frameColor = resolveFrameColorFromOption(frameValue);

  if (resolveMountFromOption(mountValue) === 'fullBleed') {
    spec.padding = 0;
  }

  if (
    normalizedFrame.includes('no frame') ||
    normalizedFrame.includes('unframed') ||
    normalizedFrame.includes('none')
  ) {
    spec.frame = 0;
  }

  return spec;
}

/** Sort Shopify size option values — prefers Airtable rank metafield, then legacy order. */
export function sortSizeOptionValues<
  T extends {
    name: string;
    firstSelectableVariant?: {
      metafields?: VariantMetafield[] | null;
    } | null;
  },
>(values: T[]): T[] {
  const legacyOrder = Object.keys(FRAMED_PICTURE_SIZES);

  return [...values].sort((a, b) => {
    const rankA =
      getVariantSizeRank(a.firstSelectableVariant) ??
      legacyOrder.indexOf(resolveNamedFramedPictureSize(a.name) ?? '');
    const rankB =
      getVariantSizeRank(b.firstSelectableVariant) ??
      legacyOrder.indexOf(resolveNamedFramedPictureSize(b.name) ?? '');

    if (rankA !== rankB) {
      const aValid = rankA >= 0;
      const bValid = rankB >= 0;
      if (aValid && bValid) return rankA - rankB;
      if (aValid) return -1;
      if (bValid) return 1;
    }

    return a.name.localeCompare(b.name);
  });
}
