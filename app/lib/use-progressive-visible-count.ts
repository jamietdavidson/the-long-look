import {useEffect, useRef, useState} from 'react';

type Options = {
  initial?: number;
  step?: number;
  rootMargin?: string;
};

/**
 * Reveal list items in batches as a sentinel nears the viewport.
 */
export function useProgressiveVisibleCount(
  total: number,
  {initial = 12, step = 12, rootMargin = '500px 0px'}: Options = {},
) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(initial, total),
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(Math.min(initial, total));
  }, [total, initial]);

  useEffect(() => {
    if (visibleCount >= total) return undefined;

    const element = sentinelRef.current;
    if (!element) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setVisibleCount(total);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) => Math.min(current + step, total));
        }
      },
      {rootMargin},
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [visibleCount, total, step, rootMargin]);

  return {
    visibleCount,
    sentinelRef,
    hasMore: visibleCount < total,
  };
}
