import {Link} from 'react-router';
import {ChevronRight} from 'lucide-react';
import {useState} from 'react';

const collections = [
  {title: 'New Arrivals', handle: 'new-arrivals', count: 8},
  {title: 'Best Sellers', handle: 'best-sellers', count: 8},
  {title: 'Beach', handle: 'beach', count: 24},
  {title: 'Surf', handle: 'surf', count: 18},
  {title: 'Pool', handle: 'pool', count: 12},
  {title: 'Travel', handle: 'travel', count: 15},
  {title: 'Vintage', handle: 'vintage', count: 10},
  {title: 'Aerial', handle: 'aerial', count: 9},
  {title: 'Black & White', handle: 'black-and-white', count: 14},
  {title: 'Automotive', handle: 'automotive', count: 7},
];

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/20" onClick={onClose} aria-label="Close menu" />
      <aside className="relative z-10 w-full max-w-sm h-full bg-white flex flex-col shadow-xl">
        <div className="px-6 py-5 border-b border-neutral-100">
          <Link to="/" onClick={onClose}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.3em] text-neutral-900">
              House of Spoils
            </h2>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarSection
            title="Collections"
            isOpen={isOpen('collections')}
            onToggle={() => toggleSection('collections')}
          >
            <Link to="/collections/all" onClick={onClose} className="sidebar-link">
              <span>Shop All</span><span className="text-neutral-300">59</span>
            </Link>
            {collections.map((c) => (
              <Link key={c.handle} to={`/collections/${c.handle}`} onClick={onClose} className="sidebar-link">
                <span>{c.title}</span><span className="text-neutral-300">{c.count}</span>
              </Link>
            ))}
          </SidebarSection>

          <hr className="border-neutral-100" />

          <SidebarSection
            title="Artists"
            isOpen={isOpen('artists')}
            onToggle={() => toggleSection('artists')}
          >
            {artists.map((a) => (
              <Link key={a.handle} to={`/collections/${a.handle}`} onClick={onClose} className="sidebar-link">
                <span>{a.name}</span><span className="text-neutral-300">{a.works} works</span>
              </Link>
            ))}
            <Link to="/collections/artists" onClick={onClose} className="block py-2.5 text-[11px] font-medium text-neutral-800">
              View All Artists →
            </Link>
          </SidebarSection>

          <hr className="border-neutral-100" />

          <SidebarSection title="Info" isOpen={isOpen('info')} onToggle={() => toggleSection('info')}>
            {infoLinks.map((link) => (
              <Link key={link.href} to={link.href} onClick={onClose} className="block py-2.5 text-[11px] text-neutral-600 hover:text-neutral-900">
                {link.title}
              </Link>
            ))}
          </SidebarSection>
        </div>

        <div className="border-t border-neutral-100 px-6 py-5">
          <span className="text-[10px] text-neutral-400">@houseofspoils</span>
        </div>
      </aside>
    </div>
  );
}

/** @param {{title: string, isOpen: boolean, onToggle: () => void, children: import('react').ReactNode}} */
function SidebarSection({title, isOpen, onToggle, children}) {
  return (
    <div className="py-2">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-6 py-3 hover:bg-neutral-50">
        <span className="text-[12px] uppercase tracking-[0.15em] font-medium text-neutral-800">{title}</span>
        <ChevronRight size={14} className={`text-neutral-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && <div className="px-6 pb-2">{children}</div>}
    </div>
  );
}
