/** @param {{title: string, subtitle?: string, children: import('react').ReactNode}} */
export function PageHero({title, subtitle, children}) {
  return (
    <div className="text-center py-16 md:py-24 px-6 border-b border-neutral-100">
        {subtitle && (
          <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 mb-3">{subtitle}</p>
        )}
        <h1 className="text-[22px] md:text-[30px] uppercase tracking-[0.15em] font-semibold text-neutral-900">
          {title}
        </h1>
        {children}
    </div>
  );
}

/** @param {{children: import('react').ReactNode}} */
export function PageContent({children}) {
  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16 prose-spoils">
      {children}
    </div>
  );
}
