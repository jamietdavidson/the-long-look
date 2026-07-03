import {Link, NavLink} from 'react-router';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useOptimisticCart} from '@shopify/hydrogen';
import {motion} from 'framer-motion';
import {Search, ShoppingBag} from 'lucide-react';
import {Sidebar} from '~/components/Sidebar';
import {useAside} from '~/components/Aside';
import {useDeferredCart} from '~/components/DeferredCart';
import {artistsPath, printsPath, searchPath} from '~/lib/paths';
import {getPageScrollTop, subscribePageScroll} from '~/lib/page-scroll';

import {Logo} from '~/components/Logo';
import {cn} from '~/lib/utils';

const SCROLL_TOP_THRESHOLD = 8;
const SCROLL_FADE_DISTANCE = 120;
const SCROLL_DIRECTION_THRESHOLD = 6;
const HIDE_DELAY_MS = 280;
const SHOW_DELAY_MS = 280;
const SURFACE_TRANSITION_MS = 550;

const navLinkClass =
  'cursor-pointer text-[13px] uppercase tracking-[0.2em] transition-colors';

/** @param {import('~/components/AppPageLayout').TopbarColor} color */
function getNavLinkClass(color) {
  return cn(
    navLinkClass,
    color === 'white'
      ? 'text-white hover:text-white/70'
      : 'text-neutral-800 hover:text-neutral-500',
  );
}

/** @param {import('~/components/AppPageLayout').TopbarColor} color */
function getIconClass(color) {
  return color === 'white' ? 'text-white' : 'text-neutral-900';
}

/**
 * @param {{
 *   color: import('~/components/AppPageLayout').TopbarColor;
 *   mode: import('~/components/AppPageLayout').TopbarMode;
 *   backgroundProgress: number;
 * }}
 */
function getHeaderSurfaceStyle({color, mode, backgroundProgress}) {
  if (mode === 'filled') {
    return {
      backgroundColor: color === 'black' ? '#ffffff' : '#000000',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    };
  }

  if (color === 'white') {
    return {
      backgroundColor: 'transparent',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    };
  }

  return {
    backgroundColor: `rgba(255, 255, 255, ${backgroundProgress * 0.92})`,
    backdropFilter: `blur(${backgroundProgress * 10}px)`,
    WebkitBackdropFilter: `blur(${backgroundProgress * 10}px)`,
  };
}

function useHeaderHeightSync(headerRef) {
  useEffect(() => {
    const header = headerRef.current;

    if (!header) {
      return undefined;
    }

    const syncHeight = () => {
      document.documentElement.style.setProperty(
        '--header-height',
        `${header.offsetHeight}px`,
      );
    };

    syncHeight();

    const resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(header);
    window.addEventListener('resize', syncHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [headerRef]);
}

function useShopButtonPosition(spacerRef, shopRef) {
  useEffect(() => {
    const spacer = spacerRef.current;
    const shop = shopRef.current;

    if (!spacer || !shop) {
      return undefined;
    }

    const syncPosition = () => {
      const {top, left, height} = spacer.getBoundingClientRect();
      shop.style.top = `${top}px`;
      shop.style.left = `${left}px`;
      shop.style.height = `${height}px`;
    };

    syncPosition();
    requestAnimationFrame(syncPosition);

    const resizeObserver = new ResizeObserver(syncPosition);
    resizeObserver.observe(spacer);
    resizeObserver.observe(document.documentElement);

    window.addEventListener('resize', syncPosition);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncPosition);
    };
  }, [spacerRef, shopRef]);
}

function useScrollDirectionHeader({
  autohide = true,
  forceVisible = false,
  mode = 'filled',
} = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const [backgroundProgress, setBackgroundProgress] = useState(0);
  const lastScrollY = useRef(0);
  const committedDirection = useRef(/** @type {'up' | 'down' | null} */ (null));
  const visibilityTimer = useRef(null);
  const keepVisible = !autohide || forceVisible;

  useEffect(() => {
    const clearVisibilityTimer = () => {
      if (visibilityTimer.current) {
        clearTimeout(visibilityTimer.current);
        visibilityTimer.current = null;
      }
    };

    const scheduleVisibility = (visible, delay) => {
      clearVisibilityTimer();
      visibilityTimer.current = setTimeout(() => {
        setIsVisible(visible);
        visibilityTimer.current = null;
      }, delay);
    };

    const onScroll = () => {
      const currentScrollY = getPageScrollTop();
      const atTop = currentScrollY <= SCROLL_TOP_THRESHOLD;
      const progress = Math.min(Math.max(currentScrollY / SCROLL_FADE_DISTANCE, 0), 1);
      const delta = currentScrollY - lastScrollY.current;

      if (atTop || committedDirection.current === 'down' || mode === 'filled') {
        const nextProgress = mode === 'filled' ? 1 : 0;
        setBackgroundProgress((current) =>
          current === nextProgress ? current : nextProgress,
        );
      } else if (committedDirection.current === 'up') {
        setBackgroundProgress((current) =>
          current === progress ? current : progress,
        );
      }

      if (keepVisible) {
        lastScrollY.current = currentScrollY;
        return;
      }

      if (atTop) {
        clearVisibilityTimer();
        setIsVisible((current) => (current ? current : true));
        committedDirection.current = null;
        lastScrollY.current = currentScrollY;
        return;
      }

      if (Math.abs(delta) < SCROLL_DIRECTION_THRESHOLD) {
        return;
      }

      const direction = delta > 0 ? 'down' : 'up';

      if (direction === committedDirection.current) {
        lastScrollY.current = currentScrollY;
        return;
      }

      committedDirection.current = direction;

      if (direction === 'down') {
        setBackgroundProgress((current) => (current === 0 ? current : 0));
        scheduleVisibility(false, HIDE_DELAY_MS);
      } else {
        setBackgroundProgress((current) =>
          current === progress ? current : progress,
        );
        scheduleVisibility(true, SHOW_DELAY_MS);
      }

      lastScrollY.current = currentScrollY;
    };

    if (keepVisible) {
      clearVisibilityTimer();
      setIsVisible(true);
    }

    lastScrollY.current = getPageScrollTop();
    onScroll();

    const unsubscribe = subscribePageScroll(onScroll);

    return () => {
      unsubscribe();
      clearVisibilityTimer();
    };
  }, [keepVisible, mode]);

  return {isVisible: keepVisible || isVisible, backgroundProgress};
}

/**
 * Animate topbar surface on mode/color changes; keep scroll-driven updates instant.
 * @param {ReturnType<typeof getHeaderSurfaceStyle>} surfaceStyle
 * @param {import('~/components/AppPageLayout').TopbarColor} color
 * @param {import('~/components/AppPageLayout').TopbarMode} mode
 */
function useAnimatedSurfaceStyle(surfaceStyle, color, mode) {
  const [style, setStyle] = useState(surfaceStyle);
  const [transitioning, setTransitioning] = useState(false);
  const configRef = useRef({color, mode});
  const {
    backgroundColor,
    backdropFilter,
    WebkitBackdropFilter,
  } = surfaceStyle;

  useLayoutEffect(() => {
    const nextStyle = {
      backgroundColor,
      backdropFilter,
      WebkitBackdropFilter,
    };
    const configChanged =
      configRef.current.color !== color || configRef.current.mode !== mode;

    if (configChanged) {
      configRef.current = {color, mode};
      setTransitioning(true);

      const frame = requestAnimationFrame(() => {
        setStyle((current) =>
          stylesEqual(current, nextStyle) ? current : nextStyle,
        );
      });
      const timer = setTimeout(
        () => setTransitioning(false),
        SURFACE_TRANSITION_MS,
      );

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }

    setStyle((current) =>
      stylesEqual(current, nextStyle) ? current : nextStyle,
    );
    return undefined;
  }, [
    backgroundColor,
    backdropFilter,
    WebkitBackdropFilter,
    color,
    mode,
  ]);

  const transition = transitioning
    ? `background-color ${SURFACE_TRANSITION_MS}ms ease-out, backdrop-filter ${SURFACE_TRANSITION_MS}ms ease-out, -webkit-backdrop-filter ${SURFACE_TRANSITION_MS}ms ease-out`
    : 'none';

  return {style, transition};
}

/** @param {ReturnType<typeof getHeaderSurfaceStyle>} a @param {ReturnType<typeof getHeaderSurfaceStyle>} b */
function stylesEqual(a, b) {
  return (
    a.backgroundColor === b.backgroundColor &&
    a.backdropFilter === b.backdropFilter &&
    a.WebkitBackdropFilter === b.WebkitBackdropFilter
  );
}

/**
 * @param {{
 *   color?: import('~/components/AppPageLayout').TopbarColor;
 *   mode?: import('~/components/AppPageLayout').TopbarMode;
 *   autohide?: boolean;
 * }}
 */
export function Header({color = 'black', mode = 'filled', autohide = true}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const shopSpacerRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const shopButtonRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const headerRef = useRef(/** @type {HTMLElement | null} */ (null));
  const {open: openAside} = useAside();
  const {cart: resolvedCart} = useDeferredCart();
  const cart = useOptimisticCart(resolvedCart);
  const {isVisible, backgroundProgress} = useScrollDirectionHeader({
    autohide,
    forceVisible: sidebarOpen,
    mode,
  });
  const navClass = getNavLinkClass(color);
  const iconClass = getIconClass(color);
  const surfaceStyle = getHeaderSurfaceStyle({color, mode, backgroundProgress});
  const {style: animatedSurfaceStyle, transition: surfaceTransition} =
    useAnimatedSurfaceStyle(surfaceStyle, color, mode);
  const showTopbarBorder =
    mode === 'filled' ||
    (mode === 'transparent' && color === 'black' && backgroundProgress > 0);

  useShopButtonPosition(shopSpacerRef, shopButtonRef);
  useHeaderHeightSync(headerRef);

  return (
    <>
      <button
        ref={shopButtonRef}
        type="button"
        className={`fixed z-[60] inline-flex items-center border-0 bg-transparent p-0 transition-opacity duration-[550ms] ease-out ${navClass}`}
        aria-expanded={sidebarOpen}
        aria-haspopup="dialog"
        aria-label={sidebarOpen ? 'Close shop menu' : 'Open shop menu'}
        style={{
          opacity: isVisible || sidebarOpen ? 1 : 0,
          pointerEvents: isVisible || sidebarOpen ? 'auto' : 'none',
        }}
        onClick={() => setSidebarOpen((open) => !open)}
      >
        Shop
      </button>

      <motion.header
        ref={headerRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-40 border-b',
          showTopbarBorder ? 'border-neutral-100' : 'border-transparent',
        )}
        initial={false}
        animate={{opacity: isVisible ? 1 : 0}}
        transition={{duration: 0.55, ease: 'easeOut'}}
        style={{
          pointerEvents: isVisible ? 'auto' : 'none',
          transition: surfaceTransition,
          ...animatedSurfaceStyle,
        }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-5 py-5 md:px-8">
          <div className="flex min-w-0 items-center justify-self-start gap-6">
            <span
              ref={shopSpacerRef}
              className={`invisible pointer-events-none select-none ${navClass}`}
              aria-hidden="true"
            >
              Shop
            </span>
            <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
              <NavLink to={printsPath()} className={navClass}>
                Shop All
              </NavLink>
              <NavLink to={artistsPath()} className={navClass}>
                Artists
              </NavLink>
            </nav>
          </div>

          <Link
            to="/"
            className="col-start-2 row-start-1 justify-self-center text-center"
          >
            <Logo color={color} format="long" />
          </Link>

          <div className="flex min-w-0 items-center justify-end justify-self-end gap-5">
            <NavLink
              to={searchPath()}
              className={cn('cursor-pointer', iconClass)}
              aria-label="Search"
            >
              <Search size={22} strokeWidth={1.5} />
            </NavLink>
            <CartBadge
              count={cart?.totalQuantity ?? 0}
              color={color}
              onClick={() => openAside('cart')}
            />
          </div>
        </div>
      </motion.header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

/** @param {{count: number, color: import('~/components/AppPageLayout').TopbarColor, onClick: () => void}} */
function CartBadge({count, color, onClick}) {
  return (
    <button
      onClick={onClick}
      className={cn('relative cursor-pointer', getIconClass(color))}
      aria-label="Open cart"
    >
      <ShoppingBag size={22} strokeWidth={1.5} />
      {count > 0 && (
        <span
          className={cn(
            'absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px]',
            color === 'white'
              ? 'bg-white text-neutral-900'
              : 'bg-neutral-900 text-white',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
