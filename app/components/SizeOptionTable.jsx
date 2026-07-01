import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';
import {cn} from '~/lib/utils';

/**
 * @param {{
 *   rows: Array<{
 *     key: string;
 *     label: string;
 *     dimensions?: string | null;
 *     price?: {amount: string; currencyCode: string} | null;
 *     selected?: boolean;
 *     disabled?: boolean;
 *     onSelect?: () => void;
 *   }>;
 *   className?: string;
 * }}
 */
export function SizeOptionTable({rows, className}) {
  const selectedLabel = rows.find((row) => row.selected)?.label;

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">
          Size:{selectedLabel ? ` ${selectedLabel}` : null}
        </h3>
        <Link
          to="/faq"
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Size Guide
        </Link>
      </div>
      <div className="border border-neutral-200 divide-y divide-neutral-200">
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            disabled={row.disabled}
            onClick={row.onSelect}
            className={cn(
              'grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] items-center py-3 text-sm transition-colors',
              row.selected ? 'bg-neutral-100' : 'bg-white hover:bg-neutral-50',
              row.disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            <span className="px-4 text-left font-medium text-neutral-900">
              {row.label}
            </span>
            <span className="text-center text-neutral-500">
              {row.dimensions ?? ''}
            </span>
            <span className="px-4 text-right font-medium text-neutral-900">
              {row.price && Number(row.price.amount) > 0 ? (
                <Money data={row.price} withoutTrailingZeros />
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
