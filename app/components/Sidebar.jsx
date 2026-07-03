import {Link, useRouteLoaderData} from 'react-router';
import {ChevronRight} from 'lucide-react';
import {useState} from 'react';

import {artistPath, artistsPath, collectionPath, printsPath} from '~/lib/paths';
import {ScrollArea} from '~/components/ui/scroll-area';
import {Separator} from '~/components/ui/separator';
import {Sheet, SheetContent, SheetDescription, SheetTitle} from '~/components/ui/sheet';

const sidebarLinkClass =
  'flex items-center justify-between py-2.5 text-[11px] text-neutral-600 transition-colors hover:text-neutral-900';

/** @param {{open: boolean, onClose: () => void}} */
export function Sidebar({open, onClose}) {
  const [expandedSections, setExpandedSections] = useState(new Set(['collections']));
  const rootData = useRouteLoaderData('root');
  const contentNav = rootData?.contentNav;

  const collections = contentNav?.collections ?? [];
  const artists = contentNav?.artists ?? [];
  const totalPictures = contentNav?.totalPictures ?? 0;

  const toggleSection = (section) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const isOpen = (section) => expandedSections.has(section);

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex w-full max-w-sm flex-col gap-0 border-r px-0 pb-0 pt-0"
      >
        <SheetTitle className="sr-only">Shop menu</SheetTitle>
        <SheetDescription className="sr-only">
          Browse collections and artists.
        </SheetDescription>
        <ScrollArea className="min-h-0 flex-1">
          <div
            className="pt-[var(--header-height,4.25rem)]"
          >
          <SidebarSection
            title="Collections"
            isOpen={isOpen('collections')}
            onToggle={() => toggleSection('collections')}
          >
            <Link to={printsPath()} onClick={onClose} className={sidebarLinkClass}>
              <span>Shop All</span>
              <span className="text-muted-foreground">{totalPictures}</span>
            </Link>
            {collections.map((c) => (
              <Link
                key={c.handle}
                to={collectionPath(c.handle)}
                onClick={onClose}
                className={sidebarLinkClass}
              >
                <span>{c.title}</span>
                <span className="text-muted-foreground">{c.count}</span>
              </Link>
            ))}
          </SidebarSection>

          <Separator />

          <SidebarSection
            title="Artists"
            isOpen={isOpen('artists')}
            onToggle={() => toggleSection('artists')}
          >
            {artists.map((a) => (
              <Link
                key={a.handle}
                to={artistPath(a.handle)}
                onClick={onClose}
                className={sidebarLinkClass}
              >
                <span>{a.name}</span>
                <span className="text-muted-foreground">{a.works} works</span>
              </Link>
            ))}
            <Link
              to={artistsPath()}
              onClick={onClose}
              className="block py-2.5 text-[11px] font-medium text-foreground"
            >
              View All Artists →
            </Link>
          </SidebarSection>
          </div>
        </ScrollArea>

        <div className="border-t border-border px-6 py-5">
          <span className="text-[10px] text-muted-foreground">@thelonglook</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** @param {{title: string, isOpen: boolean, onToggle: () => void, children: import('react').ReactNode}} */
function SidebarSection({title, isOpen, onToggle, children}) {
  return (
    <div className="py-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-3 hover:bg-muted/50"
      >
        <span className="text-[12px] font-medium uppercase tracking-[0.15em] text-foreground">
          {title}
        </span>
        <ChevronRight
          size={14}
          className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen ? <div className="px-6 pb-2">{children}</div> : null}
    </div>
  );
}
