import {useId} from 'react';
import {useLoaderData, useSearchParams} from 'react-router';
import {Analytics} from '@shopify/hydrogen';
import {Search, SlidersHorizontal} from 'lucide-react';
import {useState} from 'react';
import {SearchForm} from '~/components/SearchForm';
import {SearchFilters, SearchFiltersHeader} from '~/components/SearchFilters';
import {
  ProductGrid,
  printCatalogGridProps,
  printGridThreeColumnClassName,
} from '~/components/ProductGrid';
import {Input} from '~/components/ui/input';
import {loadAllPictures, pictureToCard} from '~/lib/content-api';
import {
  buildPrintFilterFacets,
  filterPictures,
  hasActivePrintFilters,
  parsePrintFilters,
} from '~/lib/print-filters';
import {cn} from '~/lib/utils';

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

  const pictures = await loadAllPictures(context.storefront).catch(() => []);
  const filteredPictures = filterPictures(pictures, filters, term);
  const facets = buildPrintFilterFacets(pictures, filters, term);

  return {
    term,
    filters,
    facets,
    prints: filteredPictures.map(pictureToCard),
    total: filteredPictures.length,
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
    <div className="min-h-full">
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
                  className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-neutral-400 md:left-8"
                  aria-hidden
                />
                <Input
                  ref={inputRef}
                  defaultValue={term}
                  name="q"
                  placeholder="Search prints, artists, locations…"
                  type="search"
                  className="h-12 w-full rounded-none border-0 border-neutral-100 bg-white pr-5 pl-12 text-sm shadow-none focus-visible:ring-0 md:pr-8 md:pl-14"
                />
              </div>
            </>
          )}
        </SearchForm>

        <div className="flex border-b border-neutral-100">
          <div className="hidden w-72 shrink-0 border-r border-neutral-100 lg:block">
            <SearchFiltersHeader
              activeFilters={filters}
              listId={filtersListId}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-900">
                {total} print{total === 1 ? '' : 's'}
              </p>
              {term ? (
                <p className="mt-1 text-[12px] text-neutral-500">
                  Results for &ldquo;{term}&rdquo;
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 border border-neutral-200 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-neutral-700 lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal size={14} strokeWidth={1.5} />
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[50vh] items-start">
        {mobileFiltersOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/10 lg:hidden"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
          />
        ) : null}

        <aside
          className={cn(
            'w-72 shrink-0 border-r border-neutral-100 bg-white lg:z-0',
            'max-lg:fixed max-lg:top-[var(--header-height)] max-lg:bottom-0 max-lg:left-0 max-lg:z-50 max-lg:flex max-lg:flex-col max-lg:transition-transform max-lg:duration-200',
            mobileFiltersOpen ? 'max-lg:translate-x-0' : 'max-lg:pointer-events-none max-lg:-translate-x-full',
            'lg:static lg:translate-x-0',
          )}
        >
          <div className="border-b border-neutral-100 lg:hidden">
            <SearchFiltersHeader
              activeFilters={filters}
              onNavigate={() => setMobileFiltersOpen(false)}
            />
          </div>
          <SearchFilters
            className="max-lg:h-full"
            facets={facets}
            activeFilters={filters}
            term={term}
            listId={filtersListId}
            renderHeader={false}
            onNavigate={() => setMobileFiltersOpen(false)}
          />
        </aside>

        <div className="min-w-0 flex-1">
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
            <div className="pb-16">
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
      <p className="text-[13px] text-neutral-500">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 text-[11px] uppercase tracking-[0.2em] text-neutral-900 underline-offset-4 hover:underline"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

/** @typedef {import('./+types/search').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
