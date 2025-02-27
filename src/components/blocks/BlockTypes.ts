export type BlockType = 'condition' | 'operator' | 'value' | 'property';

export type OperatorType = 'and' | 'or' | 'not' | 'greater-than' | 'less-than';
export type ConditionType = 
  | 'customABIMultipleParameters'
  | 'TStaking'
  | 'SubscriptionManagerPayment'
  | 'ERC721_ownership'
  | 'ERC721_balance'
  | 'ERC20_balance'
  | 'ETH_balance'
  | 'specific_wallet_address'
  | 'timestamp';

export type BlockCategory = 'conditions' | 'operators' | 'values';

export interface Block {
  id: string;
  type: 'condition' | 'operator' | 'value';
  category: string;
  label: string;
  inputs?: BlockInput[];
  properties?: BlockProperties;
  value?: string;
  isTemplate?: boolean;
  placeholder?: string;
  inputType?: string;
}

export interface BlockInput {
  id: string;
  type: string | string[];
  label: string;
  connected?: Block;
  value?: string;
  inputType?: 'text' | 'number';
  placeholder?: string;
  comparator?: string;
}

export interface BlockProperties {
  conditionType?: 'time' | 'contract' | 'rpc' | 'json-rpc' | 'compound';
  operator?: 'and' | 'or' | 'not';
  operands?: unknown[];
  maxInputs?: number;
  standardContractType?: 'ERC20' | 'ERC721';
  method?: string;
  parameters?: unknown[];
  returnValueTest?: {
    comparator: string;
    value: unknown;
  };
  type?: string;
  canAddParameters?: boolean;
  parameterCount?: number;
}

export const BLOCK_CATEGORIES = {
  CONDITIONS: 'conditions',
  OPERATORS: 'operators',
  VALUES: 'values'
} as const; 