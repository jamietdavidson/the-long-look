import {Link, useSearchParams} from 'react-router';
import {useId, useMemo} from 'react';
import {ChevronDown} from 'lucide-react';
import {PRINT_FILTER_PARAMS} from '~/lib/print-filters';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

const FILTER_GROUPS = [
  {key: PRINT_FILTER_PARAMS.artist, title: 'Artist'},
  {key: PRINT_FILTER_PARAMS.color, title: 'Color'},
  {key: PRINT_FILTER_PARAMS.location, title: 'Photo Location'},
  {key: PRINT_FILTER_PARAMS.theme, title: 'Theme'},
  {key: PRINT_FILTER_PARAMS.orientation, title: 'Orientation'},
];

/**
 * @param {URLSearchParams} searchParams
 * @param {string} param
 * @param {string} value
 */
function buildFilterToggleHref(searchParams, param, value) {
  const next = new URLSearchParams(searchParams);
  const values = next.getAll(param);
  next.delete(param);

  if (values.includes(value)) {
    for (const entry of values) {
      if (entry !== value) next.append(param, entry);
    }
  } else {
    for (const entry of values) {
      next.append(param, entry);
    }
    next.append(param, value);
  }

  const query = next.toString();
  return query ? `?${query}` : '.';
}

/**
 * @param {URLSearchParams} searchParams
 */
function buildClearFiltersHref(searchParams) {
  const next = new URLSearchParams();
  const query = searchParams.get('q');
  if (query) next.set('q', query);
  const serialized = next.toString();
  return serialized ? `?${serialized}` : '.';
}

/**
 * @param {{
 *   activeFilters: import('~/lib/print-filters').PrintFilters;
 *   listId?: string;
 *   className?: string;
 *   onNavigate?: () => void;
 * }}
 */
export function SearchFiltersHeader({
  activeFilters,
  listId,
  className,
  onNavigate,
}) {
  const [searchParams] = useSearchParams();

  const activeCount = useMemo(
    () => Object.values(activeFilters).reduce((sum, values) => sum + values.length, 0),
    [activeFilters],
  );

  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-4',
        className,
      )}
    >
      <h2
        id={listId}
        className={cn(type.overline.sm, 'text-neutral-900')}
      >
        Filters
      </h2>
      {activeCount > 0 ? (
        <Link
          to={buildClearFiltersHref(searchParams)}
          prefetch="intent"
          onClick={onNavigate}
          className={cn(type.micro, 'uppercase tracking-overline font-medium text-neutral-400 transition-colors hover:text-neutral-700')}
        >
          Clear all
        </Link>
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   facets: import('~/lib/print-filters').PrintFilterFacets;
 *   activeFilters: import('~/lib/print-filters').PrintFilters;
 *   term: string;
 *   className?: string;
 *   headerClassName?: string;
 *   listId?: string;
 *   renderHeader?: boolean;
 *   onNavigate?: () => void;
 * }}
 */
export function SearchFilters({
  facets,
  activeFilters,
  className,
  headerClassName,
  listId: listIdProp,
  renderHeader = true,
  onNavigate,
}) {
  const generatedListId = useId();
  const listId = listIdProp ?? generatedListId;
  const [searchParams] = useSearchParams();

  return (
    <div className={cn('flex flex-col', className)}>
      {renderHeader ? (
        <SearchFiltersHeader
          activeFilters={activeFilters}
          listId={listId}
          className={cn('border-b border-neutral-100', headerClassName)}
          onNavigate={onNavigate}
        />
      ) : null}

      <div
        aria-labelledby={renderHeader || listIdProp ? listId : undefined}
        aria-label={!renderHeader && !listIdProp ? 'Filters' : undefined}
        className="relative z-0 divide-y divide-neutral-100 max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto"
      >
        {FILTER_GROUPS.map((group) => (
          <FilterGroup
            key={group.key}
            title={group.title}
            param={group.key}
            options={facets[group.key]}
            activeValues={activeFilters[group.key]}
            searchParams={searchParams}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   title: string;
 *   param: string;
 *   options: import('~/lib/print-filters').PrintFilterFacetOption[];
 *   activeValues: string[];
 *   searchParams: URLSearchParams;
 *   onNavigate?: () => void;
 * }}
 */
function FilterGroup({
  title,
  param,
  options,
  activeValues,
  searchParams,
  onNavigate,
}) {
  if (!options.length) return null;

  return (
    <details className="group px-5 py-4" defaultOpen>
      <summary className={cn(type.overline.xs, 'flex cursor-pointer list-none items-center justify-between text-neutral-900 [&::-webkit-details-marker]:hidden')}>
        {title}
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className="text-neutral-400 transition-transform group-open:rotate-180"
        />
      </summary>

      <ul className="mt-4 space-y-2.5">
        {options.map((option) => {
          const checked = activeValues.includes(option.value);

          return (
            <li key={option.value}>
              <Link
                to={buildFilterToggleHref(searchParams, param, option.value)}
                prefetch="intent"
                onClick={onNavigate}
                className={cn(
                  type.body.lg,
                  'flex items-center gap-3 transition-colors',
                  checked ? 'text-neutral-900' : 'text-neutral-700 hover:text-neutral-900',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-3.5 items-center justify-center rounded-sm border',
                    checked
                      ? 'border-neutral-900 bg-neutral-900'
                      : 'border-neutral-300 bg-white',
                  )}
                >
                  {checked ? (
                    <span className="block size-1.5 rounded-[1px] bg-white" />
                  ) : null}
                </span>
                <span className="flex-1">{option.label}</span>
                <span className={cn(type.body.sm, 'tabular-nums text-neutral-400')}>
                  {option.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
