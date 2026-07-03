import {Fragment} from 'react';
import {useOptimisticCart} from '@shopify/hydrogen';
import {ArrowRight, ShoppingBag} from 'lucide-react';
import {Link} from 'react-router';
import {useAside} from '~/components/Aside';
import {CartLineDivider, CartLineItem, CartLineItemsSkeleton} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';
import {artistsPath, printsPath} from '~/lib/paths';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';
/**
 * Returns a map of all line items and their children.
 * @param {CartLine[]} lines
 * @return {import('~/components/CartMain').LineItemChildrenMap}
 */
function getLineItemChildrenMap(lines) {
  const children = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const nestedChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childLines] of Object.entries(nestedChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childLines);
      }
    }
  }
  return children;
}
/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 * @param {CartMainProps}
 */
export function CartMain({layout, cart: originalCart, loading = false}) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);
  const rootLines = (cart?.lines?.nodes ?? []).filter(
    (line) =>
      !('parentRelationship' in line && line.parentRelationship?.parent),
  );

  return (
    <section
      className="flex h-full flex-col"
      aria-label={layout === 'page' ? 'Cart page' : 'Cart drawer'}
    >
      {loading ? (
        <div className="flex-1 overflow-y-auto pr-1">
          <CartLineItemsSkeleton count={3} />
        </div>
      ) : linesCount ? (
        <div className="flex h-full flex-col">
          <p id="cart-lines" className="sr-only">
            Line items
          </p>
          <div className="flex-1 overflow-y-auto pr-1">
            <ul aria-labelledby="cart-lines" className="flex flex-col gap-3">
              {rootLines.map((line, index) => (
                <Fragment key={line.id}>
                  {index > 0 ? <CartLineDivider /> : null}
                  <CartLineItem
                    line={line}
                    layout={layout}
                    childrenMap={childrenMap}
                  />
                </Fragment>
              ))}
            </ul>
          </div>
          {cartHasItems && <CartSummary cart={cart} layout={layout} />}
        </div>
      ) : (
        <CartEmpty layout={layout} />
      )}
    </section>
  );
}

/**
 * @param {{
 *   layout?: CartMainProps['layout'];
 * }}
 */
function CartEmpty({layout}) {
  const {close} = useAside();

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center px-2 text-center',
        layout === 'page' ? 'py-16' : 'py-10',
      )}
    >
      <div
        className="mb-8 w-28 bg-neutral-100 p-1.5 shadow-sm"
        aria-hidden
      >
        <div className="flex aspect-4/5 items-center justify-center border border-neutral-200/80 bg-white">
          <ShoppingBag
            className="size-9 text-neutral-300"
            strokeWidth={1}
          />
        </div>
      </div>

      <p className={cn(type.title.xs, 'text-neutral-900')}>
        Your cart is empty
      </p>
      <p className={cn(type.body.xl, 'mt-3 max-w-[20rem] text-neutral-500')}>
        Looks like you haven&rsquo;t added anything yet. Discover prints worth
        living with.
      </p>

      <Link
        to={printsPath()}
        onClick={close}
        prefetch="viewport"
        className={cn(
          type.body.md,
          'mt-8 inline-flex w-full max-w-xs items-center justify-center gap-2 border border-neutral-900 bg-neutral-900 px-4 py-3 font-medium uppercase tracking-nav text-white transition-colors hover:bg-neutral-700',
        )}
      >
        Browse prints
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
      </Link>

      <Link
        to={artistsPath()}
        onClick={close}
        prefetch="intent"
        className={cn(
          type.body.lg,
          'mt-4 text-neutral-500 transition-colors hover:text-neutral-900',
        )}
      >
        Meet our artists
      </Link>
    </div>
  );
}

/** @typedef {'page' | 'aside'} CartLayout */
/**
 * @typedef {{
 *   cart: CartApiQueryFragment | null;
 *   layout: CartLayout;
 *   loading?: boolean;
 * }} CartMainProps
 */
/** @typedef {{[parentId: string]: CartLine[]}} LineItemChildrenMap */

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('~/components/CartLineItem').CartLine} CartLine */
