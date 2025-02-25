import { Block } from './BlockTypes';
import { TacoCondition, TimeCondition, ContractCondition, RpcCondition, CompoundCondition, ChainId, ReturnValueTest } from '../../types/taco';

// Helper function to check if a chain ID is valid
const isValidChainId = (chainId: number): chainId is ChainId => {
  return [1, 137, 80002, 11155111].includes(chainId);
};

// Helper function to safely convert a string to ChainId
const parseChainId = (value: string): ChainId => {
  const parsed = parseInt(value);
  if (isValidChainId(parsed)) {
    return parsed;
  }
  // Default to Sepolia if invalid
  return 11155111;
};

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
    const conditionType = block.properties?.conditionType as 'time' | 'contract' | 'rpc';
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
      if (chainInput?.value) {
        timeCondition.chain = parseChainId(chainInput.value);
      }
      
      // Add timestamp if present
      const timestampInput = block.inputs?.find(input => input.id === 'minTimestamp');
      if (timestampInput?.value) {
        // Use the comparator if available, default to '>='
        // @ts-expect-error - We know comparator exists in BlockInput
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
      if (chainInput?.value) {
        rpcCondition.chain = parseChainId(chainInput.value);
      }
      
      // Add method if present in properties
      if (block.properties?.method) {
        rpcCondition.method = block.properties.method as 'eth_getBalance';
      }
      
      // Add parameters if present in properties
      if (block.properties?.parameters) {
        rpcCondition.parameters = block.properties.parameters as [string, 'latest'];
      }
      
      // Add balance test if present
      const balanceInput = block.inputs?.find(input => input.id === 'minBalance');
      if (balanceInput?.value) {
        // Use the comparator if available, default to '>='
        // @ts-expect-error - We know comparator exists in BlockInput
        const comparator = (balanceInput.comparator || '>=') as '>=' | '>' | '<=' | '<' | '==';
        
        rpcCondition.returnValueTest = {
          comparator,
          value: parseInt(balanceInput.value)
        };
      }
      
      return rpcCondition;
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
      if (chainInput?.value) {
        contractCondition.chain = parseChainId(chainInput.value);
      }
      
      // Add contract address if present
      const contractInput = block.inputs?.find(input => input.id === 'contractAddress');
      if (contractInput?.value) {
        contractCondition.contractAddress = contractInput.value;
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
        contractCondition.parameters = block.properties.parameters as unknown[];
      }
      
      // Add return value test if present
      const tokenAmountInput = block.inputs?.find(input => input.id === 'tokenAmount');
      if (tokenAmountInput?.value) {
        // Use the comparator if available, default to '>='
        // @ts-expect-error - We know comparator exists in BlockInput
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