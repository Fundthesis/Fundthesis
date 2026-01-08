import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  return (
    <header className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-black">
            FundThesis
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-black transition-colors">
              Dashboard
            </Link>
            <Link href="/discover" className="text-gray-600 hover:text-black transition-colors">
              Discover
            </Link>
            <Link href="/learn" className="text-gray-600 hover:text-black transition-colors">
              Learn
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-black transition-colors">
              Profile
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;

