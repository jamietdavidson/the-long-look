import {useEffect, useMemo, useRef} from 'react';
import {useLocation} from 'react-router';
import {useOverlayScrollbars} from 'overlayscrollbars-react';
import {
  registerPageScrollTarget,
  syncPageScroll,
  unregisterPageScrollTarget,
} from '~/lib/page-scroll';

const OVERLAY_SCROLLBARS_OPTIONS = {
  scrollbars: {
    theme: 'os-theme-dark page-scrollbars',
    autoHide: 'scroll',
    autoHideDelay: 800,
  },
  overflow: {
    x: 'hidden',
    y: 'scroll',
  },
};

/**
 * @param {{
 *   children?: import('react').ReactNode;
 *   className?: string;
 * }}
 */
export function OverlayScrollbarsRoot({children, className = ''}) {
  const rootRef = useRef(null);
  const instanceRef = useRef(/** @type {ReturnType<typeof useOverlayScrollbars>[1]} */ (null));
  const location = useLocation();
  const events = useMemo(
    () => ({
      initialized: (osInstance) => {
        const viewport =
          osInstance?.elements()?.viewport ??
          instanceRef.current()?.elements()?.viewport;

        if (viewport) {
          registerPageScrollTarget(viewport);
        }
      },
      scroll: () => {
        syncPageScroll();
      },
      destroyed: () => {
        unregisterPageScrollTarget();
      },
    }),
    [],
  );
  const [initialize, instance] = useOverlayScrollbars({
    options: OVERLAY_SCROLLBARS_OPTIONS,
    events,
  });
  instanceRef.current = instance;

  useEffect(() => {
    const element = rootRef.current;

    if (!element) {
      return undefined;
    }

    initialize(element);

    const registerViewport = () => {
      const viewport =
        instanceRef.current()?.elements()?.viewport ??
        element.querySelector('[data-overlayscrollbars-viewport]');

      if (viewport instanceof HTMLElement) {
        registerPageScrollTarget(viewport);
      }
    };

    registerViewport();
    const timer = window.setTimeout(registerViewport, 0);

    return () => {
      window.clearTimeout(timer);
      unregisterPageScrollTarget();
    };
  }, [initialize]);

  useEffect(() => {
    const viewport = instanceRef.current()?.elements()?.viewport;
    viewport?.scrollTo({top: 0, left: 0});
  }, [location.pathname]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
