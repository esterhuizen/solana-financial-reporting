import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import UserHeader from '@/components/auth/UserHeader';
import WalletManager from '@/components/WalletManager';
import { useAuth } from '@/context/AuthContext';

export default function WalletManagement() {
  const [wallets, setWallets] = useState([]);
  const [error, setError] = useState('');
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletDescription, setNewWalletDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch wallets on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchWallets();
    }
  }, [isAuthenticated]);

  const fetchWallets = async () => {
    try {
      const response = await axios.get('/api/wallets');
      setWallets(response.data);
    } catch (err) {
      console.error('Error fetching wallets:', err);
      setError('Failed to load wallet data. Please try again later.');
    }
  };
  
  const handleAddWallet = async (e) => {
    e.preventDefault();
    
    // Validate the wallet address
    if (!newWalletAddress || newWalletAddress.trim() === '') {
      setError('Please enter a valid wallet address');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Add wallet to the system
      await axios.post('/api/wallet', { 
        address: newWalletAddress,
        description: newWalletDescription || undefined
      });
      
      // Reset form and fetch updated wallets
      setNewWalletAddress('');
      setNewWalletDescription('');
      fetchWallets();
    } catch (err) {
      console.error('Error adding wallet:', err);
      setError(err.response?.data?.error || 'Failed to add wallet address');
    } finally {
      setLoading(false);
    }
  };

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

  // Don't render the main content if not authenticated
  if (!isAuthenticated) {
    return <div style={{ display: 'none' }}></div>;
  }

  return (
    <>
      <Head>
        <title>Wallet Management - Financial Reporting System</title>
        <meta name="description" content="Manage wallet addresses for financial reporting" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />
        <UserHeader />
        <Navigation />

        <main className="flex-grow w-full px-4 py-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Wallet Management</h1>
              
              {error && (
                <div className="bg-red-900 text-white px-4 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form to add new wallets */}
              <div className="lg:col-span-5">
                <div className="card h-full">
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-700">Add New Wallet</h2>
                  <form onSubmit={handleAddWallet} className="space-y-4">
                    <div>
                      <label htmlFor="wallet-address" className="block text-sm font-medium text-gray-400 mb-1">
                        Wallet Address
                      </label>
                      <input
                        type="text"
                        id="wallet-address"
                        placeholder="Enter Solana wallet address"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        value={newWalletAddress}
                        onChange={(e) => setNewWalletAddress(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="wallet-description" className="block text-sm font-medium text-gray-400 mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        id="wallet-description"
                        placeholder="Add a description or note"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        value={newWalletDescription}
                        onChange={(e) => setNewWalletDescription(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-150"
                      disabled={loading}
                    >
                      {loading ? 'Adding...' : 'Add Wallet'}
                    </button>
                  </form>
                  
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">About Wallet Tracking</h3>
                    <p className="text-xs text-gray-400">
                      Adding a wallet allows the system to track all transactions related to that address.
                      This is useful for monitoring specific accounts for compliance purposes.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Wallet list */}
              <div className="lg:col-span-7">
                <div className="card h-full">
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-700 flex items-center justify-between">
                    <span>Tracked Wallets</span>
                    <span className="text-sm font-normal text-gray-400">{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</span>
                  </h2>
                  <WalletManager 
                    wallets={wallets} 
                    onWalletUpdated={fetchWallets} 
                  />
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