import {useLoaderData, useLocation, useNavigation} from 'react-router';
import {PrintDetail} from '~/components/PrintDetail';
import {
  loadPrintProductByHandle,
  loadRecommendedPrintProducts,
  resolveArtistForProduct,
  loadArtistIndex,
} from '~/lib/print-catalog';
import {getCachedPrintCatalogCard} from '~/lib/print-product-client-cache';
import {
  getPrintPreviewFromLocationState,
  resolvePrintPlaceholderSrc,
} from '~/lib/warm-print-detail';

function isPrintDetailPath(pathname) {
  return /^\/prints\/[^/]+\/?$/.test(pathname);
}

function getPrintHandleFromPath(pathname) {
  const match = pathname.match(/^\/prints\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `${data?.product?.title ?? 'Print'} | The Long Look`}];
};

/** @type {import('~/components/AppPageLayout').AppRouteHandle} */
export const handle = {
  compensateForTopbar: false,
  topbar: {mode: 'transparent'},
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context, request, params}) {
  const {handle} = params;

  if (!handle) {
    throw new Response(null, {status: 404});
  }

  const product = await loadPrintProductByHandle(
    context.storefront,
    handle,
    request,
  );
  if (!product) {
    throw new Response(null, {status: 404});
  }

  return {
    product,
    artist: loadArtistIndex(context.storefront).then((artists) =>
      resolveArtistForProduct(product, artists),
    ),
    recommended: loadRecommendedPrintProducts(context.storefront, handle, 12),
  };
}

/**
 * Prefer the server product immediately so size/frame/mount options are never
 * dropped for an options-less preview shell. Image speed still comes from
 * cached grid currentSrc via placeholderImageSrc.
 * @param {Route.ClientLoaderArgs} args
 */
export async function clientLoader({serverLoader, params}) {
  const data = await serverLoader();
  return {
    ...data,
    previewCard: getCachedPrintCatalogCard(params.handle),
  };
}

clientLoader.hydrate = true;

export default function PrintRoute() {
  /** @type {LoaderReturnData} */
  const {product, artist, recommended} = useLoaderData();
  const navigation = useNavigation();
  const location = useLocation();

  const pendingHandle =
    navigation.state === 'loading' &&
    navigation.location &&
    isPrintDetailPath(navigation.location.pathname)
      ? getPrintHandleFromPath(navigation.location.pathname)
      : null;

  const suppressGalleryImage =
    pendingHandle != null && pendingHandle !== product.handle;

  const navigationPreview = getPrintPreviewFromLocationState(
    pendingHandle ? navigation.location?.state : location.state,
  );

  const pendingGalleryImage =
    suppressGalleryImage &&
    navigationPreview?.handle === pendingHandle &&
    navigationPreview.image?.url
      ? {
          id: navigationPreview.image.id ?? pendingHandle,
          ...navigationPreview.image,
        }
      : null;

  const placeholderImageSrc = resolvePrintPlaceholderSrc(
    suppressGalleryImage ? pendingHandle : product.handle,
    suppressGalleryImage ? navigation.location?.state : location.state,
  );

  return (
    <PrintDetail
      key={product.handle}
      product={product}
      artist={artist}
      recommended={recommended}
      suppressGalleryImage={suppressGalleryImage}
      galleryImageOverride={pendingGalleryImage}
      placeholderImageSrc={placeholderImageSrc}
    />
  );
}

/** @typedef {import('./+types/prints.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
