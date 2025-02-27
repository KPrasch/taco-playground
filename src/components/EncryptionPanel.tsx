'use client';

import React, { useState } from 'react';
import { encrypt, conditions, ThresholdMessageKit } from '@nucypher/taco';
import { ethers } from 'ethers';
import { TacoCondition } from '../types/taco';
import { SettingsConfig } from './Settings';

interface EncryptionPanelProps {
  condition: TacoCondition | null;
  onMessageKitGenerated: (messageKit: ThresholdMessageKit, ciphertextString: string) => void;
  onError: (error: string) => void;
  settings: SettingsConfig;
}

const EncryptionPanel: React.FC<EncryptionPanelProps> = ({ 
  condition,
  onMessageKitGenerated,
  onError,
  settings
}) => {
  const [message, setMessage] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleEncrypt = async () => {
    if (!condition || !message) return;

    try {
      setIsEncrypting(true);
      
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const signer = provider.getSigner();

      console.log('Using condition:', JSON.stringify(condition, null, 2));

      // Create the appropriate condition instance based on type
      let tacoCondition;
      switch (condition.conditionType) {
        case 'compound':
          tacoCondition = new conditions.compound.CompoundCondition(condition);
          break;
        case 'rpc':
          tacoCondition = new conditions.base.rpc.RpcCondition(condition);
          break;
        case 'contract':
          tacoCondition = new conditions.base.contract.ContractCondition(condition);
          break;
        case 'time':
          tacoCondition = new conditions.base.time.TimeCondition(condition);
          break;
        case 'json-rpc':
          tacoCondition = new conditions.base.jsonRpc.JsonRpcCondition(condition);
          break;
        default:
          throw new Error('Unsupported condition type');
      }

      const messageKit = await encrypt(
        provider,
        settings.domain,
        message,
        tacoCondition,
        settings.ritualId,
        signer
      );

      console.log('Generated message kit:', {
        messageKit,
        keys: Object.keys(messageKit),
        stringified: JSON.stringify(messageKit)
      });

      // Convert the message kit to bytes and then to base64
      const messageKitBytes = messageKit.toBytes();
      const messageKitString = btoa(String.fromCharCode(...Array.from(messageKitBytes)));
      console.log('Base64 message kit:', messageKitString);
      
      onMessageKitGenerated(messageKit, messageKitString);
      setMessage(''); // Clear the input after successful encryption
    } catch (error) {
      console.error('Encryption error:', error);
      onError(error instanceof Error ? error.message : 'Failed to encrypt message');
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleClear = () => {
    setMessage('');
  };

  return (
    <div className="space-y-6 p-6 bg-white/[0.02] border border-white/10 rounded-lg shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex justify-between items-center border-b border-white/10 -mx-6 px-6 py-4 -mt-6 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            <svg className="w-5 h-5 text-taco" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-sm font-diatype font-bold text-white tracking-wide uppercase">Encrypt</h3>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-diatype font-bold text-white/80">
              Message to encrypt:
            </label>
            {message && (
              <button
                onClick={handleClear}
                className="px-2 py-1 text-xs bg-white/5 text-white/60 rounded
                  hover:bg-white/10 hover:text-white/80 transition-all duration-200
                  flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear</span>
              </button>
            )}
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter plaintext to encrypt..."
            autoComplete="off"
            data-form-type="other"
            className="w-full h-24 px-3 py-2 bg-white/5 text-white border border-white/5 rounded-lg
              placeholder-white/30 font-mono text-sm
              focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-white/10
              transition-all duration-200"
          />
        </div>

        <button
          onClick={handleEncrypt}
          disabled={!message || isEncrypting}
          className="w-full px-4 py-3 bg-white/5 text-white rounded-lg font-diatype font-bold
            border border-white/10 transition-all duration-200
            hover:bg-white/10 hover:border-white/20
            focus:outline-none focus:ring-1 focus:ring-white/20
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEncrypting ? 'Encrypting...' : 'Encrypt Message'}
        </button>
      </div>
    </div>
  );
};

export default EncryptionPanel; 