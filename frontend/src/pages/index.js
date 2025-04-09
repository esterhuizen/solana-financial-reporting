import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import SearchForm from '@/components/SearchForm';
import TransactionTable from '@/components/TransactionTable';
import ExchangeRateDisplay from '@/components/ExchangeRateDisplay';
import UserHeader from '@/components/auth/UserHeader';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState('');
  const [searchDates, setSearchDates] = useState({
    startDate: null,
    endDate: null
  });
  
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

  const handleSearch = async (searchParams) => {
    // Check if special wallet options were selected
    if (searchParams.walletAddress === '__add_wallet') {
      // Handled by the SearchForm component directly
      return;
    }
    
    if (searchParams.walletAddress === '__manage_wallets') {
      router.push('/wallet-management');
      return;
    }
    
    setLoading(true);
    setError('');
    setSearchPerformed(true);
    
    // Save search dates for exchange rate component
    setSearchDates({
      startDate: searchParams.startDate,
      endDate: searchParams.endDate
    });

    try {
      // Format dates for API
      const formattedStartDate = searchParams.startDate.toISOString().split('T')[0];
      
      // Set end date to include the entire day (23:59:59)
      const endDateWithTime = new Date(searchParams.endDate);
      endDateWithTime.setHours(23, 59, 59, 999);
      const formattedEndDate = endDateWithTime.toISOString().split('T')[0] + 'T23:59:59';

      // Build query params
      const params = {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      };

      if (searchParams.walletAddress && searchParams.walletAddress !== '') {
        params.walletAddress = searchParams.walletAddress;
      }

      const response = await axios.get('/api/transactions', { params });
      setTransactions(response.data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transaction data. Please try again later.');
      setTransactions([]);
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
        <title>Financial Reports - Financial Reporting System</title>
        <meta name="description" content="View financial transaction reports" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />
        <UserHeader />
        <Navigation />

        <main className="flex-grow w-full px-4 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Transaction Reports</h1>
              
              {error && (
                <div className="bg-red-900 text-white px-4 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Vertical search form in a sidebar */}
              <div className="lg:col-span-3 lg:order-1">
                <div className="card sticky top-4">
                  <SearchForm 
                    wallets={wallets} 
                    onSearch={handleSearch} 
                    loading={loading} 
                  />
                </div>
              </div>
              
              {/* Main content area */}
              <div className="lg:col-span-9 lg:order-2">
                {!searchPerformed ? (
                  <div className="h-full bg-gray-800/50 rounded-lg p-8 text-center border border-gray-700 flex flex-col justify-center items-center min-h-[400px]">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-xl font-medium text-gray-300 mb-2">No Report Generated Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto">Use the search panel on the left to select date range and wallet criteria, then click "Generate Report".</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Exchange rate information */}
                    <div className="card overflow-hidden">
                      <div className="border-b border-gray-700">
                        <ExchangeRateDisplay 
                          startDate={searchDates.startDate} 
                          endDate={searchDates.endDate} 
                        />
                      </div>
                    </div>
                    
                    {/* Transaction results */}
                    <div className="card">
                      <TransactionTable 
                        transactions={transactions} 
                        loading={loading} 
                      />
                    </div>
                  </div>
                )}
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