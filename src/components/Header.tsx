import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';

export type AppRoute = 'shop' | 'categories' | 'track' | 'account' | 'admin' | 'checkout';

interface HeaderProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  cartCount: number;
  onOpenCart: () => void;
}

const NAV_ITEMS: { id: AppRoute; label: string }[] = [
  { id: 'shop', label: 'Shop' },
  { id: 'categories', label: 'Categories' },
  { id: 'track', label: 'Track Order' },
  { id: 'account', label: 'Account' },
  { id: 'admin', label: 'Admin' },
];

export function Header({ activeRoute, onNavigate, cartCount, onOpenCart }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (route: AppRoute) => {
    setMobileMenuOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur-sm border-b border-[#E4E4E7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNav('shop')}
          className="font-display text-xl font-bold tracking-tight text-[#18181B] whitespace-nowrap shrink-0 hover:text-[#065F46] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#065F46]"
        >
          Kipepeo Market
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const isActive =
              activeRoute === item.id || (activeRoute === 'checkout' && item.id === 'shop');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#065F46] ${
                  isActive
                    ? 'text-[#18181B] border-[#065F46]'
                    : 'text-[#52525B] border-transparent hover:text-[#18181B] hover:border-[#D4D4D8]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action button (+ mobile nav trigger on < md) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#065F46] text-white text-sm font-medium hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#065F46]"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>Bag</span>
            <span className="tabular-nums font-mono text-xs bg-white/15 px-1.5 py-0.5 rounded">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-[#E4E4E7] bg-white px-4 py-3 flex flex-col gap-1"
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#065F46]/10 text-[#065F46]'
                    : 'text-[#3F3F46] hover:bg-[#F4F4F5]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
