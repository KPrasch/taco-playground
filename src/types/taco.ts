import { Provider } from '@ethersproject/providers';
import { Signer } from 'ethers';

// Allow any number as a chain ID
export type ChainId = number;

export type Comparator = '==' | '>' | '<' | '>=' | '<=' | '!=';

export interface ReturnValueTest {
  comparator: Comparator;
  value: string | number;
  index?: number;
}

export interface BaseCondition {
  returnValueTest: ReturnValueTest;
}

export interface OnChainCondition extends BaseCondition {
  chain: ChainId;
}

export interface TimeCondition extends OnChainCondition {
  conditionType: 'time';
  method: 'blocktime';
}

export interface ContractCondition extends OnChainCondition {
  conditionType: 'contract';
  contractAddress: string;
  standardContractType?: 'ERC20' | 'ERC721';
  method: string;
  parameters: unknown[];
  functionAbi?: {
    type: 'function';
    name: string;
    inputs: {
      type: string;
      name: string;
      internalType: string;
    }[];
    outputs: [{
      type: string;
      name: string;
      internalType: string;
    }, ...{
      type: string;
      name: string;
      internalType: string;
    }[]];
    stateMutability: 'view' | 'pure';
  };
}

export interface RpcCondition extends OnChainCondition {
  conditionType: 'rpc';
  method: 'eth_getBalance';
  parameters: [':userAddress' | string, 'latest'];
}

export interface JsonRpcCondition extends BaseCondition {
  conditionType: 'json-rpc';
  endpoint: string;
  method: string;
  params?: Array<unknown>;
  authorizationToken?: string;
  query?: string;
}

export interface CompoundCondition {
  conditionType: 'compound';
  operator: 'and' | 'or' | 'not';
  operands: (TimeCondition | ContractCondition | RpcCondition | CompoundCondition | JsonRpcCondition)[];
}

export type TacoCondition = TimeCondition | ContractCondition | RpcCondition | CompoundCondition | JsonRpcCondition;

export interface MessageKit {
  capsule: string;
  ciphertext: string;
  conditions: TacoCondition;
}

export interface Web3Context {
  provider: Provider | null;
  signer: Signer | null;
  address: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
} 