'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentPage?: 'home' | 'login' | 'register';
}

export default function Navbar({ currentPage = 'home' }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Header - Fixed navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1E293B]/95 backdrop-blur-xl border-b border-[#334155]/50">
        <div className="max-w-7xl mx-auto px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 min-[400px]:h-14 md:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center group flex-shrink-0 min-w-0">
              <div className="relative flex-shrink-0">
                <Shield className="h-6 w-6 min-[400px]:h-7 min-[400px]:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-[#00D4FF] mr-1.5 min-[400px]:mr-2 sm:mr-2.5 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-[#00D4FF]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <span className="text-base min-[360px]:text-lg min-[400px]:text-xl sm:text-2xl md:text-[1.7rem] font-bold bg-gradient-to-r from-white to-[#00D4FF] bg-clip-text text-transparent truncate">
                Secura
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden sm:flex items-center space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-6 flex-shrink-0">
              {currentPage !== 'home' && (
                <Link href="/" className="text-gray-300 hover:text-[#00D4FF] transition-all duration-300 font-medium px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D4FF]/10 text-xs sm:text-sm md:text-base whitespace-nowrap">
                  Home
                </Link>
              )}
              {currentPage !== 'login' && (
                <Link href="/auth/login" className="text-gray-300 hover:text-[#00D4FF] transition-all duration-300 font-medium px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D4FF]/10 text-xs sm:text-sm md:text-base whitespace-nowrap">
                  Login
                </Link>
              )}
              {currentPage !== 'register' && (
                <Link href="/auth/register" className="bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#3B82F6] px-2.5 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-[#00D4FF]/25 hover:scale-105 text-xs sm:text-sm md:text-base whitespace-nowrap">
                  Get Started
                </Link>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="sm:hidden p-1.5 min-[400px]:p-2 rounded-lg text-gray-300 hover:text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-all duration-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5 min-[400px]:h-6 min-[400px]:w-6" /> : <Menu className="h-5 w-5 min-[400px]:h-6 min-[400px]:w-6" />}
            </button>
          </div>

          {/* Mobile Navigation Dropdown */}
          <div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-48 pb-3 min-[400px]:pb-4' : 'max-h-0'}`}>
            <nav className="flex flex-col space-y-2">
              {currentPage !== 'home' && (
                <Link
                  href="/"
                  className="text-gray-300 hover:text-[#00D4FF] transition-all duration-300 font-medium px-3 min-[400px]:px-4 py-2.5 min-[400px]:py-3 rounded-lg hover:bg-[#00D4FF]/10 text-center text-sm min-[400px]:text-base"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
              )}
              {currentPage !== 'login' && (
                <Link
                  href="/auth/login"
                  className="text-gray-300 hover:text-[#00D4FF] transition-all duration-300 font-medium px-3 min-[400px]:px-4 py-2.5 min-[400px]:py-3 rounded-lg hover:bg-[#00D4FF]/10 text-center text-sm min-[400px]:text-base"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
              )}
              {currentPage !== 'register' && (
                <Link
                  href="/auth/register"
                  className="bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#3B82F6] px-4 min-[400px]:px-6 py-2.5 min-[400px]:py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-[#00D4FF]/25 text-center text-sm min-[400px]:text-base"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-12 min-[400px]:h-14 md:h-16"></div>
    </>
  );
}
