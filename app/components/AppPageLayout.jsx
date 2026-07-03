import {useMatches} from 'react-router';
import {cn} from '~/lib/utils';

/** @typedef {'white' | 'black'} TopbarColor */
/** @typedef {'filled' | 'transparent'} TopbarMode */

/** @typedef {{
 *   compensateForTopbar?: boolean;
 *   topbar?: {
 *     color?: TopbarColor;
 *     mode?: TopbarMode;
 *     autohide?: boolean;
 *   };
 * }} AppRouteHandle */

/** @type {{color: TopbarColor; mode: TopbarMode; autohide: boolean}} */
export const DEFAULT_TOPBAR = {color: 'black', mode: 'filled', autohide: true};

/** Default for routes that do not set `handle.compensateForTopbar`. */
export const DEFAULT_COMPENSATE_FOR_TOPBAR = true;

/**
 * Read topbar compensation from the deepest matching route handle.
 * @param {ReturnType<typeof useMatches>} matches
 */
export function getCompensateForTopbar(matches) {
  for (let i = matches.length - 1; i >= 0; i--) {
    const value = /** @type {AppRouteHandle | undefined} */ (
      matches[i]?.handle
    )?.compensateForTopbar;
    if (typeof value === 'boolean') return value;
  }
  return DEFAULT_COMPENSATE_FOR_TOPBAR;
}

export function useCompensateForTopbar() {
  return getCompensateForTopbar(useMatches());
}

/**
 * Read topbar appearance from the deepest matching route handle.
 * @param {ReturnType<typeof useMatches>} matches
 */
export function getTopbarConfig(matches) {
  for (let i = matches.length - 1; i >= 0; i--) {
    const topbar = /** @type {AppRouteHandle | undefined} */ (
      matches[i]?.handle
    )?.topbar;
    if (topbar) {
      return {
        color: topbar.color ?? DEFAULT_TOPBAR.color,
        mode: topbar.mode ?? DEFAULT_TOPBAR.mode,
        autohide: topbar.autohide ?? DEFAULT_TOPBAR.autohide,
      };
    }
  }
  return DEFAULT_TOPBAR;
}

export function useTopbarConfig() {
  return getTopbarConfig(useMatches());
}

/**
 * High-level page layout — optional padding for the fixed site header.
 * @param {{
 *   children: import('react').ReactNode;
 *   compensateForTopbar?: boolean;
 *   className?: string;
 * }}
 */
export function AppPageLayout({
  children,
  compensateForTopbar = false,
  className,
}) {
  return (
    <div
      className={cn(
        'min-h-full',
        compensateForTopbar && 'pt-[var(--header-height)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Wraps routed page content and reads `compensateForTopbar` from route handles.
 * @param {{children: import('react').ReactNode}}
 */
export function RoutedAppPageLayout({children}) {
  const compensateForTopbar = useCompensateForTopbar();

  return (
    <AppPageLayout compensateForTopbar={compensateForTopbar}>
      {children}
    </AppPageLayout>
  );
}
