import {Money} from '@shopify/hydrogen';
import {useId} from 'react';

/**
 * @param {CartSummaryProps}
 */
export function CartSummary({cart, layout}) {
  const summaryId = useId();

  return (
    <div
      aria-labelledby={summaryId}
      className={
        layout === 'page'
          ? 'mt-8 border-t border-neutral-200 pt-6'
          : 'mt-4 shrink-0 border-t border-neutral-200 bg-white pt-4'
      }
    >
      <h4
        id={summaryId}
        className="mb-3 text-[10px] uppercase tracking-[0.25em] text-neutral-500"
      >
        Totals
      </h4>
      <dl role="group" className="mb-4 flex items-center justify-between text-[13px]">
        <dt>Subtotal</dt>
        <dd>
          {cart?.cost?.subtotalAmount?.amount ? (
            <Money data={cart?.cost?.subtotalAmount} />
          ) : (
            '-'
          )}
        </dd>
      </dl>
      <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} />
    </div>
  );
}

/**
 * @param {{checkoutUrl?: string}}
 */
function CartCheckoutActions({checkoutUrl}) {
  if (!checkoutUrl) return null;

  return (
    <div className="mt-4 space-y-2">
      <a
        href={checkoutUrl}
        className="block w-full border border-neutral-900 bg-neutral-900 px-4 py-3 text-center text-[10px] uppercase tracking-[0.25em] text-white transition-colors hover:bg-neutral-700"
        target="_self"
        rel="noopener noreferrer"
      >
        Checkout
      </a>
      <p className="text-[11px] leading-relaxed text-neutral-500">
        Secure checkout powered by Shopify. Shop Pay and other payment methods
        available at checkout.
      </p>
    </div>
  );
}

/**
 * @typedef {{
 *   cart: OptimisticCart<CartApiQueryFragment | null>;
 *   layout: CartLayout;
 * }} CartSummaryProps
 */

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('~/components/CartMain').CartLayout} CartLayout */
/** @typedef {import('@shopify/hydrogen').OptimisticCart} OptimisticCart */
