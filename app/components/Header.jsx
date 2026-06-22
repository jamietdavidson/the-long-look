import {Link, NavLink} from 'react-router';
import {Suspense, useEffect, useRef, useState} from 'react';
import {Await, useAsyncValue} from 'react-router';
import {useOptimisticCart} from '@shopify/hydrogen';
import {motion} from 'framer-motion';
import {Search, ShoppingBag} from 'lucide-react';
import {Sidebar} from '~/components/Sidebar';
import {useAside} from '~/components/Aside';
import {artistsPath, printsPath} from '~/lib/paths';
import {getPageScrollTop, subscribePageScroll} from '~/lib/page-scroll';

const SCROLL_TOP_THRESHOLD = 8;
const SCROLL_FADE_DISTANCE = 120;
const SCROLL_DIRECTION_THRESHOLD = 6;
const HIDE_DELAY_MS = 280;
const SHOW_DELAY_MS = 280;

const navLinkClass =
  'cursor-pointer text-[12px] uppercase tracking-[0.2em] text-neutral-800 transition-colors hover:text-neutral-500';

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

function useScrollDirectionHeader({forceVisible = false} = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const [backgroundProgress, setBackgroundProgress] = useState(0);
  const lastScrollY = useRef(0);
  const committedDirection = useRef(/** @type {'up' | 'down' | null} */ (null));
  const visibilityTimer = useRef(null);

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

      if (atTop || committedDirection.current === 'down') {
        setBackgroundProgress(0);
      } else if (committedDirection.current === 'up') {
        setBackgroundProgress(progress);
      }

      if (forceVisible) {
        lastScrollY.current = currentScrollY;
        return;
      }

      if (atTop) {
        clearVisibilityTimer();
        setIsVisible(true);
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
        setBackgroundProgress(0);
        scheduleVisibility(false, HIDE_DELAY_MS);
      } else {
        setBackgroundProgress(progress);
        scheduleVisibility(true, SHOW_DELAY_MS);
      }

      lastScrollY.current = currentScrollY;
    };

    if (forceVisible) {
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
  }, [forceVisible]);

  return {isVisible: forceVisible || isVisible, backgroundProgress};
}

/**
 * @param {{cart: Promise<import('storefrontapi.generated').CartApiQueryFragment|null>}}
 */
export function Header({cart}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const shopSpacerRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const shopButtonRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const headerRef = useRef(/** @type {HTMLElement | null} */ (null));
  const {open: openAside} = useAside();
  const {isVisible, backgroundProgress} = useScrollDirectionHeader({forceVisible: sidebarOpen});

  useShopButtonPosition(shopSpacerRef, shopButtonRef);
  useHeaderHeightSync(headerRef);

  return (
    <>
      <button
        ref={shopButtonRef}
        type="button"
        className={`fixed z-[60] inline-flex items-center border-0 bg-transparent p-0 transition-opacity duration-[550ms] ease-out ${navLinkClass}`}
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
        className="fixed top-0 left-0 right-0 z-40 border-b"
        initial={false}
        animate={{opacity: isVisible ? 1 : 0}}
        transition={{duration: 0.55, ease: 'easeOut'}}
        style={{
          pointerEvents: isVisible ? 'auto' : 'none',
          backgroundColor: `rgba(255, 255, 255, ${backgroundProgress * 0.92})`,
          borderColor: `rgba(229, 229, 229, ${backgroundProgress * 0.9})`,
          backdropFilter: `blur(${backgroundProgress * 10}px)`,
          WebkitBackdropFilter: `blur(${backgroundProgress * 10}px)`,
        }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 py-5 md:px-6">
          <div className="flex min-w-0 items-center justify-self-start gap-6">
            <span
              ref={shopSpacerRef}
              className={`invisible pointer-events-none select-none ${navLinkClass}`}
              aria-hidden="true"
            >
              Shop
            </span>
            <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
              <NavLink to={printsPath()} className={navLinkClass}>
                Shop All
              </NavLink>
              <NavLink to={artistsPath()} className={navLinkClass}>
                Artists
              </NavLink>
            </nav>
          </div>

          <Link
            to="/"
            className="col-start-2 row-start-1 justify-self-center text-center"
          >
            <span className="block whitespace-nowrap text-[14px] font-semibold uppercase tracking-[0.3em] text-neutral-900 lg:text-[15px]">
              The Long Look
            </span>
          </Link>

          <div className="flex min-w-0 items-center justify-end justify-self-end gap-5">
            <button
              className="cursor-pointer"
              aria-label="Search"
              onClick={() => openAside('search')}
            >
              <Search size={20} strokeWidth={1.5} />
            </button>
            <Suspense fallback={<CartBadge count={0} onClick={() => openAside('cart')} />}>
              <Await resolve={cart}>
                <CartBanner onClick={() => openAside('cart')} />
              </Await>
            </Suspense>
          </div>
        </div>
      </motion.header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

/** @param {{onClick: () => void}} */
function CartBanner({onClick}) {
  const originalCart = useAsyncValue();
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} onClick={onClick} />;
}

/** @param {{count: number, onClick: () => void}} */
function CartBadge({count, onClick}) {
  return (
    <button onClick={onClick} className="relative cursor-pointer" aria-label="Open cart">
      <ShoppingBag size={20} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neutral-900 text-white text-[9px] rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
