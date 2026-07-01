import {createContext, useContext, Suspense} from 'react';
import {Await} from 'react-router';

/** @type {React.Context<{cart: import('storefrontapi.generated').CartApiQueryFragment | null; loading: boolean}>} */
const DeferredCartContext = createContext({
  cart: null,
  loading: true,
});

/**
 * Resolves the root deferred cart promise once for the whole layout.
 * @param {{
 *   cart: Promise<import('storefrontapi.generated').CartApiQueryFragment | null>;
 *   children: React.ReactNode;
 * }}
 */
export function DeferredCart({cart, children}) {
  return (
    <Suspense
      fallback={
        <DeferredCartContext.Provider value={{cart: null, loading: true}}>
          {children}
        </DeferredCartContext.Provider>
      }
    >
      <Await resolve={cart}>
        {(resolvedCart) => (
          <DeferredCartContext.Provider
            value={{cart: resolvedCart, loading: false}}
          >
            {children}
          </DeferredCartContext.Provider>
        )}
      </Await>
    </Suspense>
  );
}

export function useDeferredCart() {
  return useContext(DeferredCartContext);
}

/** @typedef {import('react').ReactNode} ReactNode */
