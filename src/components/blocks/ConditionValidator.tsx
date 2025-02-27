'use client';

import React from 'react';
import { conditions } from '@nucypher/taco';
import { TacoCondition, ChainId } from '../../types/taco';

// Define supported chains (can be moved to a shared constants file)
const SUPPORTED_CHAINS = [
  { id: 137, name: 'Polygon Mainnet' },
  { id: 80002, name: 'Polygon Amoy' },
  { id: 11155111, name: 'Sepolia' },
  { id: 1, name: 'Ethereum Mainnet' }
] as const;

interface ConditionValidatorProps {
  condition: TacoCondition | null;
}

const ConditionValidator: React.FC<ConditionValidatorProps> = ({ condition }) => {
  const validateCondition = React.useCallback((cond: TacoCondition | null): boolean => {
    if (!cond) return false;

    try {
      // Handle compound conditions
      if (cond.conditionType === 'compound') {
        if (!cond.operator || !cond.operands || !Array.isArray(cond.operands)) {
          return false;
        }
        // Validate each operand recursively
        return cond.operands.every(operand => validateCondition(operand));
      }

      // Validate chain ID for on-chain conditions
      if ('chain' in cond && !SUPPORTED_CHAINS.some(chain => chain.id === cond.chain)) {
        console.error(`Unsupported chain ID: ${cond.chain}`);
        return false;
      }

      // Handle different condition types
      switch (cond.conditionType) {
        case 'rpc': {
          if (cond.method === 'eth_getBalance') {
            if (!Array.isArray(cond.parameters) || cond.parameters.length !== 2 ||
                cond.parameters[0] !== ':userAddress' || cond.parameters[1] !== 'latest') {
              return false;
            }
            new conditions.base.rpc.RpcCondition({
              chain: cond.chain as ChainId,
              method: cond.method,
              parameters: cond.parameters,
              returnValueTest: cond.returnValueTest
            });
            return true;
          }
          return false;
        }

        case 'time': {
          new conditions.base.time.TimeCondition({
            chain: cond.chain as ChainId,
            method: cond.method,
            returnValueTest: cond.returnValueTest
          });
          return true;
        }

        case 'contract': {
          if (!cond.contractAddress || !cond.method) {
            return false;
          }

          // Create base contract condition
          const baseCondition = {
            chain: cond.chain as ChainId,
            contractAddress: cond.contractAddress,
            method: cond.method,
            parameters: cond.parameters,
            returnValueTest: cond.returnValueTest
          };

          // Only add standardContractType if it's ERC20 or ERC721
          if (cond.standardContractType === 'ERC20' || cond.standardContractType === 'ERC721') {
            Object.assign(baseCondition, { standardContractType: cond.standardContractType });
          }

          // Add functionAbi if present and properly formatted
          if (cond.functionAbi) {
            Object.assign(baseCondition, { functionAbi: cond.functionAbi });
          }

          new conditions.base.contract.ContractCondition(baseCondition);
          return true;
        }

        case 'json-rpc': {
          // Create base json rpc condition
          const baseCondition = {
            endpoint: cond.endpoint,
            method: cond.method,
            returnValueTest: cond.returnValueTest
          };

          if (cond.params) {
            Object.assign(baseCondition, { params: cond.params });
          }
          if (cond.query) {
            Object.assign(baseCondition, { query: cond.query });
          }
          if (cond.authorizationToken) {
            Object.assign(baseCondition, { authorizationToken: cond.authorizationToken });
          }
          new conditions.base.jsonRpc.JsonRpcCondition(baseCondition);
          return true;
        }

        default:
          return false;
      }
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }, []);

  const isValid = React.useMemo(() => {
    console.log('Validating condition:', condition);
    return validateCondition(condition);
  }, [condition, validateCondition]);

  return (
    <div className="flex items-center gap-2">
      {isValid ? (
        <>
          <svg 
            className="w-5 h-5 text-green-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
          <span className="text-sm text-green-500">Valid condition</span>
        </>
      ) : (
        <>
          <svg 
            className="w-5 h-5 text-red-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
          <span className="text-sm text-red-500">Invalid condition</span>
        </>
      )}
    </div>
  );
};

export default ConditionValidator; 