import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

const Navigation = () => {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const isActive = (path) => {
    return router.pathname === path ? 'bg-gray-700' : '';
  };

  return (
    <nav className="bg-app-darker border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex space-x-4 py-2">
          <Link
            href="/"
            className={`px-3 py-2 rounded-md text-sm font-medium text-white ${isActive('/')}`}
          >
            Reports
          </Link>

          <Link
            href="/wallet-management"
            className={`px-3 py-2 rounded-md text-sm font-medium text-white ${isActive('/wallet-management')}`}
          >
            Wallet Management
          </Link>

          {isAdmin && (
            <Link
              href="/admin/users"
              className={`px-3 py-2 rounded-md text-sm font-medium text-white ${isActive('/admin/users')}`}
            >
              User Management
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;