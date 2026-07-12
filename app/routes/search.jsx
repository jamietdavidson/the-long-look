import {useId} from 'react';
import {useLoaderData, useSearchParams} from 'react-router';
import {Analytics} from '@shopify/hydrogen';
import {ChevronDown, Search} from 'lucide-react';
import {useState} from 'react';
import {SearchForm} from '~/components/SearchForm';
import {SearchFilters, SearchFiltersHeader} from '~/components/SearchFilters';
import {
  ProductGrid,
  printCatalogGridProps,
  printGridThreeColumnClassName,
} from '~/components/ProductGrid';
import {Input} from '~/components/ui/input';
import {
  loadAllPrintProducts,
  loadArtistIndex,
  productToFilterSource,
  productsToPrintCards,
} from '~/lib/print-catalog';
import {
  buildPrintFilterFacets,
  getPrintFilterAttrs,
  hasActivePrintFilters,
  matchesPrintFilters,
  parsePrintFilters,
  printMatchesSearchTerm,
} from '~/lib/print-filters';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  const term = data?.term;
  const hasFilters = data?.hasFilters;

  if (term) {
    return [{title: `Search results for "${term}" | The Long Look`}];
  }

  if (hasFilters) {
    return [{title: 'Filtered Prints | The Long Look'}];
  }

  return [{title: 'Search | The Long Look'}];
};

/** @type {import('~/components/AppPageLayout').AppRouteHandle} */
export const handle = {
  compensateForTopbar: true,
  topbar: {autohide: false},
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const filters = parsePrintFilters(url.searchParams);

  const [products, artists] = await Promise.all([
    loadAllPrintProducts(context.storefront).catch(() => []),
    loadArtistIndex(context.storefront).catch(() => []),
  ]);

  const entries = products.map((product) => ({
    product,
    source: productToFilterSource(product, artists),
  }));
  const filteredProducts = entries
    .filter(({source}) => {
      const attrs = getPrintFilterAttrs(source);
      return (
        printMatchesSearchTerm(source, term) &&
        matchesPrintFilters(attrs, filters)
      );
    })
    .map((entry) => entry.product);
  const facets = buildPrintFilterFacets(
    entries.map((entry) => entry.source),
    filters,
    term,
  );

  return {
    term,
    filters,
    facets,
    prints: productsToPrintCards(filteredProducts, artists),
    total: filteredProducts.length,
    hasFilters: hasActivePrintFilters(filters),
  };
}

export default function SearchPage() {
  /** @type {LoaderReturnData} */
  const {term, filters, facets, prints, total, hasFilters} = useLoaderData();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const filtersListId = useId();

  const showEmptyCatalog = total === 0 && !term && !hasFilters;
  const activeFilterCount = Object.values(filters).reduce(
    (sum, values) => sum + values.length,
    0,
  );

  return (
    <div className="search-page-chrome min-h-full">
      <h1 className="sr-only">Search</h1>

      <div className="sticky top-[var(--header-height)] z-20 bg-white">
        <SearchForm className="border-b border-neutral-100">
          {({inputRef}) => (
            <>
              {Object.entries(filters).map(([param, values]) =>
                values.map((value) => (
                  <input key={`${param}-${value}`} type="hidden" name={param} value={value} />
                )),
              )}
              <div className="relative">
                <Search
                  size={18}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-neutral-400 md:left-6"
                  aria-hidden
                />
                <Input
                  ref={inputRef}
                  defaultValue={term}
                  name="q"
                  placeholder="Search prints, artists, locations…"
                  type="search"
                  className={cn(type.body.xl, 'h-12 w-full rounded-none border-0 border-neutral-100 bg-white pr-5 pl-10 shadow-none focus-visible:ring-0 md:pr-8 md:pl-12')}
                />
              </div>
            </>
          )}
        </SearchForm>

        <div className="hidden border-b border-neutral-100 lg:flex">
          <div className="w-72 shrink-0 border-r border-neutral-100">
            <SearchFiltersHeader
              activeFilters={filters}
              listId={filtersListId}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
            <div>
              <p className={cn(type.nav, 'text-neutral-900')}>
                {total} print{total === 1 ? '' : 's'}
              </p>
              {term ? (
                <p className={cn(type.body.lg, 'mt-1 text-neutral-500')}>
                  Results for &ldquo;{term}&rdquo;
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[50vh] items-start">
        {mobileFiltersOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/10 lg:hidden"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
          />
        ) : null}

        <aside className="search-filters-aside hidden w-72 shrink-0 border-r border-neutral-100 bg-white lg:block">
          <SearchFilters
            facets={facets}
            activeFilters={filters}
            term={term}
            listId={filtersListId}
            renderHeader={false}
            onNavigate={() => setMobileFiltersOpen(false)}
          />
        </aside>

        <div className="min-w-0 flex-1 pb-[var(--search-mobile-bar-height)] lg:pb-0">
          {showEmptyCatalog ? (
            <SearchEmptyState message="No prints published yet." />
          ) : total === 0 ? (
            <SearchEmptyState
              message={
                term
                  ? `No prints match "${term}" with the selected filters.`
                  : 'No prints match the selected filters.'
              }
              actionLabel="Clear filters"
              onAction={() => {
                const params = new URLSearchParams();
                if (term) params.set('q', term);
                setSearchParams(params, {preventScrollReset: true});
              }}
            />
          ) : (
            <div className="lg:pb-16">
              <ProductGrid
                products={prints}
                {...printCatalogGridProps}
                gridClassName={cn(printGridThreeColumnClassName, 'lg:grid-cols-2 xl:grid-cols-3')}
                eagerCount={6}
              />
            </div>
          )}
        </div>
      </div>

      {term && total > 0 ? (
        <Analytics.SearchView
          data={{
            searchTerm: term,
            searchResults: {total, prints: prints.length},
          }}
        />
      ) : null}

      <div className="search-mobile-shell fixed inset-x-0 bottom-0 z-30 flex flex-col lg:hidden">
        <aside
          aria-hidden={!mobileFiltersOpen}
          className={cn(
            'grid overflow-hidden border-t border-neutral-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.08)] transition-[max-height] duration-300 ease-out',
            'grid-rows-[auto_minmax(0,1fr)]',
            mobileFiltersOpen
              ? 'max-h-[66dvh]'
              : 'pointer-events-none max-h-0 border-t-0 shadow-none',
          )}
        >
          <div className="shrink-0 border-b border-neutral-100">
            <SearchFiltersHeader
              activeFilters={filters}
              listId={filtersListId}
              onNavigate={() => setMobileFiltersOpen(false)}
            />
          </div>
          <SearchFilters
            className="min-h-0 overflow-hidden"
            facets={facets}
            activeFilters={filters}
            term={term}
            listId={filtersListId}
            renderHeader={false}
            constrainHeight
            onNavigate={() => setMobileFiltersOpen(false)}
          />
        </aside>

        <div className="flex shrink-0 items-center justify-between border-t border-neutral-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className={cn(type.nav, 'text-neutral-900')}>
              {total} print{total === 1 ? '' : 's'}
            </p>
            {term ? (
              <p className={cn(type.body.sm, 'mt-0.5 truncate text-neutral-500')}>
                &ldquo;{term}&rdquo;
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={cn(
              type.nav,
              'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-neutral-900 underline-offset-4 hover:underline',
            )}
            onClick={() => setMobileFiltersOpen((open) => !open)}
            aria-expanded={mobileFiltersOpen}
          >
            Filters
            {activeFilterCount > 0 ? (
              <span className="text-neutral-500"> ({activeFilterCount})</span>
            ) : null}
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className={cn(
                'shrink-0 transition-transform duration-300 ease-out',
                mobileFiltersOpen ? 'rotate-0' : 'rotate-180',
              )}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   message: string;
 *   actionLabel?: string;
 *   onAction?: () => void;
 * }}
 */
function SearchEmptyState({message, actionLabel, onAction}) {
  return (
    <div className="px-6 py-20 text-center">
      <p className={cn(type.body.lg, 'text-neutral-500')}>{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(type.overline.xs, 'mt-4 text-neutral-900 underline-offset-4 hover:underline')}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

/** @typedef {import('./+types/search').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
