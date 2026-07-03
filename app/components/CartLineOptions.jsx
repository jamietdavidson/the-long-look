import {getLinePrintOptions} from '~/lib/cart';
import {
  FRAMED_PICTURE_SIZE_LABELS,
  resolveNamedFramedPictureSize,
} from '~/lib/framed-picture';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

/**
 * Read-only display of the print options on a cart line.
 * @param {{line: CartLine}}
 */
export function CartLineOptions({line}) {
  const displayOptions = getLinePrintOptions(line);
  const sizeLabel = formatCartSizeLabel(displayOptions.size);

  const specs = [
    sizeLabel ? {label: 'Size', value: sizeLabel} : null,
    displayOptions.frame
      ? {label: 'Frame', value: displayOptions.frame}
      : null,
    displayOptions.mount
      ? {label: 'Mount', value: displayOptions.mount}
      : null,
  ].filter(Boolean);

  if (specs.length === 0) return null;

  return (
    <ul className="mt-2 space-y-0.5 border-t border-neutral-100 pt-2">
      {specs.map((spec) => (
        <li
          key={spec.label}
          className={cn(type.body.md, 'grid grid-cols-[4rem_1fr] items-baseline gap-2 leading-tight')}
        >
          <span className={cn(type.overline.xs, 'text-neutral-400')}>
            {spec.label}
          </span>
          <span className="font-medium text-neutral-800">{spec.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** @param {string | null} size */
function formatCartSizeLabel(size) {
  if (!size) return null;

  const named = resolveNamedFramedPictureSize(size);
  if (named) return FRAMED_PICTURE_SIZE_LABELS[named];

  return size;
}

/** @typedef {import('@shopify/hydrogen').OptimisticCartLine<import('storefrontapi.generated').CartApiQueryFragment>} CartLine */
