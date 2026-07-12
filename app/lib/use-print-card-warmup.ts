import {useEffect, useRef} from 'react';
import {cachePrintCatalogCard} from '~/lib/print-product-client-cache';
import type {PrintCatalogCard} from '~/lib/print-catalog';
import {warmPrintDetailFromCard} from '~/lib/warm-print-detail';

/**
 * Preload detail assets when a print grid card enters (or nears) the viewport.
 * Also captures the card's rendered img.currentSrc for instant detail paint.
 */
export function usePrintCardWarmup(product: PrintCatalogCard) {
  const ref = useRef<HTMLElement>(null);
  const imageUrl = product.featuredImage?.url;

  useEffect(() => {
    const element = ref.current;
    if (!element || !imageUrl) return undefined;

    let warmed = false;
    const warm = () => {
      if (warmed) return;
      warmed = true;
      cachePrintCatalogCard(product);
      warmPrintDetailFromCard(product, element);
    };

    if (typeof IntersectionObserver === 'undefined') {
      warm();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          warm();
          observer.disconnect();
        }
      },
      {rootMargin: '300px 0px'},
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [product, imageUrl]);

  return ref;
}
