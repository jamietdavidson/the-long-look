import {Link} from 'react-router';

export function SpoilsFooter() {
  return (
    <footer className="bg-neutral-950 text-white py-16 px-6 md:px-10 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-6">The Long Look</h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Ready-to-hang photography from the world&apos;s top artists. The art of living.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-4">Shop</h4>
            <nav className="space-y-3">
              <FooterLink to="/collections/all">All Prints</FooterLink>
              <FooterLink to="/collections/new-arrivals">New Arrivals</FooterLink>
              <FooterLink to="/collections/best-sellers">Best Sellers</FooterLink>
              <FooterLink to="/collections/artists">Artists</FooterLink>
            </nav>
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-4">Info</h4>
            <nav className="space-y-3">
              <FooterLink to="/about">About Us</FooterLink>
              <FooterLink to="/shipping">Shipping & Returns</FooterLink>
              <FooterLink to="/faq">FAQ</FooterLink>
              <FooterLink to="/contact">Contact</FooterLink>
            </nav>
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-4">Connect</h4>
            <nav className="space-y-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="block text-[11px] text-neutral-300 hover:text-white">Instagram</a>
              <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="block text-[11px] text-neutral-300 hover:text-white">Pinterest</a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="block text-[11px] text-neutral-300 hover:text-white">Facebook</a>
            </nav>
          </div>
        </div>
        <div className="border-t border-neutral-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-neutral-500">&copy; {new Date().getFullYear()} The Long Look. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/terms">Terms of Service</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** @param {{to: string, children: import('react').ReactNode}} */
function FooterLink({to, children}) {
  return (
    <Link to={to} className="block text-[11px] text-neutral-300 hover:text-white transition-colors">
      {children}
    </Link>
  );
}
