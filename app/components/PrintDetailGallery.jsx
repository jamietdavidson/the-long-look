import {useEffect, useMemo, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {FramedPicture} from '~/components/FramedPicture';
import {
  FRAMED_PICTURE_IMAGE_SIZES,
  FramedPictureWall,
} from '~/components/FramedPictureWall';
import {
  getDetailFitMaxWidthCqi,
  getFramedSizeFromVariant,
  resolveNamedSizeFromSpec,
} from '~/lib/framed-picture';
import {cn} from '~/lib/utils';

/**
 * @typedef {{
 *   key: string;
 *   label: string;
 *   spec: import('~/lib/framed-picture').FramedPictureSizeSpec;
 * }} PrintDetailGallerySlide
 */

/**
 * @param {import('~/lib/framed-picture').FramedPictureSizeSpec} framedSpec
 * @returns {PrintDetailGallerySlide[]}
 */
function buildGallerySlides(framedSpec) {
  return [
    {
      key: 'framed',
      label: 'Framed preview',
      spec: framedSpec,
    },
    {
      key: 'artwork',
      label: 'Artwork',
      spec: {
        ...framedSpec,
        frame: 0,
        padding: 0,
      },
    },
  ];
}

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
 *   framedSpec: import('~/lib/framed-picture').FramedPictureSizeSpec;
 *   namedSize?: import('~/lib/framed-picture').FramedPictureNamedSize;
 *   selectedVariant?: import('storefrontapi.generated').ProductFragment['selectedOrFirstAvailableVariant'];
 * }}
 */
export function PrintDetailGallery({
  image,
  alt,
  framedSpec,
  namedSize,
  selectedVariant,
}) {
  const containerRef = useRef(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [fitMaxWidthCqi, setFitMaxWidthCqi] = useState(undefined);

  const resolvedNamedSize =
    namedSize ??
    resolveNamedSizeFromSpec(framedSpec) ??
    (selectedVariant ? getFramedSizeFromVariant(selectedVariant) : undefined);

  const slides = useMemo(() => buildGallerySlides(framedSpec), [framedSpec]);
  const activeSlide = slides[slideIndex] ?? slides[0];
  const hasMultipleSlides = slides.length > 1;

  useEffect(() => {
    setSlideIndex(0);
  }, [framedSpec.shortSide, framedSpec.longSide, framedSpec.frame, framedSpec.padding]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateFit = () => {
      const {width, height} = element.getBoundingClientRect();
      setFitMaxWidthCqi(
        getDetailFitMaxWidthCqi(
          activeSlide.spec,
          resolvedNamedSize,
          width,
          height,
        ),
      );
    };

    updateFit();

    const observer = new ResizeObserver(updateFit);
    observer.observe(element);

    return () => observer.disconnect();
  }, [activeSlide.spec, resolvedNamedSize]);

  const goToPrevious = () => {
    setSlideIndex((index) => (index === 0 ? slides.length - 1 : index - 1));
  };

  const goToNext = () => {
    setSlideIndex((index) => (index === slides.length - 1 ? 0 : index + 1));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full shrink-0 md:sticky md:top-0 md:h-screen md:w-1/2"
    >
      <FramedPictureWall
        variant="detail"
        className="h-full min-h-[70vh] md:h-full! md:w-full!"
      >
        <FramedPicture
          key={activeSlide.key}
          image={image}
          alt={alt}
          size={activeSlide.spec}
          loading="eager"
          sizes={FRAMED_PICTURE_IMAGE_SIZES.detail}
          maxWidthCqi={fitMaxWidthCqi}
          interactive={false}
        />
      </FramedPictureWall>

      {hasMultipleSlides ? (
        <>
          <GalleryNavButton
            direction="left"
            label="Previous image"
            onClick={goToPrevious}
          />
          <GalleryNavButton
            direction="right"
            label="Next image"
            onClick={goToNext}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   direction: 'left' | 'right';
 *   label: string;
 *   onClick: () => void;
 * }}
 */
function GalleryNavButton({direction, label, onClick}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 z-10 -translate-y-1/2 p-2 text-neutral-500 transition-colors hover:text-neutral-900',
        direction === 'left' ? 'left-4' : 'right-4',
      )}
    >
      <Icon className="size-8" strokeWidth={1.5} />
    </button>
  );
}
