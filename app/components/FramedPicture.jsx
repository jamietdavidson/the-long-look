import {useState} from 'react';
import {Image} from '@shopify/hydrogen';
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
    matEdges: buildEdgeOverlays(),
    pictureEdges: buildEdgeOverlays({depthScale: 0.18, alphaScale: 0.22}),
  };
}

/**
 * @param {{
 *   top: { depthCqi: number; color: string } | null;
 *   left: { depthCqi: number; color: string } | null;
 * }} edges
 */
function InnerEdgeShadows({edges}) {
  return (
    <>
      {edges.top ? (
        <span
          aria-hidden
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: 2,
            top: 0,
            left: 0,
            right: 0,
            height: `${edges.top.depthCqi}cqi`,
            background: `linear-gradient(to bottom, ${edges.top.color}, transparent)`,
          }}
        />
      ) : null}
      {edges.left ? (
        <span
          aria-hidden
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: 2,
            top: 0,
            left: 0,
            bottom: 0,
            width: `${edges.left.depthCqi}cqi`,
            background: `linear-gradient(to right, ${edges.left.color}, transparent)`,
          }}
        />
      ) : null}
    </>
  );
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

  const junctionBorderCqi = 0.11 * computed.frameCqi;
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
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'fit-content',
          maxWidth: '100%',
          borderWidth: `${computed.frameCqi}cqi`,
          borderStyle: 'solid',
          borderColor: computed.colors.frameBorder,
          backgroundColor: computed.colors.frameFace,
          boxShadow: shadows.frame,
          ...(interactive
            ? {
                transform: hovered ? 'translateY(-0.25rem)' : undefined,
                willChange: 'transform',
                transition: 'transform 300ms ease-out',
              }
            : {}),
        }}
      >
        <div
          style={{
            width: 'fit-content',
            lineHeight: 1,
            borderWidth: `${junctionBorderCqi}cqi`,
            borderStyle: 'solid',
            borderColor: computed.colors.frameMatJunction,
          }}
        >
          <div
            style={{
              position: 'relative',
              isolation: 'isolate',
              lineHeight: 1,
              padding: `${computed.paddingCqi}cqi`,
              backgroundColor: computed.colors.matFace,
            }}
          >
            <InnerEdgeShadows edges={shadows.matEdges} />
            <div
              style={{
                position: 'relative',
                lineHeight: 1,
                borderWidth: `${junctionBorderCqi}cqi`,
                borderStyle: 'solid',
                borderColor: computed.colors.matPictureJunction,
              }}
            >
              <InnerEdgeShadows edges={shadows.pictureEdges} />
              {image?.url ? (
                <div
                  style={{
                    position: 'relative',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    width: `${computed.pictureWidthCqi}cqi`,
                    aspectRatio: computed.pictureAspect,
                  }}
                >
                  <Image
                    alt={image.altText || alt}
                    data={image}
                    loading={loading}
                    sizes={sizes}
                    className="[&_img]:block [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'block',
                      height: '100%',
                      width: '100%',
                    }}
                  />
                </div>
              ) : (
                <div
                  aria-hidden
                  style={{
                    maxWidth: '100%',
                    backgroundColor: '#f5f5f5',
                    width: `${computed.pictureWidthCqi}cqi`,
                    aspectRatio: computed.pictureAspect,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
