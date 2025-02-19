import { Block } from './BlockTypes';
import { TacoCondition, TimeCondition, ContractCondition, RpcCondition, CompoundCondition, ChainId, ReturnValueTest } from '../../types/taco';

type ProcessedCondition = TimeCondition | ContractCondition | RpcCondition | CompoundCondition;

interface ConditionBuilder {
  conditionType?: 'time' | 'contract' | 'rpc' | 'compound';
  chain?: ChainId;
  contractAddress?: string;
  method?: string;
  parameters?: unknown[];
  standardContractType?: 'ERC20' | 'ERC721' | 'ERC1155';
  returnValueTest?: ReturnValueTest;
  functionAbi?: {
    name: string;
    inputs: { type: string }[];
    outputs: { type: string }[];
  };
}

const isValidChainId = (chainId: number): chainId is ChainId => {
  return [1, 137, 80002, 11155111].includes(chainId);
};

export const blocksToJson = (blocks: Block[]): TacoCondition | null => {
  const processBlock = (block: Block): ProcessedCondition | null => {
    if (!block || !block.properties) {
      return null;
    }

    // Handle operator blocks differently
    if (block.type === 'operator') {
      // Find all connected conditions
      const connectedConditions = block.inputs
        ?.filter(input => input.connected)
        .map(input => input.connected)
        .filter((block): block is Block => block !== undefined) || [];

      // Process each connected condition
      const operands = connectedConditions
        .map(connectedBlock => processBlock(connectedBlock))
        .filter((condition): condition is ProcessedCondition => condition !== null);

      // Create compound condition
      const compoundCondition: CompoundCondition = {
        conditionType: 'compound',
        operator: (block.properties.operator as 'and' | 'or') || 'and',
        operands
      };

      return compoundCondition;
    }

    // Process condition blocks
    const builder: ConditionBuilder = {};

    block.inputs?.forEach(input => {
      // Check for direct value first, then fall back to connected value
      const value = input.value || input.connected?.value;
      if (!value && value !== '0') {  // Allow zero as a valid value
        return;
      }

      switch (input.id) {
        case 'contractAddress':
          builder.contractAddress = value.trim();
          break;
        case 'chain':
          const chainId = parseInt(value);
          if (!isNaN(chainId) && isValidChainId(chainId)) {
            builder.chain = chainId;
          }
          break;
        case 'minBalance':
          const balance = parseFloat(value);
          if (!isNaN(balance)) {
            builder.returnValueTest = {
              comparator: block.properties?.method === 'eth_getBalance' ? '>=' : '>',
              value: balance
            };
          }
          break;
        case 'timestamp':
        case 'minTimestamp':
          const timestamp = parseInt(value);
          if (!isNaN(timestamp)) {
            builder.conditionType = 'time';
            builder.method = 'blocktime';
            builder.returnValueTest = {
              comparator: '>=',
              value: timestamp
            };
          }
          break;
        case 'tokenId':
          if (!builder.parameters) {
            builder.parameters = [];
          }
          builder.parameters = builder.parameters.map((p: unknown) => 
            p === ':tokenId' ? value : p
          );
          break;
        case 'method':
          builder.method = value;
          break;
        case 'parameters':
          try {
            builder.parameters = JSON.parse(value);
          } catch (e) {
            console.error('Failed to parse parameters:', e);
          }
          break;
        case 'functionAbi':
          try {
            builder.functionAbi = JSON.parse(value);
          } catch (e) {
            console.error('Failed to parse function ABI:', e);
          }
          break;
      }
    });

    // For eth_getBalance conditions, ensure we're using the RPC condition type
    if (block.properties?.method === 'eth_getBalance' && builder.chain) {
      const rpcCondition: RpcCondition = {
        conditionType: 'rpc',
        chain: builder.chain,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: builder.returnValueTest || {
          comparator: '>=',
          value: 0
        }
      };
      return rpcCondition;
    }

    // For contract conditions
    if (block.properties?.conditionType === 'contract' && builder.chain && builder.method) {
      const contractCondition: ContractCondition = {
        conditionType: 'contract',
        chain: builder.chain,
        contractAddress: builder.contractAddress || '',
        method: builder.method,
        parameters: builder.parameters || [],
        standardContractType: block.properties.standardContractType as 'ERC20' | 'ERC721' | 'ERC1155' | undefined,
        returnValueTest: builder.returnValueTest || {
          comparator: '>',
          value: 0
        }
      };
      return contractCondition;
    }

    // For time conditions
    if (builder.conditionType === 'time' && builder.chain) {
      const timeCondition: TimeCondition = {
        conditionType: 'time',
        chain: builder.chain,
        method: 'blocktime',
        returnValueTest: builder.returnValueTest || {
          comparator: '>=',
          value: 0
        }
      };
      return timeCondition;
    }

    return null;
  };

  // Process only top-level blocks
  const topLevelBlocks = blocks.filter(block => {
    const isConnected = blocks.some(b => 
      b.inputs?.some(input => input.connected?.id === block.id)
    );
    return !isConnected;
  });

  if (topLevelBlocks.length === 0) return null;
  if (topLevelBlocks.length === 1) {
    return processBlock(topLevelBlocks[0]);
  }

  // If multiple top-level blocks, combine them with AND
  const conditions = topLevelBlocks
    .map(block => processBlock(block))
    .filter((condition): condition is ProcessedCondition => condition !== null);

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];

  return {
    conditionType: 'compound',
    operator: 'and',
    operands: conditions
  };
};

export const formatJson = (json: TacoCondition | null): string => {
  if (!json) return '';
  return JSON.stringify(json, null, 2);
}; 