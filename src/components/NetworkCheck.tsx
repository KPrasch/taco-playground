'use client';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const POLYGON_AMOY_CHAIN_ID = '0x1389'; // 5001 in decimal
const POLYGON_AMOY = {
  chainId: POLYGON_AMOY_CHAIN_ID,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.amoy.pol.dev'],
  blockExplorerUrls: ['https://www.oklink.com/amoy'],
};

const NetworkCheck: React.FC = () => {
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) {
        setIsLoading(false);
        return;
      }

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        setIsWrongNetwork(network.chainId !== 5001); // Compare with decimal chain ID
        setIsLoading(false);

        // Listen for network changes
        window.ethereum.on('chainChanged', (chainId: string) => {
          setIsWrongNetwork(parseInt(chainId, 16) !== 5001);
        });
      } catch (error) {
        console.error('Error checking network:', error);
        setIsLoading(false);
      }
    };

    checkNetwork();

    // Cleanup listener
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  const switchNetwork = async () => {
    if (!window.ethereum) return;

    try {
      // First try to add the chain
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [POLYGON_AMOY],
        });
      } catch (addError) {
        console.error('Error adding chain:', addError);
      }

      // Then try to switch to it
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
      });
    } catch (error) {
      console.error('Error switching chain:', error);
    }
  };

  if (isLoading || !isWrongNetwork) return null;

  return (
    <div className="bg-yellow-900/50 border-b border-yellow-700">
      <div className="max-w-7xl mx-auto py-3 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <svg 
              className="w-5 h-5 text-yellow-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <p className="text-sm text-yellow-300">
              Please switch to Polygon Amoy testnet to use this application
            </p>
          </div>
          <button
            onClick={switchNetwork}
            className="px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 
              text-white rounded-md transition-colors"
          >
            Switch Network
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkCheck; 