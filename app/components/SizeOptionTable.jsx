import {Money} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
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
  const {openPrintInfo} = useAside();
  const selectedLabel = rows.find((row) => row.selected)?.label;

  return (
    <div className={cn(className)}>
      <div className="mb-3 flex items-center justify-between px-3 max-md:border-t max-md:border-neutral-200 max-md:pt-3 md:mb-2 md:px-0">
        <h3 className="text-xs font-medium text-neutral-900 md:text-sm">
          Size:
          {selectedLabel ? (
            <span className="text-xs font-normal text-neutral-500 md:text-sm">
              {' '}
              {selectedLabel}
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={() => openPrintInfo('sizing')}
          className="text-sm text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900"
        >
          Size Guide
        </button>
      </div>
      <div
        className={cn(
          'border-neutral-200',
          'max-md:grid max-md:grid-cols-2 max-md:border-y',
          'md:border md:divide-y',
        )}
      >
        {rows.map((row, index) => {
          const column = index % 2;
          const rowIndex = Math.floor(index / 2);
          const totalRows = Math.ceil(rows.length / 2);

          return (
          <button
            key={row.key}
            type="button"
            disabled={row.disabled}
            onClick={row.onSelect}
            className={cn(
              'transition-colors',
              'max-md:flex max-md:flex-col max-md:items-stretch max-md:gap-1 max-md:px-3 max-md:py-3 max-md:text-left',
              column === 0 && 'max-md:border-r max-md:border-neutral-200',
              rowIndex < totalRows - 1 && 'max-md:border-b max-md:border-neutral-200',
              'md:grid md:w-full md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] md:items-center md:py-3 md:text-sm',
              row.selected ? 'bg-neutral-100' : 'bg-white hover:bg-neutral-50',
              row.disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            <div className="flex w-full items-baseline justify-between gap-2 md:hidden">
              <span className="font-medium text-xs text-neutral-900">
                {row.label}
              </span>
              <span className="shrink-0 font-medium text-[11px] text-neutral-900">
                {row.price && Number(row.price.amount) > 0 ? (
                  <Money data={row.price} withoutTrailingZeros />
                ) : null}
              </span>
            </div>
            <span className="hidden font-medium text-neutral-900 md:block md:px-4 md:text-left md:text-sm">
              {row.label}
            </span>
            <span className="text-left text-[10px] text-neutral-500 md:text-center md:text-sm">
              {row.dimensions ?? ''}
            </span>
            <span className="hidden font-medium text-neutral-900 md:block md:px-4 md:text-right md:text-sm">
              {row.price && Number(row.price.amount) > 0 ? (
                <Money data={row.price} withoutTrailingZeros />
              ) : null}
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
