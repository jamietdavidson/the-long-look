/**
 * Semantic typography tokens for the storefront.
 * Sizes are defined in app/styles/globals.css (@theme).
 */
export const type = {
  overline: {
    xs: 'text-overline-xs uppercase tracking-overline font-medium',
    sm: 'text-overline-sm uppercase tracking-overline font-medium',
    md: 'text-overline-md uppercase tracking-overline font-semibold',
    lg: 'text-overline-lg uppercase tracking-overline font-medium',
  },
  body: {
    xs: 'text-body-xs leading-relaxed',
    sm: 'text-body-sm leading-relaxed',
    md: 'text-body-md leading-relaxed',
    lg: 'text-body-lg leading-relaxed',
    xl: 'text-body-xl leading-relaxed',
  },
  /**
   * Mobile-first steps that grow at md+ — mirrors the old text-xs md:text-sm pattern.
   * Line-heights come from @theme; max-md:leading-* keeps dense grids compact.
   */
  responsive: {
    sm: 'text-body-md max-md:leading-tight md:text-body-xl',
    xs: 'text-body-xs max-md:leading-tight md:text-body-xl',
    price: 'text-body-sm max-md:leading-none',
    toggle: 'text-body-md max-md:leading-none md:text-body-xl',
    ui: 'text-body-xl max-md:leading-snug',
  },
  title: {
    xs: 'text-title-xs uppercase tracking-title font-semibold',
    sm: 'text-title-sm md:text-title-sm-lg uppercase tracking-title font-semibold',
    md: 'text-title-md md:text-title-md-lg uppercase tracking-title font-semibold',
    lg: 'text-title-lg md:text-title-lg-lg uppercase tracking-title font-semibold',
    xl: 'text-title-xl md:text-title-xl-md lg:text-title-xl-lg font-light leading-tight',
  },
  nav: 'text-body-lg uppercase tracking-nav font-semibold',
  cta: 'text-overline-xs uppercase tracking-cta',
  micro: 'text-micro',
} as const;
