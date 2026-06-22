import {Suspense} from 'react';
import {Await} from 'react-router';
import {Aside} from '~/components/Aside';
import {OverlayScrollbarsRoot} from '~/components/OverlayScrollbarsRoot';
import {Header} from '~/components/Header';
import {Footer} from '~/components/Footer';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import {Link} from 'react-router';
import {useId} from 'react';

/**
 * @param {{
 *   cart: Promise<import('storefrontapi.generated').CartApiQueryFragment|null>;
 *   children?: import('react').ReactNode;
 * }}
 */
export function PageLayout({cart, children = null}) {
  return (
    <Aside.Provider>
      <div className="flex h-screen flex-col overflow-hidden">
        <CartAside cart={cart} />
        <SearchAside />
        <Header cart={cart} />
        <OverlayScrollbarsRoot className="page-scroll flex-1 min-h-0 overflow-hidden">
          <div className="flex min-h-full flex-col">
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </OverlayScrollbarsRoot>
      </div>
    </Aside.Provider>
  );
}


/** @param {{cart: Promise<import('storefrontapi.generated').CartApiQueryFragment|null>}} */
function CartAside({cart}) {
  return (
    <Aside type="cart" heading="Cart">
      <Suspense fallback={<p className="text-sm text-neutral-500 p-6">Loading cart...</p>}>
        <Await resolve={cart}>{(resolvedCart) => <CartMain cart={resolvedCart} layout="aside" />}</Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  const queriesDatalistId = useId();
  return (
    <Aside type="search" heading="Search">
      <div className="p-4">
        <SearchFormPredictive>
          {({fetchResults, goToSearch, inputRef}) => (
            <>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search"
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
                className="w-full border border-neutral-200 px-4 py-3 text-sm"
              />
              <button onClick={goToSearch} className="mt-2 text-[11px] uppercase tracking-widest">Search</button>
            </>
          )}
        </SearchFormPredictive>
        <SearchResultsPredictive>
          {({items, total, term, state, closeSearch}) => {
            if (state === 'loading' && term.current) return <div>Loading...</div>;
            if (!total) return <SearchResultsPredictive.Empty term={term} />;
            return (
              <>
                <SearchResultsPredictive.Products products={items.products} closeSearch={closeSearch} term={term} />
                {term.current && (
                  <Link onClick={closeSearch} to={`${SEARCH_ENDPOINT}?q=${term.current}`}>
                    View all results for &ldquo;{term.current}&rdquo; →
                  </Link>
                )}
              </>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </Aside>
  );
}
