/**
 * Print catalog — keep in sync with FRAMED_PICTURE_SIZES in app/lib/framed-picture.ts.
 * All tiers use a 2:3 short × long aspect ratio (standard print sizing).
 */
export const PRINT_CATALOG = [
  {key: 'small', shortSide: 8, longSide: 12, price: 70},
  {key: 'medium', shortSide: 12, longSide: 18, price: 120},
  {key: 'large', shortSide: 16, longSide: 24, price: 165},
  {key: 'giant', shortSide: 20, longSide: 30, price: 250},
  {key: 'collector', shortSide: 30, longSide: 45, price: 475},
  {key: 'exhibition', shortSide: 40, longSide: 60, price: 875},
];

/** @param {{shortSide: number; longSide: number}} size */
export function formatPrintSizeLabel({shortSide, longSide}) {
  return `${shortSide}" x ${longSide}"`;
}

export const PRINT_SIZES = PRINT_CATALOG.map((size) => ({
  ...size,
  name: formatPrintSizeLabel(size),
}));
