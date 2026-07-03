import type {Picture} from '~/lib/content-model';
import {
  getOrientationFromImage,
  type PictureOrientation,
} from '~/lib/framed-picture';

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

/** @param {PrintFilterAttrs} attrs */
export function getPrintFilterAttrs(picture: Picture): PrintFilterAttrs {
  const title = picture.title ?? '';
  const description = picture.description ?? '';

  return {
    artistHandle: picture.artist.handle,
    artistName: picture.artist.name,
    color: inferColor(title, description),
    location: inferLocation(title, description),
    theme: inferTheme(title, description),
    orientation: getOrientationFromImage(picture.image),
  };
}

/**
 * @param {Picture} picture
 * @param {string} term
 */
export function pictureMatchesSearchTerm(picture: Picture, term: string) {
  const query = term.trim().toLowerCase();
  if (!query) return true;

  const attrs = getPrintFilterAttrs(picture);
  const haystack = [
    picture.title,
    picture.description,
    picture.artist.name,
    attrs.location,
    attrs.theme,
    attrs.color,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
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
 * @param {Picture[]} pictures
 * @param {PrintFilters} filters
 * @param {string} term
 */
export function filterPictures(
  pictures: Picture[],
  filters: PrintFilters,
  term = '',
) {
  return pictures.filter((picture) => {
    const attrs = getPrintFilterAttrs(picture);
    return (
      pictureMatchesSearchTerm(picture, term) &&
      matchesPrintFilters(attrs, filters)
    );
  });
}

/**
 * Facet counts for the current search term, excluding each facet group's own selection.
 * @param {Picture[]} pictures
 * @param {PrintFilters} activeFilters
 * @param {string} term
 */
export function buildPrintFilterFacets(
  pictures: Picture[],
  activeFilters: PrintFilters,
  term = '',
): PrintFilterFacets {
  const base = pictures.filter((picture) => pictureMatchesSearchTerm(picture, term));

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
 * @param {Picture[]} pictures
 * @param {PrintFilters} activeFilters
 * @param {PrintFilterParam} facetKey
 * @param {(attrs: PrintFilterAttrs) => {value: string; label: string} | null} getOption
 */
function buildFacetGroup(
  pictures: Picture[],
  activeFilters: PrintFilters,
  facetKey: PrintFilterParam,
  getOption: (attrs: PrintFilterAttrs) => {value: string; label: string} | null,
) {
  const filtersWithoutFacet: PrintFilters = {
    ...activeFilters,
    [facetKey]: [],
  };

  const eligible = pictures.filter((picture) =>
    matchesPrintFilters(getPrintFilterAttrs(picture), filtersWithoutFacet),
  );

  const counts = new Map<string, PrintFilterFacetOption>();

  for (const picture of eligible) {
    const option = getOption(getPrintFilterAttrs(picture));
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
