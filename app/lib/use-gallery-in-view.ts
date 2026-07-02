import {useEffect, useRef, useState} from 'react';

/**
 * Gallery visibility for purchase summary dock.
 * Defaults to in-view until measured so the summary card does not flash on load.
 */
export function useGalleryInView(
  ref: React.RefObject<Element | null>,
  amount = 0.15,
) {
  const [inView, setInView] = useState(true);
  const amountRef = useRef(amount);
  amountRef.current = amount;

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const thresholds = Array.from(
      new Set([0, amountRef.current, 0.25, 0.5, 0.75, 1]),
    ).sort((a, b) => a - b);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.intersectionRatio >= amountRef.current);
      },
      {threshold: thresholds},
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}
