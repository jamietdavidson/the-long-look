import {useLayoutEffect, useState, type RefObject} from 'react';

export type ContainerSize = {
  width: number;
  height: number;
};

export type UseContainerSizeOptions = {
  /** Best-effort size before the ref is measured. */
  initialSize?: ContainerSize | (() => ContainerSize);
};

function readContentSize(element: HTMLElement): ContainerSize | null {
  const width = element.clientWidth;
  const height = element.clientHeight;
  if (width <= 0 || height <= 0) return null;
  return {width, height};
}

function sizesEqual(a: ContainerSize, b: ContainerSize) {
  return (
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  );
}

function resolveInitialSize(
  options?: UseContainerSizeOptions,
): ContainerSize {
  const initial = options?.initialSize;
  if (typeof initial === 'function') return initial();
  if (initial) return initial;
  return {width: 0, height: 0};
}

/** Tracks an element's content box for compact thumbnails and similar UI. */
export function useContainerSize(
  ref: RefObject<HTMLElement | null>,
  options?: UseContainerSizeOptions,
): ContainerSize {
  const [size, setSize] = useState<ContainerSize>(() =>
    resolveInitialSize(options),
  );

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const commitSize = (next: ContainerSize) => {
      setSize((previous) => (sizesEqual(previous, next) ? previous : next));
    };

    const measure = () => {
      const next = readContentSize(element);
      if (next) commitSize(next);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
