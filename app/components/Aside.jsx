import {createContext, useContext, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {useId} from 'react';
import {cn} from '~/lib/utils';

/**
 * A side bar component with Overlay
 * @example
 * ```jsx
 * <Aside type="search" heading="SEARCH">
 *  <input type="search" />
 *  ...
 * </Aside>
 * ```
 * @param {{
 *   children?: React.ReactNode;
 *   type: AsideType;
 *   heading: React.ReactNode;
 * }}
 */
export function Aside({children, heading, type}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;
  const id = useId();
  const isCart = type === 'cart';
  const isPrintInfo = type === 'print-info';
  const fromRight = isCart || isPrintInfo;
  const [animate, setAnimate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimate(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!expanded) {
      return undefined;
    }

    const abortController = new AbortController();
    document.documentElement.style.overflow = 'hidden';

    document.addEventListener(
      'keydown',
      function handler(event) {
        if (event.key === 'Escape') {
          close();
        }
      },
      {signal: abortController.signal},
    );

    return () => {
      document.documentElement.style.overflow = '';
      abortController.abort();
    };
  }, [close, expanded]);

  const panel = (
    <div
      aria-modal
      aria-hidden={!expanded}
      className={cn(
        'fixed inset-0 z-50 bg-black/20',
        animate && 'transition-opacity duration-300',
        expanded ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      data-type={type}
      role="dialog"
      aria-labelledby={id}
    >
      <button
        className="absolute inset-0 cursor-pointer border-0 bg-transparent"
        style={{right: 'min(28rem, 100vw)'}}
        onClick={close}
        aria-label="Close panel"
      />
      <aside
        className={cn(
          'fixed inset-y-0 z-10 flex flex-col bg-white shadow-xl',
          animate && 'transition-transform duration-300',
          isCart || isPrintInfo
            ? 'right-0 left-auto w-full sm:max-w-md'
            : 'left-0 w-full sm:max-w-sm',
          expanded
            ? 'translate-x-0'
            : fromRight
              ? 'translate-x-full'
              : '-translate-x-full',
        )}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h3
            id={id}
            className="m-0 text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-900"
          >
            {heading}
          </h3>
          <button
            className="text-2xl leading-none text-neutral-500 hover:text-neutral-900"
            onClick={close}
            aria-label="Close"
          >
            &times;
          </button>
        </header>
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          {children}
        </main>
      </aside>
    </div>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(panel, document.body);
}

const AsideContext = createContext(null);

Aside.Provider = function AsideProvider({children}) {
  const [type, setType] = useState('closed');
  const [printInfoTab, setPrintInfoTab] = useState('shipping');

  return (
    <AsideContext.Provider
      value={{
        type,
        isOpen: type !== 'closed',
        printInfoTab,
        open: setType,
        openPrintInfo: (tab) => {
          setPrintInfoTab(tab);
          setType('print-info');
        },
        close: () => setType('closed'),
      }}
    >
      {children}
    </AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}

/** @typedef {'search' | 'cart' | 'mobile' | 'print-info' | 'closed'} AsideType */
/**
 * @typedef {{
 *   type: AsideType;
 *   isOpen: boolean;
 *   printInfoTab: string;
 *   open: (mode: AsideType) => void;
 *   openPrintInfo: (tab: string) => void;
 *   close: () => void;
 * }} AsideContextValue
 */

/** @typedef {import('react').ReactNode} ReactNode */
