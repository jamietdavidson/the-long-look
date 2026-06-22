import {Image} from '@shopify/hydrogen';
import {FRAMED_PICTURE_IMAGE_SIZES} from '~/components/FramedPictureWall';
import {
  computeFramedPictureSize,
  getImageAspectRatio,
  getOrientationFromImage,
  resolveFramedPictureSize,
} from '~/lib/framed-picture';

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
}) {
  const orientation = getOrientationFromImage(image);
  const sizeSpec = resolveFramedPictureSize({size});
  const computed = computeFramedPictureSize(sizeSpec, orientation, {
    equalizePictureArea,
    imageAspect: getImageAspectRatio(image),
  });

  const lipOffsetCqi = 0.5 * computed.frameCqi;
  const lipSizeCqi = 0.25 * computed.frameCqi;
  const junctionBorderCqi = 0.11 * computed.frameCqi;

  const frameMatJunctionStyle = {
    borderWidth: `${junctionBorderCqi}cqi`,
    borderStyle: 'solid',
    borderColor: computed.colors.frameMatJunction,
  };

  const matPictureJunctionStyle = {
    borderWidth: `${junctionBorderCqi}cqi`,
    borderStyle: 'solid',
    borderColor: computed.colors.matPictureJunction,
  };

  const frameStyle = {
    borderWidth: `${computed.frameCqi}cqi`,
    borderStyle: 'solid',
    borderColor: computed.colors.frameBorder,
    backgroundColor: computed.colors.frameFace,
    boxShadow: computed.shadows.frame,
    '--frame-hover-shadow': computed.shadows.frameHover,
    ...(interactive
      ? {transition: 'transform 300ms ease-out, box-shadow 300ms ease-out'}
      : {}),
  };

  const matStyle = {
    padding: `${computed.paddingCqi}cqi`,
    backgroundColor: computed.colors.matFace,
  };

  const matLipTransition =
    'box-shadow 300ms ease-out, opacity 300ms ease-out';

  const matTopLipStyle = {
    top: `calc(-1 * ${lipOffsetCqi}cqi)`,
    left: 0,
    right: 0,
    height: `${lipSizeCqi}cqi`,
    boxShadow: computed.shadows.matTop,
    '--mat-lip-hover-shadow': computed.shadows.matTopHover,
    transition: matLipTransition,
    opacity: interactive ? 0.85 : 1,
  };

  const matLeftLipStyle = {
    top: 0,
    left: 0,
    bottom: 0,
    width: `${lipSizeCqi}cqi`,
    boxShadow: computed.shadows.matLeft,
    '--mat-lip-hover-shadow': computed.shadows.matLeftHover,
    transition: matLipTransition,
    opacity: interactive ? 0.85 : 1,
  };

  const imageWrapStyle = {
    width: `${computed.pictureWidthCqi}cqi`,
    aspectRatio: computed.pictureAspect,
  };

  return (
    <div
      className={[
        'relative mx-auto w-fit max-w-full',
        interactive ? 'group' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'framed-picture-frame relative z-1 w-fit max-w-full',
          interactive
            ? 'transform-gpu will-change-transform group-hover:-translate-y-1 group-hover:[box-shadow:var(--frame-hover-shadow)]'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={frameStyle}
      >
        <div
          className="framed-picture-frame-mat-junction w-fit leading-none"
          style={frameMatJunctionStyle}
        >
          <div className="relative isolate leading-none" style={matStyle}>
            <span
              aria-hidden
              className={[
                'pointer-events-none absolute z-2',
                interactive
                  ? 'group-hover:opacity-100 group-hover:[box-shadow:var(--mat-lip-hover-shadow)]'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={matTopLipStyle}
            />
            <span
              aria-hidden
              className={[
                'pointer-events-none absolute z-2',
                interactive
                  ? 'group-hover:opacity-100 group-hover:[box-shadow:var(--mat-lip-hover-shadow)]'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={matLeftLipStyle}
            />
            <div
              className="framed-picture-mat-picture-junction leading-none"
              style={matPictureJunctionStyle}
            >
              {image?.url ? (
                <div
                  className="relative max-w-full overflow-hidden"
                  style={imageWrapStyle}
                >
                  <Image
                    alt={image.altText || alt}
                    data={image}
                    loading={loading}
                    sizes={sizes}
                    className="relative z-1 block h-full w-full [&_img]:relative [&_img]:z-1 [&_img]:block [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
                  />
                </div>
              ) : (
                <div
                  className="max-w-full bg-neutral-100"
                  style={imageWrapStyle}
                  aria-hidden
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
