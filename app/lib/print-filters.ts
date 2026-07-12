import {
  getOrientationFromImage,
  type PictureOrientation,
} from '~/lib/framed-picture';

export type PrintFilterSource = {
  title: string;
  description?: string | null;
  artist: {handle: string; name: string};
  image: {
    url?: string | null;
    width?: number | null;
    height?: number | null;
  };
};

export const PRINT_FILTER_PARAMS = {
  artist: 'artist',
  color: 'color',
  location: 'location',
  theme: 'theme',
  orientation: 'orientation',
} as const;

export type PrintFilterParam =
  (typeof PRINT_FILTER_PARAMS)[keyof typeof PRINT_FILTER_PARAMS];

export type PrintFilters = Record<PrintFilterParam, string[]>;

export type PrintFilterAttrs = {
  artistHandle: string;
  artistName: string;
  color: string;
  location: string | null;
  theme: string;
  orientation: PictureOrientation;
};

export type PrintFilterFacetOption = {
  value: string;
  label: string;
  count: number;
};

export type PrintFilterFacets = Record<
  PrintFilterParam,
  PrintFilterFacetOption[]
>;

const EMPTY_FILTERS: PrintFilters = {
  artist: [],
  color: [],
  location: [],
  theme: [],
  orientation: [],
};

/** @param {URLSearchParams} searchParams */
export function parsePrintFilters(searchParams: URLSearchParams): PrintFilters {
  return {
    artist: searchParams.getAll(PRINT_FILTER_PARAMS.artist).filter(Boolean),
    color: searchParams.getAll(PRINT_FILTER_PARAMS.color).filter(Boolean),
    location: searchParams.getAll(PRINT_FILTER_PARAMS.location).filter(Boolean),
    theme: searchParams.getAll(PRINT_FILTER_PARAMS.theme).filter(Boolean),
    orientation: searchParams
      .getAll(PRINT_FILTER_PARAMS.orientation)
      .filter(Boolean),
  };
}

/** @param {PrintFilters} filters */
export function hasActivePrintFilters(filters: PrintFilters) {
  return Object.values(filters).some((values) => values.length > 0);
}

/** @param {PrintFilterSource} source */
export function getPrintFilterAttrs(source: PrintFilterSource): PrintFilterAttrs {
  const title = source.title ?? '';
  const description = source.description ?? '';

  return {
    artistHandle: source.artist.handle,
    artistName: source.artist.name,
    color: inferColor(title, description),
    location: inferLocation(title, description),
    theme: inferTheme(title, description),
    orientation: getOrientationFromImage(source.image),
  };
}

/**
 * @param {PrintFilterSource} source
 * @param {string} term
 */
export function printMatchesSearchTerm(source: PrintFilterSource, term: string) {
  const query = term.trim().toLowerCase();
  if (!query) return true;

  const attrs = getPrintFilterAttrs(source);
  const haystack = [
    source.title,
    source.description,
    source.artist.name,
    attrs.location,
    attrs.theme,
    attrs.color,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

/** @deprecated use printMatchesSearchTerm */
export function pictureMatchesSearchTerm(source: PrintFilterSource, term: string) {
  return printMatchesSearchTerm(source, term);
}

/**
 * @param {PrintFilterAttrs} attrs
 * @param {PrintFilters} filters
 */
export function matchesPrintFilters(attrs: PrintFilterAttrs, filters: PrintFilters) {
  if (filters.artist.length > 0 && !filters.artist.includes(attrs.artistHandle)) {
    return false;
  }

  if (filters.color.length > 0 && !filters.color.includes(attrs.color)) {
    return false;
  }

  if (
    filters.location.length > 0 &&
    (!attrs.location || !filters.location.includes(attrs.location))
  ) {
    return false;
  }

  if (filters.theme.length > 0 && !filters.theme.includes(attrs.theme)) {
    return false;
  }

  if (
    filters.orientation.length > 0 &&
    !filters.orientation.includes(attrs.orientation)
  ) {
    return false;
  }

  return true;
}

/**
 * @param {PrintFilterSource[]} sources
 * @param {PrintFilters} filters
 * @param {string} term
 */
export function filterPrints(
  sources: PrintFilterSource[],
  filters: PrintFilters,
  term = '',
) {
  return sources.filter((source) => {
    const attrs = getPrintFilterAttrs(source);
    return (
      printMatchesSearchTerm(source, term) &&
      matchesPrintFilters(attrs, filters)
    );
  });
}

/** @deprecated use filterPrints */
export function filterPictures(
  sources: PrintFilterSource[],
  filters: PrintFilters,
  term = '',
) {
  return filterPrints(sources, filters, term);
}

/**
 * Facet counts for the current search term, excluding each facet group's own selection.
 * @param {PrintFilterSource[]} sources
 * @param {PrintFilters} activeFilters
 * @param {string} term
 */
export function buildPrintFilterFacets(
  sources: PrintFilterSource[],
  activeFilters: PrintFilters,
  term = '',
): PrintFilterFacets {
  const base = sources.filter((source) => printMatchesSearchTerm(source, term));

  return {
    artist: buildFacetGroup(base, activeFilters, 'artist', (attrs) => ({
      value: attrs.artistHandle,
      label: attrs.artistName,
    })),
    color: buildFacetGroup(base, activeFilters, 'color', (attrs) => ({
      value: attrs.color,
      label: attrs.color,
    })),
    location: buildFacetGroup(base, activeFilters, 'location', (attrs) =>
      attrs.location ? {value: attrs.location, label: attrs.location} : null,
    ),
    theme: buildFacetGroup(base, activeFilters, 'theme', (attrs) => ({
      value: attrs.theme,
      label: attrs.theme,
    })),
    orientation: buildFacetGroup(base, activeFilters, 'orientation', (attrs) => ({
      value: attrs.orientation,
      label: formatOrientationLabel(attrs.orientation),
    })),
  };
}

/**
 * @param {PrintFilterSource[]} sources
 * @param {PrintFilters} activeFilters
 * @param {PrintFilterParam} facetKey
 * @param {(attrs: PrintFilterAttrs) => {value: string; label: string} | null} getOption
 */
function buildFacetGroup(
  sources: PrintFilterSource[],
  activeFilters: PrintFilters,
  facetKey: PrintFilterParam,
  getOption: (attrs: PrintFilterAttrs) => {value: string; label: string} | null,
) {
  const filtersWithoutFacet: PrintFilters = {
    ...activeFilters,
    [facetKey]: [],
  };

  const eligible = sources.filter((source) =>
    matchesPrintFilters(getPrintFilterAttrs(source), filtersWithoutFacet),
  );

  const counts = new Map<string, PrintFilterFacetOption>();

  for (const source of eligible) {
    const option = getOption(getPrintFilterAttrs(source));
    if (!option) continue;

    const existing = counts.get(option.value);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(option.value, {...option, count: 1});
    }
  }

  return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** @param {PictureOrientation} orientation */
function formatOrientationLabel(orientation: PictureOrientation) {
  return orientation === 'horizontal' ? 'Horizontal' : 'Vertical';
}

function inferLocation(title: string, description: string) {
  const commaParts = title.split(',');
  if (commaParts.length >= 2) {
    return commaParts[commaParts.length - 1].trim();
  }

  const text = `${title} ${description}`.toLowerCase();
  if (/\bzion\b/.test(text)) return 'Zion, Utah';
  if (/\bmilan\b/.test(text)) return 'Milan';
  if (/\bdesert\b|\bmesa\b|\bsouthwest\b/.test(text)) return 'American Southwest';
  if (/\bcoast(al)?\b/.test(text)) return 'Coast';

  return null;
}

function inferColor(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  if (
    /\bmonochrome\b/.test(text) ||
    /\bblack and white\b/.test(text) ||
    /\bblack & white\b/.test(text) ||
    /\bgrainy, atmospheric black\b/.test(text)
  ) {
    return 'Monochrome';
  }

  if (
    /\bcolor\b/.test(text) ||
    /\bblue sky\b/.test(text) ||
    /\bgolden\b/.test(text) ||
    /\breddish\b/.test(text) ||
    /\bsun-drenched\b/.test(text)
  ) {
    return 'Color';
  }

  return 'Monochrome';
}

function inferTheme(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  if (/\bdesert\b|\bzion\b|\bmesa\b|\bsandstone\b|\bcanyon\b/.test(text)) {
    return 'Desert';
  }
  if (/\bmilan\b|\burban\b|\bintersection\b|\bstreet\b|\bcity\b/.test(text)) {
    return 'Urban';
  }
  if (/\bcoast(al)?\b|\bbeach\b|\bshore\b/.test(text)) {
    return 'Coastal';
  }
  if (
    /\barchitect|\bruins\b|\btunnel\b|\bstone\b|\bconcrete\b|\bvaulted\b/.test(
      text,
    )
  ) {
    return 'Architecture';
  }
  if (/\bnight\b|\bnocturnal\b|\bheadlight\b/.test(text)) {
    return 'Night';
  }
  if (
    /\bforest\b|\blake\b|\btrees\b|\bmountain\b|\blandscape\b|\bbirds?\b|\bfog\b/.test(
      text,
    )
  ) {
    return 'Landscape';
  }
  if (/\broad\b|\btravel\b|\boverlanding\b/.test(text)) {
    return 'Travel';
  }

  return 'Fine Art';
}

export {EMPTY_FILTERS};
