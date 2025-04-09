import React from 'react';
import { useAuth } from '@/context/AuthContext';

const UserHeader = () => {
  const { user, logout, isAdmin } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-app-darker border-b border-gray-800 px-4 py-2">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-sm text-gray-400 mr-2">Logged in as:</span>
          <span className="text-sm font-medium text-app-accent">
            {user.username}
          </span>
          {isAdmin && (
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-900 text-blue-300">
              Admin
            </span>
          )}
        </div>
        <div className="flex items-center">
          <button
            onClick={logout}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserHeader;