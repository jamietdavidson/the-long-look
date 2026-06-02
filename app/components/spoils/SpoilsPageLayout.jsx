import {Suspense} from 'react';
import {Await} from 'react-router';
import {Aside} from '~/components/Aside';
import {SpoilsHeader} from '~/components/spoils/SpoilsHeader';
import {SpoilsFooter} from '~/components/spoils/SpoilsFooter';
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
export function SpoilsPageLayout({cart, children = null}) {
  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <SearchAside />
      <SpoilsHeader cart={cart} />
      <main className="flex-1">{children}</main>
      <SpoilsFooter />
    </Aside.Provider>
  );
}

/** @deprecated Use SpoilsPageLayout */
export const PageLayout = SpoilsPageLayout;

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
