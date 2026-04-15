'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/venues', label: 'Venues' },
  { href: '/artists', label: 'Artists' },
  { href: '/ai-test', label: 'Create Venue' },
  { href: '/events', label: 'Events' },
  { href: '/specials', label: 'Specials' },
  { href: '/users', label: 'Users' },
];

export default function AdminHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-light">
      <nav className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-3 items-center">
          {/* Logo - Left */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="LOKI" className="h-8 w-auto" />
              <span className="text-xl font-heading font-bold text-neutral">LOKI</span>
            </Link>
          </div>

          {/* Nav - Center (desktop) */}
          <div className="hidden md:flex items-center justify-center space-x-6 lg:space-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <button
                type="button"
                onClick={() => signOut()}
                className="text-sm font-body text-text-paragraph hover:text-primary"
              >
                Sign out
              </button>
            )}
          </div>

          {/* Right - Mobile menu button */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              className="md:hidden p-2 text-neutral"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <button
                type="button"
                onClick={() => { signOut(); setIsMenuOpen(false); }}
                className="block w-full text-left text-sm font-body text-text-paragraph hover:text-primary"
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
