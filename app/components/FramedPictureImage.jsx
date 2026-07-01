import {Image} from '@shopify/hydrogen';
import {FramedPictureInnerEdgeShadows} from '~/components/FramedPictureInnerEdgeShadows';

/**
 * @param {{
 *   image: {
 *     id?: string;
 *     url: string;
 *     altText?: string | null;
 *     width?: number | null;
 *     height?: number | null;
 *   } | null;
 *   alt: string;
 *   computed: import('~/lib/framed-picture').FramedPictureComputed;
 *   shadows: {
 *     pictureEdges: {
 *       top: { depthCqi: number; color: string } | null;
 *       left: { depthCqi: number; color: string } | null;
 *     };
 *   };
 *   loading?: 'eager' | 'lazy';
 *   sizes?: string;
 * }}
 */
export function FramedPictureImage({
  image,
  alt,
  computed,
  shadows,
  loading = 'lazy',
  sizes,
}) {
  const junctionBorderCqi = 0.11 * computed.frameCqi;

  return (
    <div
      style={{
        position: 'relative',
        width: 'fit-content',
        lineHeight: 1,
        backgroundColor: computed.colors.matFace,
        borderWidth: `${junctionBorderCqi}cqi`,
        borderStyle: 'solid',
        borderColor: computed.colors.matPictureJunction,
      }}
    >
      <FramedPictureInnerEdgeShadows edges={shadows.pictureEdges} />
      {image?.url ? (
        <div
          style={{
            position: 'relative',
            maxWidth: '100%',
            overflow: 'hidden',
            width: `${computed.pictureWidthCqi}cqi`,
            aspectRatio: computed.pictureAspect,
            backgroundColor: computed.colors.matFace,
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
  );
}
