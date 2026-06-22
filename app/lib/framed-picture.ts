export type FrameColor = 'white' | 'black';
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
  shadows: {
    frame: string;
    frameHover: string;
    matTop: string;
    matLeft: string;
    matTopHover: string;
    matLeftHover: string;
  };
};

/** Fixed mat and frame width in inches — same physical moulding at every tier. */
const STANDARD_MAT_INCHES = 1.25;
const STANDARD_FRAME_INCHES = 0.625;

/**
 * Grid equal-area constants from the legacy print grid CSS
 * (width = sqrt(k × aspect) × 100cqi; area = k × (100cqi)²).
 */
const GRID_EQUAL_AREA_K = 0.42;
const GRID_EQUAL_FRAME_CQI = 1.2;
const GRID_EQUAL_MAT_CQI = 4;

/**
 * Named print sizes. Inch values define proportions only; the parent
 * @container (FramedPictureWall) controls how large the frame renders on screen.
 */
export const FRAMED_PICTURE_SIZES = {
  small: {
    shortSide: 8,
    longSide: 10,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
  medium: {
    shortSide: 11,
    longSide: 14,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
  large: {
    shortSide: 16,
    longSide: 20,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
  giant: {
    shortSide: 24,
    longSide: 30,
    padding: STANDARD_MAT_INCHES,
    frame: STANDARD_FRAME_INCHES,
    frameColor: 'black',
  },
  collector: {
    shortSide: 30,
    longSide: 40,
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

export const FRAMED_PICTURE_SIZE_LABELS: Record<FramedPictureNamedSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  giant: 'Giant',
  collector: 'Collector',
  exhibition: 'Exhibition',
};

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
  return `${width}" × ${height}"`;
}

function buildShadows(frameCqi: number, intensity: number) {
  const f = frameCqi;

  return {
    frame: [
      `${0.5 * f}cqi ${0.75 * f}cqi ${1 * f}cqi rgba(0,0,0,${0.14 * intensity})`,
      `${1.25 * f}cqi ${2.5 * f}cqi ${3.3 * f}cqi rgba(0,0,0,${0.12 * intensity})`,
      `${2 * f}cqi ${4 * f}cqi ${5.5 * f}cqi rgba(0,0,0,${0.08 * intensity})`,
    ].join(', '),
    frameHover: [
      `${0.75 * f}cqi ${1.25 * f}cqi ${1.5 * f}cqi rgba(0,0,0,${0.16 * intensity})`,
      `${1.75 * f}cqi ${3.5 * f}cqi ${4.5 * f}cqi rgba(0,0,0,${0.14 * intensity})`,
      `${2.5 * f}cqi ${5 * f}cqi ${7 * f}cqi rgba(0,0,0,${0.1 * intensity})`,
    ].join(', '),
    matTop: `${-0.25 * f}cqi ${0.75 * f}cqi ${1 * f}cqi rgba(0,0,0,${0.6 * intensity})`,
    matLeft: `${0.25 * f}cqi 0 ${1 * f}cqi rgba(0,0,0,${0.2 * intensity})`,
    matTopHover: `0 ${0.25 * f}cqi ${1 * f}cqi rgba(0,0,0,${0.26 * intensity})`,
    matLeftHover: `${0.25 * f}cqi 0 ${1 * f}cqi rgba(0,0,0,${0.26 * intensity})`,
  };
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

/** Max outer width as a fraction of the @container inline size. */
const MAX_FRAME_WIDTH_CQI = 92;

function getOuterWidthCqi(
  frameCqi: number,
  paddingCqi: number,
  pictureWidthCqi: number,
) {
  const junctionCqi = 0.11 * frameCqi;
  return (
    pictureWidthCqi + 2 * frameCqi + 2 * paddingCqi + 4 * junctionCqi
  );
}

function fitFramedPictureToContainer(
  dimensions: {
    frameCqi: number;
    paddingCqi: number;
    pictureWidthCqi: number;
  },
  maxWidthCqi = MAX_FRAME_WIDTH_CQI,
) {
  const total = getOuterWidthCqi(
    dimensions.frameCqi,
    dimensions.paddingCqi,
    dimensions.pictureWidthCqi,
  );
  if (total <= maxWidthCqi) return dimensions;

  const scale = maxWidthCqi / total;
  return {
    frameCqi: dimensions.frameCqi * scale,
    paddingCqi: dimensions.paddingCqi * scale,
    pictureWidthCqi: dimensions.pictureWidthCqi * scale,
  };
}

export function computeFramedPictureSize(
  spec: FramedPictureSizeSpec,
  orientation: PictureOrientation,
  options?: {equalizePictureArea?: boolean; imageAspect?: number},
): FramedPictureComputed {
  const {width: pictureWidth, height: pictureHeight} = getPictureDimensions(
    spec,
    orientation,
  );
  const {padding, frame} = spec;
  const frameColor = spec.frameColor ?? 'black';

  const outerWidth = pictureWidth + 2 * padding + 2 * frame;
  const outerHeight = pictureHeight + 2 * padding + 2 * frame;

  let frameCqi = (frame / outerWidth) * 100;
  let paddingCqi = (padding / outerWidth) * 100;
  let pictureWidthCqi = (pictureWidth / outerWidth) * 100;
  let pictureAspect = pictureWidth / pictureHeight;

  if (options?.equalizePictureArea) {
    pictureAspect = options.imageAspect ?? 0.75;
    pictureWidthCqi = Math.sqrt(GRID_EQUAL_AREA_K * pictureAspect) * 100;
    frameCqi = GRID_EQUAL_FRAME_CQI;
    paddingCqi = GRID_EQUAL_MAT_CQI;
  }

  ({frameCqi, paddingCqi, pictureWidthCqi} = fitFramedPictureToContainer({
    frameCqi,
    paddingCqi,
    pictureWidthCqi,
  }));

  const shadowIntensity = frameColor === 'white' ? 1.35 : 1;
  const baseColors =
    frameColor === 'white'
      ? {
          frameBorder: '#e5e5e5',
          frameFace: '#ffffff',
          matFace: '#ffffff',
        }
      : {
          frameBorder: '#3d3d3d',
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
    shadows: buildShadows(frameCqi, shadowIntensity),
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

/** Map a variant label (e.g. `11" x 14"` or `Medium`) to a named print size. */
export function resolveNamedFramedPictureSize(
  label: string | null | undefined,
): FramedPictureNamedSize | undefined {
  if (!label) return undefined;

  const normalized = label.toLowerCase().trim().replace(/\s+/g, ' ');
  const byLabel = (Object.entries(FRAMED_PICTURE_SIZE_LABELS) as Array<
    [FramedPictureNamedSize, string]
  >).find(([, name]) => name.toLowerCase() === normalized);
  if (byLabel) return byLabel[0];

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
    'medium'
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
