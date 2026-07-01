import {useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
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

const SWIPE_CONFIDENCE_THRESHOLD = 8000;

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

/** @param {number} offset @param {number} velocity */
function swipePower(offset, velocity) {
  return Math.abs(offset) * velocity;
}

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0.5,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0.5,
  }),
};

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
  const [direction, setDirection] = useState(0);
  const [containerSize, setContainerSize] = useState(
    /** @type {{width: number; height: number} | null} */ (null),
  );

  const resolvedNamedSize =
    namedSize ??
    resolveNamedSizeFromSpec(framedSpec) ??
    (selectedVariant ? getFramedSizeFromVariant(selectedVariant) : undefined);

  const slides = useMemo(() => buildGallerySlides(framedSpec), [framedSpec]);
  const activeSlide = slides[slideIndex] ?? slides[0];
  const hasMultipleSlides = slides.length > 1;

  const slideFitWidths = useMemo(() => {
    if (!containerSize) return slides.map(() => undefined);

    return slides.map((slide) =>
      getDetailFitMaxWidthCqi(
        slide.spec,
        resolvedNamedSize,
        containerSize.width,
        containerSize.height,
      ),
    );
  }, [slides, resolvedNamedSize, containerSize]);

  useEffect(() => {
    setSlideIndex(0);
    setDirection(0);
  }, [framedSpec.shortSide, framedSpec.longSide, framedSpec.frame, framedSpec.padding]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const {width, height} = element.getBoundingClientRect();
      setContainerSize({width, height});
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  /** @param {number} step */
  const paginate = (step) => {
    setDirection(step);
    setSlideIndex((index) => {
      const next = index + step;
      if (next < 0) return slides.length - 1;
      if (next >= slides.length) return 0;
      return next;
    });
  };

  /** @param {import('framer-motion').PanInfo} info */
  const handleDragEnd = (_, info) => {
    const swipe = swipePower(info.offset.x, info.velocity.x);

    if (swipe < -SWIPE_CONFIDENCE_THRESHOLD) {
      paginate(1);
      return;
    }

    if (swipe > SWIPE_CONFIDENCE_THRESHOLD) {
      paginate(-1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full shrink-0 min-h-[70vh] md:sticky md:top-0 md:h-screen md:min-h-0 md:w-1/2"
    >
      <FramedPictureWall
        variant="detail"
        className="min-h-[70vh] md:h-full md:min-h-0"
      >
        <div
          className="relative flex min-h-[70vh] w-full items-center justify-center overflow-hidden md:h-full md:min-h-0"
          aria-live="polite"
          aria-label={`Image gallery, ${activeSlide.label}`}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={activeSlide.key}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: {type: 'spring', stiffness: 320, damping: 34},
                opacity: {duration: 0.18},
              }}
              drag={hasMultipleSlides ? 'x' : false}
              dragConstraints={{left: 0, right: 0}}
              dragElastic={0.85}
              dragDirectionLock
              onDragEnd={handleDragEnd}
              onDragStart={(event) => event.preventDefault()}
              className={cn(
                'absolute inset-0 flex items-center justify-center touch-pan-y',
                hasMultipleSlides && 'cursor-grab active:cursor-grabbing',
              )}
            >
              <div className="pointer-events-none select-none [&_*]:pointer-events-none [&_img]:drag-none">
                <FramedPicture
                  image={image}
                  alt={alt}
                  size={activeSlide.spec}
                  loading="eager"
                  sizes={FRAMED_PICTURE_IMAGE_SIZES.detail}
                  maxWidthCqi={slideFitWidths[slideIndex]}
                  interactive={false}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </FramedPictureWall>

      {hasMultipleSlides ? (
        <>
          <GalleryNavButton
            direction="left"
            label="Previous image"
            onClick={() => paginate(-1)}
          />
          <GalleryNavButton
            direction="right"
            label="Next image"
            onClick={() => paginate(1)}
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
        'absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-600 backdrop-blur-sm transition-colors hover:border-neutral-300 hover:bg-white hover:text-neutral-900',
        direction === 'left' ? 'left-4' : 'right-4',
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </button>
  );
}
