import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';
import {useOverlayScrollbars} from 'overlayscrollbars-react';
import {
  registerPageScrollTarget,
  syncPageScroll,
  unregisterPageScrollTarget,
} from '~/lib/page-scroll';

/**
 * @param {{
 *   children?: import('react').ReactNode;
 *   className?: string;
 * }}
 */
export function OverlayScrollbarsRoot({children, className = ''}) {
  const rootRef = useRef(null);
  const location = useLocation();
  const [initialize, instance] = useOverlayScrollbars({
    options: {
      scrollbars: {
        theme: 'os-theme-dark',
        autoHide: 'scroll',
        autoHideDelay: 800,
      },
      overflow: {
        x: 'hidden',
        y: 'scroll',
      },
    },
    events: {
      initialized: (osInstance) => {
        const viewport = osInstance?.elements()?.viewport ?? instance()?.elements()?.viewport;

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
    },
  });

  useEffect(() => {
    const element = rootRef.current;

    if (!element) {
      return undefined;
    }

    initialize(element);

    const registerViewport = () => {
      const viewport =
        instance()?.elements()?.viewport ??
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
  }, [initialize, instance]);

  useEffect(() => {
    const viewport = instance()?.elements()?.viewport;
    viewport?.scrollTo({top: 0, left: 0});
  }, [location.pathname, instance]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
