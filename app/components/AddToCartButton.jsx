import {CartForm} from '@shopify/hydrogen';

/**
 * @param {{
 *   analytics?: unknown;
 *   children: React.ReactNode;
 *   disabled?: boolean;
 *   lines: Array<OptimisticCartLineInput>;
 *   onClick?: () => void;
 *   redirectTo?: string;
 * }}
 */
export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  redirectTo,
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher) => (
        <>
          <input
            name="analytics"
            type="hidden"
            value={JSON.stringify(analytics)}
          />
          {redirectTo ? (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          ) : null}
          <button
            type="submit"
            className="border border-neutral-900 px-8 py-3 text-[10px] uppercase tracking-[0.3em] transition-colors hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onClick}
            disabled={disabled ?? fetcher.state !== 'idle'}
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  );
}

/** @typedef {import('react-router').FetcherWithComponents} FetcherWithComponents */
/** @typedef {import('@shopify/hydrogen').OptimisticCartLineInput} OptimisticCartLineInput */
