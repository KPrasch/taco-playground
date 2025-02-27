export enum BLOCK_CATEGORIES {
  CONDITIONS = 'conditions',
  OPERATORS = 'operators',
  VALUES = 'values'
}

export interface BlockInput {
  id: string;
  type: string[];
  label: string;
  value?: string;
  placeholder?: string;
  inputType?: 'text' | 'number';
  connected?: Block;
  comparator?: string;
}

export interface Block {
  id: string;
  type: string;
  category: BLOCK_CATEGORIES;
  label: string;
  inputs?: BlockInput[];
  properties?: Record<string, unknown>;
  value?: string;
  placeholder?: string;
  inputType?: string;
  isTemplate?: boolean;
} 