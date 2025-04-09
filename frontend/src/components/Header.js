import React from 'react';
import Link from 'next/link';

const Header = () => {
  return (
    <header className="bg-app-darker py-4 border-b border-gray-800">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div>
          <Link href="/" className="no-underline">
            <h1 className="text-2xl font-bold text-white">Financial Reporting System</h1>
            <p className="text-gray-400">Transaction reporting for compliance</p>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;