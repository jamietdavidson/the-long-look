import {useState} from 'react';
import {FramedPictureBorder} from '~/components/FramedPictureBorder';
import {FramedPictureFrame} from '~/components/FramedPictureFrame';
import {FramedPictureImage} from '~/components/FramedPictureImage';
import {FRAMED_PICTURE_IMAGE_SIZES} from '~/components/FramedPictureWall';
import {
  computeFramedPictureSize,
  getImageAspectRatio,
  getOrientationFromImage,
  resolveFramedPictureSize,
} from '~/lib/framed-picture';

/**
 * @typedef {{
 *   angle: number;
 *   intensity: number;
 *   diffusion: number;
 * }} FramedPictureLighting
 * @description Lighting for framed-picture shadows.
 * `angle` is degrees clockwise from top (0 = overhead, ~310 = top-left window).
 * `intensity` scales shadow strength. `diffusion` scales blur spread.
 */

/** Gallery window light — default direction for wall-hung frames. */
export const FRAMED_PICTURE_LIGHTING_DEFAULT = {
  angle: 310,
  intensity: 1,
  diffusion: 1,
};

/** Even overhead light with a soft falloff. */
export const FRAMED_PICTURE_LIGHTING_OVERHEAD = {
  angle: 0,
  intensity: 0.85,
  diffusion: 1.15,
};

/** Classic top-left window — same direction as the default, slightly crisper. */
export const FRAMED_PICTURE_LIGHTING_WINDOW = {
  angle: 326,
  intensity: 1,
  diffusion: 0.95,
};

/** Low-contrast, heavily diffused light. */
export const FRAMED_PICTURE_LIGHTING_SOFT = {
  angle: 15,
  intensity: 0.65,
  diffusion: 1.7,
};

/** Strong side light with tighter shadows. */
export const FRAMED_PICTURE_LIGHTING_DRAMATIC = {
  angle: 55,
  intensity: 1.45,
  diffusion: 0.7,
};

/**
 * @param {number} frameCqi
 * @param {FramedPictureLighting} lighting
 * @param {{ frameColor?: import('~/lib/framed-picture').FrameColor }} [options]
 */
function buildFramedPictureShadows(
  frameCqi,
  lighting,
  {frameColor = 'black'} = {},
) {
  const f = frameCqi;
  const intensity =
    lighting.intensity * (frameColor === 'white' ? 1.35 : 1);
  const diffusion = lighting.diffusion;
  const rad = (lighting.angle * Math.PI) / 180;
  const shadowX = -Math.sin(rad);
  const shadowY = Math.cos(rad);
  const lightX = Math.sin(rad);
  const lightY = -Math.cos(rad);
  const color = (alpha) => `rgba(0,0,0,${alpha})`;

  const cast = (distance, blur, alpha) =>
    `${shadowX * distance * f}cqi ${shadowY * distance * f}cqi ${blur * f * diffusion}cqi ${color(alpha * intensity)}`;

  const shadowProfile = (weight = 1) => {
    if (weight === 0) return 'none';
    return cast(0.65 * weight, 1, 0.35 * weight);
  };

  /** How strongly each inner edge is shadowed — lit sides stay clear. */
  const edgeIllumination = (edge) => {
    if (edge === 'top') return Math.max(0, -lightY);
    if (edge === 'left') return Math.max(0, -lightX);
    if (edge === 'right') return Math.max(0, lightX);
    return Math.max(0, lightY);
  };

  const buildEdgeOverlay = (
    edge,
    {depthScale = 0.65, alphaScale = 0.35} = {},
  ) => {
    const weight = edgeIllumination(edge);
    if (weight === 0) return null;

    return {
      depthCqi: depthScale * weight * f * diffusion,
      color: color(alphaScale * weight),
    };
  };

  const buildEdgeOverlays = (options = {}) => ({
    top: buildEdgeOverlay('top', options),
    left: buildEdgeOverlay('left', options),
  });

  return {
    frame: shadowProfile(1),
    matEdges: buildEdgeOverlays({alphaScale: 0.44}),
    pictureEdges: buildEdgeOverlays({depthScale: 0.18, alphaScale: 0.28}),
  };
}

/**
 * Renders a framed print. The `size` prop sets proportions only (print, mat, frame
 * in inches as cqi fractions). Visual scale comes from the parent @container.
 *
 * @param {{
 *   image: {
 *     id?: string;
 *     url: string;
 *     altText?: string | null;
 *     width?: number | null;
 *     height?: number | null;
 *   } | null;
 *   alt: string;
 *   size?: import('~/lib/framed-picture').FramedPictureNamedSize | import('~/lib/framed-picture').FramedPictureSizeSpec;
 *   loading?: 'eager' | 'lazy';
 *   sizes?: string;
 *   className?: string;
 *   interactive?: boolean;
 *   equalizePictureArea?: boolean;
 *   lighting?: FramedPictureLighting;
 * }}
 */
export function FramedPicture({
  image,
  alt,
  size = 'medium',
  loading = 'lazy',
  sizes = FRAMED_PICTURE_IMAGE_SIZES.grid,
  className = '',
  interactive = true,
  equalizePictureArea = false,
  lighting = FRAMED_PICTURE_LIGHTING_DEFAULT,
}) {
  const [hovered, setHovered] = useState(false);

  const orientation = getOrientationFromImage(image);
  const sizeSpec = resolveFramedPictureSize({size});
  const computed = computeFramedPictureSize(sizeSpec, orientation, {
    equalizePictureArea,
    imageAspect: getImageAspectRatio(image),
  });

  const shadows = buildFramedPictureShadows(computed.frameCqi, lighting, {
    frameColor: computed.frameColor,
  });

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        marginLeft: 'auto',
        marginRight: 'auto',
        width: 'fit-content',
        maxWidth: '100%',
      }}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
    >
      <FramedPictureFrame
        computed={computed}
        shadows={shadows}
        interactive={interactive}
        hovered={hovered}
      >
        <FramedPictureBorder computed={computed} shadows={shadows}>
          <FramedPictureImage
            image={image}
            alt={alt}
            computed={computed}
            shadows={shadows}
            loading={loading}
            sizes={sizes}
          />
        </FramedPictureBorder>
      </FramedPictureFrame>
    </div>
  );
}
