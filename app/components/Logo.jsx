import {cn} from '~/lib/utils';

/** @typedef {'white' | 'black'} LogoColor */
/** @typedef {'long' | 'box'} LogoFormat */

const longFormatClass =
  'relative inline-flex translate-y-[0.28em] items-baseline gap-x-[0.34em] text-[17px] font-bold uppercase leading-none tracking-[0.06em] md:text-[21px] md:tracking-[0.08em]';

const boxFormatClass =
  'inline-flex flex-col items-center gap-[0.18em] text-[15px] font-bold uppercase leading-none tracking-[0.06em] md:text-[17px] md:tracking-[0.08em]';

const theMarkClass =
  'font-logo font-normal normal-case italic leading-none tracking-[0.04em]';

/**
 * The Long Look wordmark — Inter for long/look, Playfair Display Italic for "the".
 *
 * @param {{
 *   format?: LogoFormat;
 *   color?: LogoColor;
 *   className?: string;
 * }}
 */
export function Logo({format = 'long', color = 'black', className}) {
  const tone = color === 'white' ? 'text-white' : 'text-neutral-900';

  if (format === 'box') {
    return (
      <span
        className={cn(boxFormatClass, tone, className)}
        aria-label="The Long Look"
      >
        <span className={cn(theMarkClass, 'text-[0.66em]')} aria-hidden>
          the
        </span>
        <span>Long</span>
        <span>Look</span>
      </span>
    );
  }

  return (
    <span
      className={cn(longFormatClass, tone, className)}
      aria-label="The Long Look"
    >
      <span>Long</span>
      <span>Look</span>
      <span
        className={cn(
          theMarkClass,
          'pointer-events-none absolute bottom-full left-1/2 mb-[0.14em] -translate-x-1/2 whitespace-nowrap text-[0.6em]',
        )}
        aria-hidden
      >
        the
      </span>
    </span>
  );
}
