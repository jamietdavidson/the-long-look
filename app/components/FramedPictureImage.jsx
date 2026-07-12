import {useEffect, useState} from 'react';
import {Image} from '@shopify/hydrogen';
import {FramedPictureInnerEdgeShadows} from '~/components/FramedPictureInnerEdgeShadows';
import {
  buildShopifyWidthUrl,
  decodeShopifyImageUrl,
  getPrintDetailImageWidth,
  getPrintGridImageWidth,
  shopifyWidthOnlyLoader,
} from '~/lib/preload-shopify-image';

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
 *   placeholderSrc?: string | null;
 *   priority?: 'grid' | 'detail';
 * }}
 */
export function FramedPictureImage({
  image,
  alt,
  computed,
  shadows,
  loading = 'lazy',
  sizes,
  placeholderSrc = null,
  priority = 'grid',
}) {
  return (
    <>
      {computed.frameCqi > 0 ? (
        <FramedPictureInnerEdgeShadows edges={shadows.pictureEdges} />
      ) : null}
      {image?.url ? (
        priority === 'detail' ? (
          <DetailPictureImage
            image={image}
            alt={alt}
            computed={computed}
            placeholderSrc={placeholderSrc}
          />
        ) : (
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
              key={image.id ?? image.url}
              loader={shopifyWidthOnlyLoader}
              loading={loading}
              sizes={sizes}
              srcSetOptions={{
                intervals: 8,
                startingWidth: 200,
                incrementSize: 200,
                placeholderWidth: 200,
              }}
              draggable={false}
              className="[&_img]:block [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:pointer-events-none [&_img]:select-none"
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'block',
                height: '100%',
                width: '100%',
              }}
            />
          </div>
        )
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
    </>
  );
}

/**
 * Instant base layer (grid URL) + crossfade to detail width after full decode.
 * Avoids progressive top-to-bottom wipe of a large CDN file.
 */
function DetailPictureImage({image, alt, computed, placeholderSrc}) {
  const detailWidth = getPrintDetailImageWidth(image);
  const detailSrc = buildShopifyWidthUrl(
    image.url,
    detailWidth,
    image.width,
  );
  const baseSrc =
    placeholderSrc ||
    buildShopifyWidthUrl(
      image.url,
      getPrintGridImageWidth(image),
      image.width,
    );

  const [upgradeSrc, setUpgradeSrc] = useState(
    () => (baseSrc === detailSrc ? detailSrc : null),
  );

  useEffect(() => {
    setUpgradeSrc(baseSrc === detailSrc ? detailSrc : null);

    if (baseSrc === detailSrc) return undefined;

    let cancelled = false;

    void decodeShopifyImageUrl(detailSrc)
      .then((url) => {
        if (!cancelled) setUpgradeSrc(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [baseSrc, detailSrc]);

  const frameStyle = {
    position: 'relative',
    maxWidth: '100%',
    overflow: 'hidden',
    width: `${computed.pictureWidthCqi}cqi`,
    aspectRatio: computed.pictureAspect,
    backgroundColor: computed.colors.matFace,
  };

  const imgStyle = {
    display: 'block',
    height: '100%',
    width: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  return (
    <div style={frameStyle}>
      <img
        alt={image.altText || alt}
        src={baseSrc}
        decoding="sync"
        fetchPriority="high"
        draggable={false}
        style={{
          ...imgStyle,
          position: 'relative',
          zIndex: 1,
        }}
      />
      {upgradeSrc && upgradeSrc !== baseSrc ? (
        <img
          alt=""
          aria-hidden
          src={upgradeSrc}
          decoding="sync"
          draggable={false}
          style={{
            ...imgStyle,
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            opacity: 1,
            transition: 'opacity 180ms ease',
          }}
        />
      ) : null}
    </div>
  );
}
