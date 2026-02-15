import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { COMPANY_INFO } from '../utils/constants';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white">
      <nav className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-3 items-center">
          {/* Logo - Left */}
          <div className="flex items-center">
            <a href="#home" className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt={COMPANY_INFO.name} 
                className="h-8 w-auto"
              />
              <span className="text-xl font-heading font-bold text-neutral">
                {COMPANY_INFO.name}
              </span>
            </a>
          </div>

          {/* Navigation Links - Center */}
          <div className="hidden md:flex items-center justify-center space-x-6 lg:space-x-8">
            <a
              href="#problem"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('problem');
              }}
              className="text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap"
            >
              Problem
            </a>
            <a
              href="#solution"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('solution');
              }}
              className="text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap"
            >
              Solution
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('how-it-works');
              }}
              className="text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap"
            >
              How It Works
            </a>
            <a
              href="#for-creators"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('for-creators');
              }}
              className="text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap"
            >
              For Creators
            </a>
            <a
              href="#cta"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('cta');
              }}
              className="text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap"
            >
              Contact Us
            </a>
          </div>

          {/* Right - Mobile Menu Button */}
          <div className="flex items-center justify-end">
            <button
              className="md:hidden p-2 text-neutral"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <a
              href="#problem"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('problem');
              }}
              className="block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors"
            >
              Problem
            </a>
            <a
              href="#solution"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('solution');
              }}
              className="block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors"
            >
              Solution
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('how-it-works');
              }}
              className="block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#for-creators"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('for-creators');
              }}
              className="block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors"
            >
              For Creators
            </a>
            <a
              href="#cta"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('cta');
              }}
              className="block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors"
            >
              Contact Us
            </a>
          </div>
        )}
      </nav>
    </header>
  );
};
