import { Block } from './BlockTypes';
import { TacoCondition, TimeCondition, ContractCondition, RpcCondition, CompoundCondition, ChainId, ReturnValueTest, JsonRpcCondition } from '../../types/taco';
import { utils } from 'ethers';

// Helper function to convert an address to EIP-55 checksum format using ethers.js
export const toChecksumAddress = (address: string): string => {
  if (!address || typeof address !== 'string') {
    return address;
  }
  
  try {
    // Ensure the address has the 0x prefix
    const addressWith0x = address.startsWith('0x') ? address : `0x${address}`;
    return utils.getAddress(addressWith0x);
  } catch (error) {
    // If the address is invalid, return it as is
    return address;
  }
};

// Helper function to check if a chain ID is valid
const isValidChainId = (chainId: number): chainId is ChainId => {
  // Allow any valid number as a chain ID
  return !isNaN(chainId) && Number.isInteger(chainId) && chainId > 0;
};

// Helper function to safely convert a string to ChainId
const parseChainId = (value: string): ChainId => {
  // Ensure we're working with a trimmed string
  const trimmedValue = value.trim();
  
  // If the value is empty, return the default
  if (!trimmedValue) {
    return 11155111; // Default to Sepolia
  }
  
  const parsed = parseInt(trimmedValue);
  
  // Check if the parsed value is a valid chain ID (any positive integer)
  if (!isNaN(parsed) && Number.isInteger(parsed) && parsed > 0) {
    // Cast to ChainId type - this is safe since we're allowing any positive integer
    return parsed as ChainId;
  }
  
  // Default to Sepolia if invalid
  return 11155111;
};

// Helper function for checking whether a string is actually numeric
export function isNumericString(value: string): boolean {
  return !isNaN(Number(value));
}

export const blocksToJson = (blocks: Block[]): TacoCondition | null => {
  if (!blocks.length) return null;

  // Find the first standalone condition or operator block
  const rootBlock = blocks.find(block => 
    (block.type === 'condition' || block.type === 'operator') && 
    !blocks.some(b => 
      b.type === 'operator' && 
      b.inputs?.some(input => input.connected?.id === block.id)
    )
  );

  if (!rootBlock) return null;

  // Recursively convert blocks to JSON
  return blockToJson(rootBlock);
};

const blockToJson = (block: Block): TacoCondition | null => {
  if (!block) return null;

  if (block.type === 'operator') {
    // Handle operator blocks (AND/OR)
    const operands = block.inputs
      ?.filter(input => input.connected)
      .map(input => blockToJson(input.connected!))
      .filter(Boolean) as TacoCondition[];

    if (!operands?.length) return null;

    return {
      conditionType: 'compound',
      operator: (block.properties?.operator || 'and') as 'and' | 'or' | 'not',
      operands
    } as CompoundCondition;
  } else if (block.type === 'condition') {
    // Handle condition blocks
    const conditionType = block.properties?.conditionType as 'time' | 'contract' | 'rpc' | 'json-rpc';
    if (!conditionType) return null;

    if (conditionType === 'time') {
      // Time condition
      const timeCondition: TimeCondition = {
        conditionType: 'time',
        chain: 11155111, // Default to Sepolia
        method: 'blocktime',
        returnValueTest: {
          comparator: '>=',
          value: 0
        }
      };
      
      // Add chain ID if present
      const chainInput = block.inputs?.find(input => input.id === 'chain');
      if (chainInput?.value !== undefined) {
        // Even if the value is empty, we want to process it through parseChainId
        // which will handle empty values appropriately
        timeCondition.chain = parseChainId(chainInput.value);
      }
      
      // Add timestamp if present
      const timestampInput = block.inputs?.find(input => input.id === 'minTimestamp');
      if (timestampInput?.value) {
        const comparator = (timestampInput.comparator || '>=') as '>=' | '>' | '<=' | '<' | '==';
        
        timeCondition.returnValueTest = {
          comparator,
          value: parseInt(timestampInput.value)
        };
      }
      
      return timeCondition;
    } else if (conditionType === 'rpc') {
      // RPC condition (e.g., ETH balance)
      const rpcCondition: RpcCondition = {
        conditionType: 'rpc',
        chain: 11155111, // Default to Sepolia
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'] as [string, 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: '0'
        }
      };
      
      // Add chain ID if present
      const chainInput = block.inputs?.find(input => input.id === 'chain');
      if (chainInput?.value !== undefined) {
        // Even if the value is empty, we want to process it through parseChainId
        rpcCondition.chain = parseChainId(chainInput.value);
      }
      
      // Add method if present in properties
      if (block.properties?.method) {
        rpcCondition.method = block.properties.method as 'eth_getBalance';
      }
      
      // Add parameters if present in properties
      if (block.properties?.parameters) {
        rpcCondition.parameters = block.properties.parameters as [string, 'latest'];
        
        // Convert any Ethereum addresses in parameters to checksum format
        rpcCondition.parameters = rpcCondition.parameters.map(param => {
          // Skip special placeholders like :userAddress
          if (typeof param === 'string' && !param.startsWith(':') && /^(0x)?[0-9a-fA-F]{40}$/.test(param)) {
            return toChecksumAddress(param);
          }
          return param;
        }) as [string, 'latest'];
      }
      
      // Add balance test if present
      const balanceInput = block.inputs?.find(input => input.id === 'minBalance');
      if (balanceInput?.value) {
        const comparator = (balanceInput.comparator || '>=') as '>=' | '>' | '<=' | '<' | '==';
        
        rpcCondition.returnValueTest = {
          comparator,
          value: parseInt(balanceInput.value)
        };
      }
      
      return rpcCondition;
    } else if (conditionType === 'json-rpc') {
      // JsonRpcCondition
      const jsonRpcCondition: JsonRpcCondition = {
        conditionType: 'json-rpc',
        endpoint: '',
        method: '',
        returnValueTest: {
          comparator: '>=',
          value: 0
        }
      };

      // Add endpoint URI if present
      const endpointInput = block.inputs?.find(input => input.id === 'endpoint');
      if (endpointInput?.value) {
        jsonRpcCondition.endpoint = endpointInput.value;
      }

      // Add method if present
      const methodInput = block.inputs?.find(input => input.id === 'method');
      if (methodInput?.value) {
        jsonRpcCondition.method = methodInput.value;
      }

      // Collect all parameter values
      const paramInputs = block.inputs?.filter(input => input.id.startsWith('param_')) || [];
      jsonRpcCondition.params = paramInputs
        .sort((a, b) => {
          const aNum = parseInt(a.id.split('_')[1]);
          const bNum = parseInt(b.id.split('_')[1]);
          return aNum - bNum;
        })
        .map(input => input.value || '')
        .filter(value => value !== '');

      // Add query if present
      const queryInput = block.inputs?.find(input => input.id === 'query');
      if (queryInput?.value) {
        jsonRpcCondition.query = queryInput.value;
      }

      // Add authorization token only if present and has a value
      const authTokenInput = block.inputs?.find(input => input.id === 'authorizationToken');
      if (authTokenInput?.value) {
        jsonRpcCondition.authorizationToken = authTokenInput.value;
      }

      // Add return value test if present
      const expectedValueInput = block.inputs?.find(input => input.id === 'expectedValue');
      if (expectedValueInput?.value) {
        const comparator = (expectedValueInput.comparator || '>=') as '>=' | '>' | '<=' | '<' | '==';

        jsonRpcCondition.returnValueTest = {
          comparator,
          value: isNumericString(expectedValueInput.value) ? parseInt(expectedValueInput.value) : expectedValueInput.value
        };
      } else if (block.properties?.returnValueTest) {
        jsonRpcCondition.returnValueTest = block.properties.returnValueTest as ReturnValueTest;
      }

      return jsonRpcCondition;
    } else if (conditionType === 'contract') {
      // Contract condition (e.g., ERC20, ERC721)
      const contractCondition: ContractCondition = {
        conditionType: 'contract',
        chain: 11155111, // Default to Sepolia
        contractAddress: '',
        method: 'balanceOf',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '>=',
          value: '0'
        }
      };
      
      // Add chain ID if present
      const chainInput = block.inputs?.find(input => input.id === 'chain');
      if (chainInput?.value !== undefined) {
        // Even if the value is empty, we want to process it through parseChainId
        contractCondition.chain = parseChainId(chainInput.value);
      }
      
      // Add contract address if present
      const contractInput = block.inputs?.find(input => input.id === 'contractAddress');
      if (contractInput?.value) {
        contractCondition.contractAddress = toChecksumAddress(contractInput.value);
      }
      
      // Add standard contract type if present
      if (block.properties?.standardContractType) {
        contractCondition.standardContractType = block.properties.standardContractType as 'ERC20' | 'ERC721';
      }
      
      // Add method if present in properties
      if (block.properties?.method) {
        contractCondition.method = block.properties.method as string;
      }
      
      // Add parameters if present in properties
      if (block.properties?.parameters) {
        contractCondition.parameters = Array.isArray(block.properties.parameters) 
          ? [...block.properties.parameters] 
          : [block.properties.parameters];
        
        // Special handling for ERC721 ownership - replace :tokenId with actual token ID
        if (block.properties.standardContractType === 'ERC721' && block.properties.method === 'ownerOf') {
          const tokenIdInput = block.inputs?.find(input => input.id === 'tokenId');
          if (tokenIdInput?.value) {
            // Replace :tokenId placeholder with actual token ID as a number
            const tokenId = parseInt(tokenIdInput.value);
            contractCondition.parameters = [isNaN(tokenId) ? 0 : tokenId];
          }
        }
        
        // Convert any Ethereum addresses in parameters to checksum format
        contractCondition.parameters = contractCondition.parameters.map(param => {
          // Skip special placeholders like :userAddress
          if (typeof param === 'string' && !param.startsWith(':') && /^(0x)?[0-9a-fA-F]{40}$/.test(param)) {
            return toChecksumAddress(param);
          }
          return param;
        });
      }
      
      // Add return value test if present
      const tokenAmountInput = block.inputs?.find(input => input.id === 'tokenAmount');
      if (tokenAmountInput?.value) {
        const comparator = (tokenAmountInput.comparator || '>=') as '>=' | '>' | '<=' | '<' | '==';
        
        contractCondition.returnValueTest = {
          comparator,
          value: parseInt(tokenAmountInput.value)
        };
      } else if (block.properties?.returnValueTest) {
        contractCondition.returnValueTest = block.properties.returnValueTest as ReturnValueTest;
      }
      
      return contractCondition;
    }
  }

  return null;
};

export const formatJson = (json: TacoCondition | null): string => {
  if (!json) return '';
  return JSON.stringify(json, null, 2);
}; 