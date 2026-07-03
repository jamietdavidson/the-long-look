import {Aside, useAside} from '~/components/Aside';
import {RoutedAppPageLayout, useTopbarConfig} from '~/components/AppPageLayout';
import {DeferredCart, useDeferredCart} from '~/components/DeferredCart';
import {OverlayScrollbarsRoot} from '~/components/OverlayScrollbarsRoot';
import {Header} from '~/components/Header';
import {Footer} from '~/components/Footer';
import {CartMain} from '~/components/CartMain';

/**
 * @param {{
 *   cart: Promise<import('storefrontapi.generated').CartApiQueryFragment|null>;
 *   children?: import('react').ReactNode;
 * }}
 */
export function PageLayout({cart, children = null}) {
  const topbar = useTopbarConfig();

  return (
    <Aside.Provider>
      <DeferredCart cart={cart}>
        <div className="flex h-dvh flex-col overflow-hidden">
          <CartAside />
          <Header color={topbar.color} mode={topbar.mode} autohide={topbar.autohide} />
          <OverlayScrollbarsRoot className="page-scroll flex-1 min-h-0 overflow-hidden">
            <div className="flex min-h-full flex-col">
              <main className="flex-1">
                <RoutedAppPageLayout>{children}</RoutedAppPageLayout>
              </main>
              <Footer />
            </div>
          </OverlayScrollbarsRoot>
        </div>
      </DeferredCart>
    </Aside.Provider>
  );
}


function CartAside() {
  const {type} = useAside();
  const {cart, loading} = useDeferredCart();
  const isOpen = type === 'cart';

  return (
    <Aside type="cart" heading="Cart">
      {!isOpen ? null : (
        <CartMain cart={cart} layout="aside" loading={loading} />
      )}
    </Aside>
  );
}
