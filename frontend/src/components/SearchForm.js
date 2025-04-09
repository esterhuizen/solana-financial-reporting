import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import axios from 'axios';
import { FiPlusCircle, FiTrash2, FiEdit } from 'react-icons/fi';
import "react-datepicker/dist/react-datepicker.css";

const SearchForm = ({ wallets, onSearch, loading }) => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [selectedWallet, setSelectedWallet] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletDescription, setNewWalletDescription] = useState('');
  const [modalAction, setModalAction] = useState('add'); // 'add' or 'delete'
  const [selectedWalletToDelete, setSelectedWalletToDelete] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // If user selected the manage wallets option, redirect to wallet management page
    if (selectedWallet === '__manage_wallets') {
      if (typeof window !== 'undefined') {
        window.location.href = '/wallet-management';
      }
      return;
    }
    
    onSearch({
      startDate,
      endDate,
      walletAddress: selectedWallet
    });
  };

  const handleAddWallet = async () => {
    if (!newWalletAddress || newWalletAddress.trim() === '') {
      setModalError('Please enter a valid wallet address');
      return;
    }
    
    try {
      setModalLoading(true);
      setModalError('');
      
      await axios.post('/api/wallet', { 
        address: newWalletAddress,
        description: newWalletDescription || undefined
      });
      
      // Close modal and refresh wallets
      setNewWalletAddress('');
      setNewWalletDescription('');
      setShowWalletModal(false);
      
      // Trigger parent component to refresh wallets
      if (typeof window !== 'undefined') {
        window.location.reload(); // Simple refresh to update wallet list
      }
    } catch (err) {
      console.error('Error adding wallet:', err);
      setModalError(err.response?.data?.error || 'Failed to add wallet address');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteWallet = async () => {
    if (!selectedWalletToDelete) return;
    
    try {
      setModalLoading(true);
      setModalError('');
      
      await axios.delete(`/api/wallet/${selectedWalletToDelete.id}`);
      
      // Close modal and refresh wallets
      setShowWalletModal(false);
      setSelectedWalletToDelete(null);
      
      // Trigger parent component to refresh wallets
      if (typeof window !== 'undefined') {
        window.location.reload(); // Simple refresh to update wallet list
      }
    } catch (err) {
      console.error('Error removing wallet:', err);
      setModalError(err.response?.data?.error || 'Failed to remove wallet address');
    } finally {
      setModalLoading(false);
    }
  };

  const openAddWalletModal = () => {
    setModalAction('add');
    setNewWalletAddress('');
    setNewWalletDescription('');
    setModalError('');
    setShowWalletModal(true);
  };

  const openDeleteWalletModal = (wallet) => {
    setModalAction('delete');
    setSelectedWalletToDelete(wallet);
    setModalError('');
    setShowWalletModal(true);
  };

  return (
    <div className="h-full">
      <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-700">Search Criteria</h2>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="space-y-5 flex-grow">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              className="input w-full"
              dateFormat="yyyy-MM-dd"
              maxDate={new Date()}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              className="input w-full"
              dateFormat="yyyy-MM-dd"
              minDate={startDate}
              maxDate={new Date()}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Wallet Address</label>
            <div className="relative">
              <select
                className="input w-full pr-8"
                value={selectedWallet}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '__add_wallet') {
                    openAddWalletModal();
                  } else {
                    setSelectedWallet(value);
                  }
                }}
              >
                <option value="">All Wallets</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.address}>
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                  </option>
                ))}
                <option value="__add_wallet" disabled className="text-blue-500 font-semibold">
                  ── Wallet Options ──
                </option>
                <option value="__add_wallet" className="text-blue-500">
                  + Add New Wallet
                </option>
                <option value="__manage_wallets" className="text-blue-500">
                  ⚙ Manage Wallets
                </option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Select a specific wallet or view all
              </p>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={openAddWalletModal}
                  className="text-blue-500 hover:text-blue-400 text-xs flex items-center"
                >
                  <FiPlusCircle className="mr-1" size={12} /> Add
                </button>
                {selectedWallet && selectedWallet !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      const wallet = wallets.find(w => w.address === selectedWallet);
                      if (wallet) openDeleteWalletModal(wallet);
                    }}
                    className="text-red-500 hover:text-red-400 text-xs flex items-center"
                    disabled={!selectedWallet || selectedWallet === ''}
                  >
                    <FiTrash2 className="mr-1" size={12} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Quick Filters</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  // Last 7 days
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 7);
                  setStartDate(start);
                  setEndDate(end);
                }}
                className="text-xs py-1.5 px-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  // Last 30 days
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 30);
                  setStartDate(start);
                  setEndDate(end);
                }}
                className="text-xs py-1.5 px-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  // Current month
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth(), 1);
                  setStartDate(start);
                  setEndDate(now);
                }}
                className="text-xs py-1.5 px-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => {
                  // Last month
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const end = new Date(now.getFullYear(), now.getMonth(), 0);
                  setStartDate(start);
                  setEndDate(end);
                }}
                className="text-xs py-1.5 px-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
              >
                Last Month
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-150 flex justify-center items-center"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </span>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>
      </form>

      {/* Wallet Management Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">
              {modalAction === 'add' ? 'Add New Wallet' : 'Remove Wallet'}
            </h3>
            
            {modalError && (
              <div className="bg-red-900/70 text-white px-4 py-2 rounded mb-4 text-sm">
                {modalError}
              </div>
            )}
            
            {modalAction === 'add' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Solana wallet address"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    disabled={modalLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Add a description or note"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    value={newWalletDescription}
                    onChange={(e) => setNewWalletDescription(e.target.value)}
                    disabled={modalLoading}
                  />
                </div>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-gray-300 mb-3">
                  Are you sure you want to remove this wallet?
                </p>
                {selectedWalletToDelete && (
                  <div className="bg-gray-700 p-3 rounded mb-3 text-white break-all">
                    {selectedWalletToDelete.address}
                  </div>
                )}
                <p className="text-sm text-gray-400">
                  This will remove the wallet from tracking. This action cannot be undone.
                </p>
              </div>
            )}
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={modalAction === 'add' ? handleAddWallet : handleDeleteWallet}
                className={`px-4 py-2 ${
                  modalAction === 'add' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white rounded flex items-center`}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  modalAction === 'add' ? 'Add Wallet' : 'Remove Wallet'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchForm;