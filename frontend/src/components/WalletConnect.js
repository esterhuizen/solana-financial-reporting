import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const WalletConnect = () => {
  const { publicKey, connected, wallet, connecting } = useWallet();
  const [connectionError, setConnectionError] = useState('');

  // Clear any connection errors when connection status changes
  useEffect(() => {
    if (connected) {
      setConnectionError('');
    }
  }, [connected]);

  // Handle wallet connection status for better user feedback
  useEffect(() => {
    if (wallet && !connected && !connecting) {
      // This could indicate a connection attempt that failed
      const checkConnection = setTimeout(() => {
        setConnectionError('Connection to wallet failed. Please try again.');
      }, 3000);
      
      return () => clearTimeout(checkConnection);
    }
  }, [wallet, connected, connecting]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-center mb-8">
            <svg 
              className="h-16 w-16 text-app-accent"
              viewBox="0 0 397 311"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
            >
              <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h320.3c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zM64.6 3.8C67.1 1.4 70.4 0 73.8 0h320.3c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8zM333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H3.6c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h320.3c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Connect Your Wallet
          </h2>
          
          <p className="text-gray-300 mb-6 text-center">
            Please connect your Solana wallet to access the financial reporting tool.
          </p>
          
          <div className="flex justify-center my-8">
            {/* This is a pre-styled button from Solana wallet adapter */}
            <WalletMultiButton className="wallet-adapter-button-custom" />
          </div>
          
          {connecting && (
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                <p className="text-blue-400 text-sm font-medium">Connecting to wallet...</p>
              </div>
            </div>
          )}
          
          {connectionError && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded text-center">
              <p className="text-red-400 text-sm font-medium">{connectionError}</p>
              <button 
                onClick={() => setConnectionError('')}
                className="text-xs text-red-400 underline mt-1 hover:text-red-300"
              >
                Dismiss
              </button>
            </div>
          )}
          
          {connected && publicKey && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-800 rounded text-center">
              <p className="text-green-400 text-sm font-medium">
                Wallet connected! Address: {publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}
              </p>
            </div>
          )}
          
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>Your connection is secure and your data is private.</p>
            <p className="mt-2">Required wallet: Phantom</p>
          </div>
          
          {/* Troubleshooting help */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <details className="text-sm text-gray-400">
              <summary className="cursor-pointer hover:text-gray-300">Troubleshooting connection issues</summary>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Make sure you have Phantom wallet installed</li>
                <li>Ensure your wallet is unlocked</li>
                <li>Refresh the page if connection fails</li>
                <li>Check that your wallet is connected to Solana Mainnet</li>
                <li>Disable any other wallet extensions that might interfere</li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;