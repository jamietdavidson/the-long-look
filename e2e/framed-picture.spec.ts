import {test, expect} from '@playwright/test';
import {
  buildPrintSizingGuideVariantRows,
  computeFramedPictureSize,
  getFramedPictureSpecFromVariant,
  resolveReferenceInsetsForSize,
  variantHasPrintSizingMetafields,
} from '../app/lib/framed-picture';

const variantWithPrintMetafields = {
  id: 'border-medium',
  metafields: [
    {namespace: 'print', key: 'short_inches', value: '12'},
    {namespace: 'print', key: 'long_inches', value: '18'},
    {namespace: 'print', key: 'padding_inches', value: '2'},
    {namespace: 'print', key: 'frame_width_inches', value: '2'},
    {namespace: 'print', key: 'rank', value: '2'},
  ],
  selectedOptions: [
    {name: 'Size', value: 'Medium'},
    {name: 'Frame', value: 'Black'},
    {name: 'Mount', value: 'Border'},
  ],
};

function buildPool(...variants: Array<typeof variantWithPrintMetafields>) {
  return variants;
}

test.describe('buildPrintSizingGuideVariantRows', () => {
  test('emits one row per size × frame presence × mount (not per frame colour)', () => {
    const rows = buildPrintSizingGuideVariantRows({
      sizeOptionValues: [
        {name: 'Medium', firstSelectableVariant: variantWithPrintMetafields},
        {name: 'Large', firstSelectableVariant: variantWithPrintMetafields},
      ],
      frameOptions: ['Black', 'White', 'No Frame'],
      mountOptions: ['Border', 'Full Bleed'],
      variantPool: [variantWithPrintMetafields],
      orientation: 'vertical',
    });

    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({
      sizeLabel: 'Medium',
      frameLabel: 'Framed',
      mountLabel: 'Border',
      printDimensions: '12" × 18"',
    });
    expect(rows.find((row) => row.mountLabel === 'Full Bleed')?.matInches).toBe(
      0,
    );
    expect(
      rows.find((row) => row.frameLabel === 'No Frame')?.mouldingInches,
    ).toBe(0);
    expect(
      rows.some(
        (row) => row.frameLabel === 'No Frame' && row.mountLabel === 'Full Bleed',
      ),
    ).toBe(false);
    expect(rows.some((row) => row.frameLabel === 'White')).toBe(false);
  });
});

test.describe('resolveReferenceInsetsForSize', () => {
  test('reads bordered mat width when full bleed variant stores padding 0', () => {
    const pool = buildPool(
      {
        id: 'exhibition-bleed',
        metafields: [
          {namespace: 'print', key: 'padding_inches', value: '0'},
          {namespace: 'print', key: 'frame_width_inches', value: '1.25'},
        ],
        selectedOptions: [
          {name: 'Size', value: 'Exhibition'},
          {name: 'Mount', value: 'Full Bleed'},
        ],
      },
      {
        id: 'exhibition-border',
        metafields: [
          {namespace: 'print', key: 'padding_inches', value: '3'},
          {namespace: 'print', key: 'frame_width_inches', value: '1.25'},
        ],
        selectedOptions: [
          {name: 'Size', value: 'Exhibition'},
          {name: 'Mount', value: 'Border'},
        ],
      },
    );

    expect(resolveReferenceInsetsForSize('Exhibition', pool)).toEqual({
      referencePadding: 3,
      referenceFrame: 1.25,
    });
  });
});

test.describe('variantHasPrintSizingMetafields', () => {
  test('is true when short and long inches are present', () => {
    expect(variantHasPrintSizingMetafields(variantWithPrintMetafields)).toBe(
      true,
    );
  });

  test('is false when print inch metafields are missing', () => {
    expect(variantHasPrintSizingMetafields({metafields: []})).toBe(false);
  });
});

test.describe('computeFramedPictureSize picture lock', () => {
  const capOptions = {maxLongSideCqi: 75};

  test('keeps the print area fixed when toggling mount and frame', () => {
    const bordered = getFramedPictureSpecFromVariant(
      variantWithPrintMetafields,
      undefined,
      {frame: 'Black', mount: 'Border'},
      {variantPool: [variantWithPrintMetafields]},
    );
    const fullBleed = getFramedPictureSpecFromVariant(
      variantWithPrintMetafields,
      undefined,
      {frame: 'Black', mount: 'Full Bleed'},
      {variantPool: [variantWithPrintMetafields]},
    );
    const unframed = getFramedPictureSpecFromVariant(
      variantWithPrintMetafields,
      undefined,
      {frame: 'No Frame', mount: 'Border'},
      {variantPool: [variantWithPrintMetafields]},
    );

    const borderedSize = computeFramedPictureSize(bordered, 'vertical', capOptions);
    const fullBleedSize = computeFramedPictureSize(
      fullBleed,
      'vertical',
      capOptions,
    );
    const unframedSize = computeFramedPictureSize(
      unframed,
      'vertical',
      capOptions,
    );

    expect(fullBleedSize.pictureWidthCqi).toBeCloseTo(
      borderedSize.pictureWidthCqi,
      5,
    );
    expect(unframedSize.pictureWidthCqi).toBeCloseTo(
      borderedSize.pictureWidthCqi,
      5,
    );
  });

  test('keeps the print area fixed for tier-specific mat widths (Exhibition/Museum)', () => {
    const exhibitionPool = buildPool(
      {
        id: 'exhibition-bleed',
        metafields: [
          {namespace: 'print', key: 'short_inches', value: '30'},
          {namespace: 'print', key: 'long_inches', value: '45'},
          {namespace: 'print', key: 'padding_inches', value: '0'},
          {namespace: 'print', key: 'frame_width_inches', value: '1.25'},
        ],
        selectedOptions: [
          {name: 'Size', value: 'Exhibition'},
          {name: 'Frame', value: 'Black'},
          {name: 'Mount', value: 'Full Bleed'},
        ],
      },
      {
        id: 'exhibition-border',
        metafields: [
          {namespace: 'print', key: 'short_inches', value: '30'},
          {namespace: 'print', key: 'long_inches', value: '45'},
          {namespace: 'print', key: 'padding_inches', value: '3'},
          {namespace: 'print', key: 'frame_width_inches', value: '1.25'},
        ],
        selectedOptions: [
          {name: 'Size', value: 'Exhibition'},
          {name: 'Frame', value: 'Black'},
          {name: 'Mount', value: 'Border'},
        ],
      },
    );

    const bordered = getFramedPictureSpecFromVariant(
      exhibitionPool[1],
      undefined,
      {frame: 'Black', mount: 'Border'},
      {variantPool: exhibitionPool},
    );
    const fullBleed = getFramedPictureSpecFromVariant(
      exhibitionPool[0],
      undefined,
      {frame: 'Black', mount: 'Full Bleed'},
      {variantPool: exhibitionPool},
    );

    expect(bordered.referencePadding).toBe(3);
    expect(fullBleed.referencePadding).toBe(3);

    const borderedSize = computeFramedPictureSize(bordered, 'vertical', {
      maxLongSideCqi: 82,
    });
    const fullBleedSize = computeFramedPictureSize(fullBleed, 'vertical', {
      maxLongSideCqi: 82,
    });

    expect(fullBleedSize.pictureWidthCqi).toBeCloseTo(
      borderedSize.pictureWidthCqi,
      5,
    );
  });
});
