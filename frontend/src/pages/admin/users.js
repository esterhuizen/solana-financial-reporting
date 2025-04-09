import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import UserHeader from '@/components/auth/UserHeader';
import UserManagement from '@/components/auth/UserManagement';
import { useAuth } from '@/context/AuthContext';

export default function Users() {
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else if (!isAdmin) {
        router.push('/');
      }
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the main content if not authenticated or not an admin
  if (!isAuthenticated || !isAdmin) {
    // Instead of returning null, which might cause re-renders,
    // return a minimal non-visible component
    return <div style={{ display: 'none' }}></div>;
  }

  return (
    <>
      <Head>
        <title>User Management - Financial Reporting System</title>
        <meta name="description" content="Manage users for financial reporting system" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />
        <UserHeader />
        <Navigation />

        <main className="flex-grow w-full px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">User Management</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* User creation form */}
              <div className="lg:col-span-4">
                <div className="card h-full">
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-700">Add New User</h2>
                  
                  <form className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        id="username"
                        placeholder="Enter username"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        placeholder="Create a password"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is-admin"
                        className="h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500"
                      />
                      <label htmlFor="is-admin" className="ml-2 text-sm text-gray-300">
                        Administrator
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-150"
                    >
                      Create User
                    </button>
                  </form>
                  
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">Access Levels</h3>
                    <div className="space-y-2 text-xs text-gray-400">
                      <p>
                        <span className="font-semibold text-blue-400">Standard User:</span> Can view reports and manage wallets.
                      </p>
                      <p>
                        <span className="font-semibold text-blue-400">Administrator:</span> Can perform all actions including user management.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* User list and management */}
              <div className="lg:col-span-8">
                <div className="card h-full">
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-700">System Users</h2>
                  <UserManagement />
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-app-darker border-t border-gray-800 py-6">
          <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} Financial Reporting System</p>
            <p className="mt-1">For internal compliance use only</p>
          </div>
        </footer>
      </div>
    </>
  );
}