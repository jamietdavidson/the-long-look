import {useLayoutEffect, useState, type RefObject} from 'react';
import {flushSync} from 'react-dom';

export type ContainerSize = {
  width: number;
  height: number;
};

function readContainerSize(element: HTMLElement): ContainerSize | null {
  const {width, height} = element.getBoundingClientRect();
  if (width <= 0 || height <= 0) return null;
  return {width, height};
}

function sizesEqual(
  a: ContainerSize | null,
  b: ContainerSize | null,
) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  );
}

/**
 * Tracks an element's content box with layout-synchronous resize updates.
 * ResizeObserver callbacks flush React state before paint so measured caps
 * and @container children stay in sync during window resizes.
 */
export function useContainerSize(
  ref: RefObject<HTMLElement | null>,
): ContainerSize | null {
  const [size, setSize] = useState<ContainerSize | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const commitSize = (next: ContainerSize) => {
      setSize((previous) => (sizesEqual(previous, next) ? previous : next));
    };

    const measure = () => {
      const next = readContainerSize(element);
      if (next) commitSize(next);
      return next;
    };

    measure();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const next = entry
        ? {
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          }
        : readContainerSize(element);

      if (!next || next.width <= 0 || next.height <= 0) return;

      flushSync(() => {
        commitSize(next);
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

/**
 * True once the container has a non-zero measured size.
 * Use when children scale purely via @container CSS (catalog grid wells).
 */
export function useContainerReady(
  ref: RefObject<HTMLElement | null>,
): boolean {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const markReady = () => {
      const next = readContainerSize(element);
      if (next) {
        setReady(true);
      }
    };

    markReady();

    const observer = new ResizeObserver(() => {
      markReady();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return ready;
}
