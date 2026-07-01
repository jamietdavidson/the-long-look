import {Fragment} from 'react';
import {CartForm} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {FramedPicture} from '~/components/FramedPicture';
import {
  FRAMED_PICTURE_IMAGE_SIZES,
  FramedPictureWall,
} from '~/components/FramedPictureWall';
import {CartLineOptions} from '~/components/CartLineOptions';
import {getLinePrintOptions, getPrintHandleFromCartAttributes, getLineArtistName} from '~/lib/cart';
import {
  getFramedPictureSpecFromVariant,
  getFramedSizeFromVariant,
} from '~/lib/framed-picture';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import {cn} from '~/lib/utils';

export function CartLineDivider() {
  return <li aria-hidden="true" className="border-t border-neutral-100" />;
}

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * If the line is a parent line that has child components (like warranties or gift wrapping), they are
 * rendered nested below the parent line.
 * @param {{
 *   layout: CartLayout;
 *   line: CartLine;
 *   childrenMap: LineItemChildrenMap;
 * }}
 */
export function CartLineItem({layout, line, childrenMap}) {
  const {id, merchandise, isOptimistic} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const printHandle = getPrintHandleFromCartAttributes(line.attributes);
  const lineItemUrl = useVariantUrl(
    product.handle,
    selectedOptions,
    printHandle,
    line.attributes,
  );
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;
  const displayOptions = getLinePrintOptions(line);
  const artistName = getLineArtistName(line);
  const printSize = getFramedSizeFromVariant(merchandise);
  const sizeSpec = getFramedPictureSpecFromVariant(merchandise, printSize, {
    frame: displayOptions.frame,
    mount: displayOptions.mount,
  });

  return (
    <li>
      <div className="flex gap-3">
        <div className="w-28 shrink-0">
          {image ? (
            <FramedPictureWall variant="compact">
              <FramedPicture
                image={image}
                alt={title}
                size={sizeSpec}
                sizes={FRAMED_PICTURE_IMAGE_SIZES.compact}
                interactive={false}
              />
            </FramedPictureWall>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => {
                if (layout === 'aside') {
                  close();
                }
              }}
              className="min-w-0 flex-1 text-[14px] font-medium leading-tight text-neutral-900 underline-offset-2 hover:underline"
            >
              {product.title}
            </Link>
            <div className="shrink-0 text-[13px] text-neutral-900">
              <ProductPrice price={line?.cost?.totalAmount} />
            </div>
          </div>
          {artistName ? (
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => {
                if (layout === 'aside') {
                  close();
                }
              }}
              className="mt-0.5 block text-[12px] leading-tight text-neutral-500"
            >
              {artistName}
            </Link>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-3">
            <CartLineQuantity line={line} />
            <CartLineRemoveButton lineIds={[id]} disabled={!!isOptimistic} />
          </div>
          <CartLineOptions line={line} />
        </div>
      </div>

      {lineItemChildren ? (
        <div>
          <p id={childrenLabelId} className="sr-only">
            Line items with {product.title}
          </p>
          <ul
            aria-labelledby={childrenLabelId}
            className="cart-line-children flex flex-col gap-3"
          >
            {lineItemChildren.map((childLine, index) => (
              <Fragment key={childLine.id}>
                {index > 0 ? <CartLineDivider /> : null}
                <CartLineItem
                  childrenMap={childrenMap}
                  line={childLine}
                  layout={layout}
                />
              </Fragment>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 * @param {{line: CartLine}}
 */
function CartLineQuantity({line}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));
  const disabled = !!isOptimistic;

  return (
    <div
      className={cn(
        'inline-grid w-fit grid-cols-3 border border-neutral-200 [&_form]:contents',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
        <button
          type="submit"
          aria-label="Decrease quantity"
          disabled={quantity <= 1 || disabled}
          name="decrease-quantity"
          value={prevQuantity}
          className={quantityStepperButtonClassName}
        >
          −
        </button>
      </CartLineUpdateButton>
      <span
        className="flex h-5 min-w-5 items-center justify-center border-x border-neutral-200 px-1 text-[11px] font-medium tabular-nums text-neutral-900"
        aria-live="polite"
        aria-label={`Quantity ${quantity}`}
      >
        {quantity}
      </span>
      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          type="submit"
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={disabled}
          className={quantityStepperButtonClassName}
        >
          +
        </button>
      </CartLineUpdateButton>
    </div>
  );
}

const quantityStepperButtonClassName =
  'flex size-5 items-center justify-center text-xs leading-none text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30';

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 * @param {{
 *   lineIds: string[];
 *   disabled: boolean;
 * }}
 */
function CartLineRemoveButton({lineIds, disabled}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        disabled={disabled}
        type="submit"
        className="shrink-0 border-0 bg-transparent p-0 text-[12px] leading-tight text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
      >
        Remove
      </button>
    </CartForm>
  );
}

/**
 * @param {{
 *   children: React.ReactNode;
 *   lines: CartLineUpdateInput[];
 * }}
 */
function CartLineUpdateButton({children, lines}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @returns
 * @param {string[]} lineIds - line ids affected by the update
 */
function getUpdateKey(lineIds) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}

/** @typedef {OptimisticCartLine<CartApiQueryFragment>} CartLine */

/** @typedef {import('@shopify/hydrogen/storefront-api-types').CartLineUpdateInput} CartLineUpdateInput */
/** @typedef {import('~/components/CartMain').CartLayout} CartLayout */
/** @typedef {import('~/components/CartMain').LineItemChildrenMap} LineItemChildrenMap */
/** @typedef {import('@shopify/hydrogen').OptimisticCartLine} OptimisticCartLine */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('storefrontapi.generated').CartLineFragment} CartLineFragment */
