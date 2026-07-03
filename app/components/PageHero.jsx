import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

/** @param {{title: string, children: import('react').ReactNode}} */
export function PageHero({title, children}) {
  return (
    <div className="text-center py-16 md:py-24 px-6 border-b border-neutral-100">
        <h1 className={cn(type.title.md, 'text-neutral-900')}>
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
