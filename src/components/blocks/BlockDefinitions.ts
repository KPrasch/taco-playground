import { Block, BLOCK_CATEGORIES } from './BlockTypes';

export const AVAILABLE_BLOCKS: Block[] = [
  // Operator Blocks
  {
    id: 'and-operator',
    type: 'operator',
    category: BLOCK_CATEGORIES.OPERATORS,
    label: 'AND',
    inputs: [
      { id: 'condition-1', type: ['condition', 'operator'], label: 'Add Condition' }
    ],
    properties: {
      conditionType: 'compound',
      operator: 'and',
      operands: []
    }
  },
  {
    id: 'or-operator',
    type: 'operator',
    category: BLOCK_CATEGORIES.OPERATORS,
    label: 'OR',
    inputs: [
      { id: 'condition-1', type: ['condition', 'operator'], label: 'Add Condition' }
    ],
    properties: {
      conditionType: 'compound',
      operator: 'or',
      operands: []
    }
  },
  {
    id: 'not-operator',
    type: 'operator',
    category: BLOCK_CATEGORIES.OPERATORS,
    label: 'NOT',
    inputs: [
      { id: 'condition-1', type: ['condition', 'operator'], label: 'Condition to Negate' }
    ],
    properties: {
      conditionType: 'compound',
      operator: 'not',
      operands: [],
      maxInputs: 1
    }
  },

  // Preset Values
  {
    id: 'chain-amoy',
    type: 'value',
    category: BLOCK_CATEGORIES.VALUES,
    label: 'Amoy Chain ID (80002)',
    value: '80002',
    properties: {
      type: 'number'
    }
  },
  {
    id: 'chain-mainnet',
    type: 'value',
    category: BLOCK_CATEGORIES.VALUES,
    label: 'Ethereum Chain ID (1)',
    value: '1',
    properties: {
      type: 'number'
    }
  },
  {
    id: 'chain-polygon',
    type: 'value',
    category: BLOCK_CATEGORIES.VALUES,
    label: 'Polygon Chain ID (137)',
    value: '137',
    properties: {
      type: 'number'
    }
  },
  {
    id: 'contract-address',
    type: 'value',
    category: BLOCK_CATEGORIES.VALUES,
    label: 'Contract Address (0x8a6d...fa5c)',
    value: '0x8a6d59c1c0449ccf26d87bd52be029ec4a5afa5c',
    properties: {
      type: 'string'
    }
  },

  // Time Conditions
  {
    id: 'timestamp',
    type: 'condition',
    category: BLOCK_CATEGORIES.CONDITIONS,
    label: 'Time Lock',
    inputs: [
      {
        id: 'chain',
        type: ['value'],
        label: 'Chain ID',
        inputType: 'number',
        placeholder: 'Enter any valid chain ID'
      },
      {
        id: 'minTimestamp',
        type: ['value'],
        label: 'Minimum Timestamp',
        inputType: 'number',
        placeholder: 'Unix timestamp in seconds'
      },
    ],
    properties: {
      conditionType: 'time'
    }
  },

  // Token Conditions
  {
    id: 'erc20-balance',
    type: 'condition',
    category: BLOCK_CATEGORIES.CONDITIONS,
    label: 'ERC20 Balance',
    inputs: [
      { id: 'contractAddress', type: ['value'], label: 'Token Address' },
      {
        id: 'chain',
        type: ['value'],
        label: 'Chain ID',
        inputType: 'number',
        placeholder: 'Enter any valid chain ID'
      },
      { id: 'tokenAmount', type: ['value'], label: 'Token Amount', inputType: 'number' },
    ],
    properties: {
      conditionType: 'contract',
      standardContractType: 'ERC20',
      method: 'balanceOf',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '>',
        value: 0
      }
    }
  },
  {
    id: 'erc721-balance',
    type: 'condition',
    category: BLOCK_CATEGORIES.CONDITIONS,
    label: 'ERC721 Balance',
    inputs: [
      { id: 'contractAddress', type: ['value'], label: 'Contract Address' },
      { id: 'chain', type: ['value'], label: 'Chain ID', inputType: 'number' },
      { id: 'tokenAmount', type: ['value'], label: 'Min Balance', inputType: 'number' },
    ],
    properties: {
      conditionType: 'contract',
      standardContractType: 'ERC721',
      method: 'balanceOf',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '>',
        value: 0
      }
    }
  },
  {
    id: 'erc721-ownership',
    type: 'condition',
    category: BLOCK_CATEGORIES.CONDITIONS,
    label: 'ERC721 Ownership',
    inputs: [
      { id: 'contractAddress', type: ['value'], label: 'Contract Address' },
      { id: 'tokenId', type: ['value'], label: 'Token ID', inputType: 'number' },
      { id: 'chain', type: ['value'], label: 'Chain ID', inputType: 'number' },
    ],
    properties: {
      conditionType: 'contract',
      standardContractType: 'ERC721',
      method: 'ownerOf',
      parameters: [':tokenId'],
      returnValueTest: {
        comparator: '==',
        value: ':userAddress'
      }
    }
  },

  // Native Token Conditions
  {
    id: 'eth-balance',
    type: 'condition',
    category: BLOCK_CATEGORIES.CONDITIONS,
    label: 'ETH Balance',
    inputs: [
      { id: 'chain', type: ['value'], label: 'Chain ID', inputType: 'number' },
      { id: 'minBalance', type: ['value'], label: 'Wei', inputType: 'number' },
    ],
    properties: {
      conditionType: 'rpc',
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
    }
  },

  // Custom Contract Conditions
  {
    id: 'custom-contract',
    type: 'condition',
    category: BLOCK_CATEGORIES.CONDITIONS,
    label: 'Custom Contract Call',
    inputs: [
      { id: 'contractAddress', type: ['value'], label: 'Contract Address' },
      { id: 'method', type: ['value'], label: 'Method Name' },
      { id: 'chain', type: ['value'], label: 'Chain ID', inputType: 'number' },
      { id: 'parameters', type: ['value'], label: 'Parameters (JSON)' },
      { id: 'abi', type: ['value'], label: 'Function ABI (JSON)' },
    ],
    properties: {
      conditionType: 'contract',
    }
  },

  // Json Conditions
  {
    id: 'json-rpc',
    type: 'condition',
    category: BLOCK_CATEGORIES.CONDITIONS,
    label: "JSON RPC",
    inputs: [
      { id: 'endpoint', type: ['value'], label: 'Endpoint URI', inputType: 'text' },
      { id: 'method', type: ['value'], label: 'Method Name', inputType: 'text' },
      { id: 'param_0', type: ['value'], label: 'Parameter 1', inputType: 'text' },
      { id: 'authorizationToken', type: ['value'], label: 'Authorization Token', inputType: 'text' },
      { id: 'query', type: ['value'], label: 'JSON Path Query', inputType: 'text' },
      { id: 'expectedValue', type: ['value'], label: 'Expected Value', inputType: 'text' },
    ],
    properties: {
      conditionType: "json-rpc",
      canAddParameters: true,
      parameterCount: 1,
      returnValueTest: {
        comparator: '>=',
        value: 0
      }
    }
  }
];
