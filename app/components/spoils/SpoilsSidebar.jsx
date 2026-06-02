import {Link} from 'react-router';
import {ChevronRight} from 'lucide-react';
import {useState} from 'react';

import {getMockCollectionNavItems} from '~/lib/collections-data';
import {ScrollArea} from '~/components/ui/scroll-area';
import {Separator} from '~/components/ui/separator';
import {Sheet, SheetContent} from '~/components/ui/sheet';

const collections = getMockCollectionNavItems();

const artists = [
  {name: "Brecht Van't Hof", handle: 'brecht-vant-hof', works: 16},
  {name: 'Davide de Martis', handle: 'davide-de-martis', works: 11},
  {name: 'Alex Lau', handle: 'alex-lau', works: 9},
  {name: 'Tommy Murch', handle: 'tommy-murch', works: 13},
];

const infoLinks = [
  {title: 'About Us', href: '/about'},
  {title: 'Shipping & Returns', href: '/shipping'},
  {title: 'FAQ', href: '/faq'},
  {title: 'Contact', href: '/contact'},
  {title: 'Privacy Policy', href: '/privacy'},
  {title: 'Terms of Service', href: '/terms'},
];

/** @param {{open: boolean, onClose: () => void}} */
export function SpoilsSidebar({open, onClose}) {
  const [expandedSections, setExpandedSections] = useState(new Set(['collections']));

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
        className="w-full max-w-sm gap-0 border-r p-0"
      >
        <div className="border-b border-border px-6 py-5">
          <Link to="/" onClick={onClose}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.3em] text-foreground">
              The Long Look
            </h2>
          </Link>
        </div>

        <ScrollArea className="flex-1">
          <SidebarSection
            title="Collections"
            isOpen={isOpen('collections')}
            onToggle={() => toggleSection('collections')}
          >
            <Link to="/collections/all" onClick={onClose} className="sidebar-link">
              <span>Shop All</span>
              <span className="text-muted-foreground">
                {collections.reduce((n, c) => n + c.count, 0)}
              </span>
            </Link>
            {collections.map((c) => (
              <Link
                key={c.handle}
                to={`/collections/${c.handle}`}
                onClick={onClose}
                className="sidebar-link"
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
                to={`/collections/${a.handle}`}
                onClick={onClose}
                className="sidebar-link"
              >
                <span>{a.name}</span>
                <span className="text-muted-foreground">{a.works} works</span>
              </Link>
            ))}
            <Link
              to="/collections/artists"
              onClick={onClose}
              className="block py-2.5 text-[11px] font-medium text-foreground"
            >
              View All Artists →
            </Link>
          </SidebarSection>

          <Separator />

          <SidebarSection
            title="Info"
            isOpen={isOpen('info')}
            onToggle={() => toggleSection('info')}
          >
            {infoLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={onClose}
                className="block py-2.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {link.title}
              </Link>
            ))}
          </SidebarSection>
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
