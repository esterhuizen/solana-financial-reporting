import React, { useState } from 'react';
import axios from 'axios';
import { FiTrash2, FiCopy, FiDownload } from 'react-icons/fi';

const WalletManager = ({ wallets, onWalletUpdated }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [fetchingId, setFetchingId] = useState(null);

  const handleRemoveWallet = async (walletId) => {
    try {
      setLoading(true);
      
      await axios.delete(`/api/wallet/${walletId}`);
      
      // Fetch updated wallets
      onWalletUpdated();
    } catch (err) {
      console.error('Error removing wallet:', err);
      setError(err.response?.data?.error || 'Failed to remove wallet address');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWalletTransactions = async (walletAddress, id) => {
    try {
      setFetchingId(id);
      setError('');
      
      await axios.post('/api/fetch-transactions', { address: walletAddress });
      
      // Show success message
      alert(`Successfully started fetching transactions for the last 365 days for wallet: ${walletAddress}`);
    } catch (err) {
      console.error('Error fetching wallet transactions:', err);
      setError(err.response?.data?.error || 'Failed to fetch wallet transactions');
    } finally {
      setFetchingId(null);
    }
  };
  
  const copyToClipboard = (walletAddress, id) => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {error && <p className="mb-4 text-red-500 text-sm">{error}</p>}
      
      {wallets.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg p-8 text-center border border-gray-700">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-gray-400">No wallets have been added yet</p>
        </div>
      ) : (
        <div className="rounded-md border border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-700">
            {wallets.map((wallet) => (
              <li key={wallet.id} className="px-4 py-3 flex justify-between items-center hover:bg-gray-800 transition duration-150">
                <div className="flex items-center flex-grow mr-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-700 flex items-center justify-center text-white font-medium mr-3">
                    W
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm text-white font-medium truncate max-w-[300px]" title={wallet.address}>
                      {wallet.address}
                    </div>
                    <div className="text-xs text-gray-400">
                      Added: {wallet.created_at ? new Date(wallet.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(wallet.address, wallet.id)}
                    className="text-gray-400 hover:text-blue-400 p-1.5 rounded hover:bg-blue-900/20 transition duration-150"
                    title="Copy wallet address"
                  >
                    {copiedId === wallet.id ? (
                      <span className="text-xs font-medium text-green-500">Copied!</span>
                    ) : (
                      <FiCopy size={16} />
                    )}
                  </button>
                  
                  <button
                    onClick={() => fetchWalletTransactions(wallet.address, wallet.id)}
                    className="text-gray-400 hover:text-green-400 p-1.5 rounded hover:bg-green-900/20 transition duration-150"
                    disabled={fetchingId === wallet.id}
                    title="Fetch transactions for last 365 days"
                  >
                    {fetchingId === wallet.id ? (
                      <span className="text-xs font-medium text-green-500">Fetching...</span>
                    ) : (
                      <FiDownload size={16} />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleRemoveWallet(wallet.id)}
                    className="text-gray-400 hover:text-red-400 p-1.5 rounded hover:bg-red-900/20 transition duration-150"
                    disabled={loading}
                    title="Remove wallet"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default WalletManager;