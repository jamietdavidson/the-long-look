import {Link, NavLink} from 'react-router';
import {Suspense, useState} from 'react';
import {Await, useAsyncValue} from 'react-router';
import {useOptimisticCart} from '@shopify/hydrogen';
import {Menu, Search, ShoppingBag} from 'lucide-react';
import {SpoilsSidebar} from '~/components/spoils/SpoilsSidebar';
import {useAside} from '~/components/Aside';
import {artistsPath, printsPath} from '~/lib/paths';

/**
 * @param {{cart: Promise<import('storefrontapi.generated').CartApiQueryFragment|null>}}
 */
export function SpoilsHeader({cart}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {open: openAside} = useAside();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
            <button className="hidden md:block" aria-label="Search" onClick={() => openAside('search')}>
              <Search size={18} strokeWidth={1.5} />
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <NavLink to={printsPath()} className="spoils-nav-link">Shop All</NavLink>
            <NavLink to={artistsPath()} className="spoils-nav-link">Artists</NavLink>
            <Link to="/" className="mx-6">
              <span className="text-[14px] font-semibold uppercase tracking-[0.3em] text-neutral-900">
                The Long Look
              </span>
            </Link>
            <NavLink to="/about" className="spoils-nav-link">About</NavLink>
          </nav>

          <Link to="/" className="lg:hidden absolute left-1/2 -translate-x-1/2">
            <span className="text-[13px] font-semibold uppercase tracking-[0.3em] text-neutral-900">
              The Long Look
            </span>
          </Link>

          <div className="flex items-center gap-5">
            <button className="md:hidden" aria-label="Search" onClick={() => openAside('search')}>
              <Search size={18} strokeWidth={1.5} />
            </button>
            <Suspense fallback={<CartBadge count={0} onClick={() => openAside('cart')} />}>
              <Await resolve={cart}>
                <CartBanner onClick={() => openAside('cart')} />
              </Await>
            </Suspense>
          </div>
        </div>
      </header>

      <SpoilsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
    <button onClick={onClick} className="relative" aria-label="Open cart">
      <ShoppingBag size={18} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neutral-900 text-white text-[9px] rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
