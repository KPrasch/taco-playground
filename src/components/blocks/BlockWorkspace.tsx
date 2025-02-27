'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { Block, BLOCK_CATEGORIES } from './BlockTypes';
import { TacoCondition } from '../../types/taco';
import DraggableBlock from './DraggableBlock';
import { blocksToJson } from './blockUtils';

interface BlockWorkspaceProps {
  onConditionChange: (condition: TacoCondition | null) => void;
}

interface DragItem extends Omit<Block, 'id'> {
  id: string;
  isTemplate: boolean;
}

interface DropResult {
  handled?: boolean;
  dropped?: boolean;
}

const BlockWorkspace: React.FC<BlockWorkspaceProps> = ({ onConditionChange }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dropError, setDropError] = useState<string>('');
  const prevJsonRef = useRef<string>('');
  
  // Use refs for scroll buttons and container
  const leftScrollButtonRef = useRef<HTMLButtonElement>(null);
  const rightScrollButtonRef = useRef<HTMLButtonElement>(null);
  const quickConditionsContainerRef = useRef<HTMLDivElement>(null);

  // Clear error message after a delay
  useEffect(() => {
    if (dropError) {
      const timer = setTimeout(() => setDropError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [dropError]);

  // Generate JSON whenever blocks change
  useEffect(() => {
    const json = blocksToJson(blocks);
    if (json === null) return;

    // Convert to string for comparison
    const jsonString = JSON.stringify(json);
    
    // Debug log for chainID updates
    if (prevJsonRef.current !== jsonString) {
      console.log('JSON changed:', json);
    }
    
    // Only update if the JSON has actually changed
    if (jsonString !== prevJsonRef.current) {
      prevJsonRef.current = jsonString;
      onConditionChange(json);
    }
  }, [blocks, onConditionChange]);

  const handleBlockUpdate = useCallback((updatedBlock: Block) => {
    setBlocks(prev => 
      prev.map(block => 
        block.id === updatedBlock.id ? updatedBlock : block
      )
    );
  }, []);

  const handleClear = () => {
    setBlocks([]);
    setDropError('');
    prevJsonRef.current = '';
    onConditionChange(null);
  };

  // Helper function to check if a block is connected to an operator
  const isBlockConnectedToOperator = (blockId: string): boolean => {
    return blocks.some(block => 
      block.type === 'operator' && 
      block.inputs?.some(input => input.connected?.id === blockId)
    );
  };

  // Helper function to count standalone condition blocks
  const getStandaloneConditionCount = (): number => {
    return blocks.filter(block => 
      block.type === 'condition' && !isBlockConnectedToOperator(block.id)
    ).length;
  };

  const elementRef = useRef<HTMLDivElement>(null);

  const [{ isOver, canDrop }, drop] = useDrop<DragItem, DropResult, { isOver: boolean; canDrop: boolean }>(() => ({
    accept: 'block',
    canDrop: (item: DragItem, monitor) => {
      // Check if the drop was already handled by a nested target
      const dropResult = monitor.getDropResult<DropResult>();
      if (dropResult?.handled) {
        return false;
      }

      // Only allow drops directly on the workspace (not on nested drop targets)
      const isDirectDrop = monitor.isOver({ shallow: true });
      if (!isDirectDrop) return false;

      // Check if we're dropping inside an operator or condition
      const target = monitor.getClientOffset();
      if (target) {
        const element = document.elementFromPoint(target.x, target.y);
        if (element?.closest('[data-block-type="operator"], [data-block-type="condition"]')) {
          return false;
        }
      }

      // Always allow operator blocks at the root level
      if (item.type === 'operator' && item.isTemplate) {
        return true;
      }

      // For condition blocks, only allow if there are no standalone conditions
      if (item.type === 'condition' && item.isTemplate) {
        const standaloneConditions = getStandaloneConditionCount();
        if (standaloneConditions > 0) {
          setDropError('Use an operator block (AND/OR) to combine multiple conditions');
          return false;
        }
        return true;
      }

      return false;
    },
    drop: (item: DragItem, monitor) => {
      // Check if the drop was handled by a nested target
      const dropResult = monitor.getDropResult<DropResult>();
      if (dropResult?.handled) {
        return dropResult;
      }

      // Only handle drops directly on the workspace
      if (!monitor.isOver({ shallow: true })) {
        return;
      }

      // Check if we're dropping inside an operator or condition
      const target = monitor.getClientOffset();
      if (target) {
        const element = document.elementFromPoint(target.x, target.y);
        if (element?.closest('[data-block-type="operator"], [data-block-type="condition"]')) {
          return;
        }
      }

      if (monitor.canDrop() && item.isTemplate) {
        setBlocks(prev => {
          // Create a deep copy of the block to ensure properties are preserved
          const newBlock = JSON.parse(JSON.stringify({
            id: item.id,
            type: item.type,
            category: item.category,
            label: item.label,
            properties: item.properties,
            inputs: item.inputs,
            isTemplate: false,
          }));
          
          return [...prev, newBlock];
        });
        
        return { dropped: true, handled: true };
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }), [blocks]);

  drop(elementRef);

  // Add effect to handle scroll button states
  useEffect(() => {
    const container = quickConditionsContainerRef.current;
    const leftButton = leftScrollButtonRef.current;
    const rightButton = rightScrollButtonRef.current;

    if (!container || !leftButton || !rightButton) return;

    const checkScrollPosition = () => {
      // Disable left button if scrolled all the way to the left
      leftButton.disabled = container.scrollLeft <= 0;
      
      // Disable right button if scrolled all the way to the right
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      rightButton.disabled = Math.abs(container.scrollLeft - maxScrollLeft) < 1;
    };

    // Initial check
    checkScrollPosition();

    // Add scroll event listener
    container.addEventListener('scroll', checkScrollPosition);

    // Cleanup
    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
    };
  }, [blocks]); // Re-run when blocks change as it might affect scrollWidth

  return (
    <div className="space-y-3 bg-transparent border border-white/10 rounded-lg p-6 flex flex-col flex-1">
      <div className="flex justify-between items-center border-b border-white/10 -mx-6 px-6 py-4 -mt-6 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            <svg className="w-5 h-5 text-taco" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-sm font-diatype font-bold text-white tracking-wide uppercase">Workspace</h3>
        </div>
        {blocks.length > 0 && (
          <button
            onClick={handleClear}
            className="px-3 py-1.5 bg-white/5 text-white rounded-lg text-sm font-diatype font-bold
              border border-white/10 transition-all duration-200
              hover:bg-white/10 hover:border-white/20
              focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            Clear
          </button>
        )}
      </div>

      <div className="px-4 py-3 bg-white/[0.02] border border-white/10 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-diatype font-bold text-white/60">Quick Conditions:</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              id="scroll-left-btn"
              className="p-1.5 bg-white/5 text-white/60 rounded-lg
                hover:bg-white/10 hover:text-white/80 transition-all duration-200
                focus:outline-none focus:ring-1 focus:ring-white/20
                disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => {
                const container = document.getElementById('quick-conditions-container');
                if (container) {
                  container.scrollBy({ left: -200, behavior: 'smooth' });
                }
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              id="scroll-right-btn"
              className="p-1.5 bg-white/5 text-white/60 rounded-lg
                hover:bg-white/10 hover:text-white/80 transition-all duration-200
                focus:outline-none focus:ring-1 focus:ring-white/20
                disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => {
                const container = document.getElementById('quick-conditions-container');
                if (container) {
                  container.scrollBy({ left: 200, behavior: 'smooth' });
                }
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div 
          id="quick-conditions-container"
          className="overflow-x-hidden pb-2 -mx-1 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => {
                // Clear workspace first
                handleClear();
                
                const fiveMinutesFromNow = new Date();
                fiveMinutesFromNow.setMinutes(fiveMinutesFromNow.getMinutes() + 5);
                
                const timestamp = Math.floor(fiveMinutesFromNow.getTime() / 1000);
                
                const newBlock: Block = {
                  id: `time-${Date.now()}`,
                  type: 'condition',
                  category: BLOCK_CATEGORIES.CONDITIONS,
                  label: 'Time Lock',
                  inputs: [
                    { 
                      id: 'chain', 
                      type: ['value'], 
                      label: 'Chain ID', 
                      inputType: 'number',
                      value: '11155111',
                      placeholder: 'Enter any valid chain ID'
                    },
                    { 
                      id: 'minTimestamp', 
                      type: ['value'], 
                      label: 'Minimum Timestamp', 
                      inputType: 'number',
                      value: timestamp.toString(),
                      placeholder: 'Unix timestamp in seconds',
                      comparator: '>='
                    }
                  ],
                  properties: {
                    conditionType: 'time'
                  },
                  isTemplate: false
                };
                
                setBlocks(prev => [...prev, newBlock]);
              }}
              className="px-3 py-1.5 bg-white/5 text-white/80 rounded-lg text-sm
                border border-white/10 transition-all duration-200
                hover:bg-white/10 hover:border-white/20 hover:text-white
                focus:outline-none focus:ring-1 focus:ring-white/20
                flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Timelock (5min)</span>
            </button>

            <button
              onClick={() => {
                // Clear workspace first
                handleClear();
                
                const newBlock: Block = {
                  id: `eth-balance-${Date.now()}`,
                  type: 'condition',
                  category: BLOCK_CATEGORIES.CONDITIONS,
                  label: 'ETH Balance',
                  inputs: [
                    { 
                      id: 'chain', 
                      type: ['value'], 
                      label: 'Chain ID', 
                      inputType: 'number',
                      value: '11155111',
                      placeholder: 'Enter any valid chain ID'
                    },
                    { 
                      id: 'minBalance', 
                      type: ['value'], 
                      label: 'Wei', 
                      inputType: 'number',
                      value: '1',
                      comparator: '>='
                    }
                  ],
                  properties: {
                    conditionType: 'rpc',
                    method: 'eth_getBalance',
                    parameters: [':userAddress', 'latest']
                  },
                  isTemplate: false
                };
                
                setBlocks(prev => [...prev, newBlock]);
              }}
              className="px-3 py-1.5 bg-white/5 text-white/80 rounded-lg text-sm
                border border-white/10 transition-all duration-200
                hover:bg-white/10 hover:border-white/20 hover:text-white
                focus:outline-none focus:ring-1 focus:ring-white/20
                flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>ETH Balance (1 Wei)</span>
            </button>

            <button
              onClick={() => {
                // Clear workspace first
                handleClear();
                
                const fiveMinutesFromNow = new Date();
                fiveMinutesFromNow.setMinutes(fiveMinutesFromNow.getMinutes() + 5);
                const timestamp = Math.floor(fiveMinutesFromNow.getTime() / 1000);
                
                // Create the compound AND condition with both timelock and ETH balance
                const newBlock: Block = {
                  id: `compound-${Date.now()}`,
                  type: 'operator',
                  category: BLOCK_CATEGORIES.OPERATORS,
                  label: 'AND',
                  inputs: [
                    {
                      id: `condition-1-${Date.now()}`,
                      type: ['condition', 'operator'],
                      label: 'Condition 1',
                      connected: {
                        id: `time-${Date.now()}`,
                        type: 'condition',
                        category: BLOCK_CATEGORIES.CONDITIONS,
                        label: 'Time Lock',
                        inputs: [
                          { 
                            id: 'chain', 
                            type: ['value'], 
                            label: 'Chain ID', 
                            inputType: 'number',
                            value: '11155111',
                            placeholder: 'Enter any valid chain ID'
                          },
                          { 
                            id: 'minTimestamp', 
                            type: ['value'], 
                            label: 'Minimum Timestamp', 
                            inputType: 'number',
                            value: timestamp.toString(),
                            placeholder: 'Unix timestamp in seconds',
                            comparator: '>='
                          }
                        ],
                        properties: {
                          conditionType: 'time'
                        },
                        isTemplate: false
                      }
                    },
                    {
                      id: `condition-2-${Date.now()}`,
                      type: ['condition', 'operator'],
                      label: 'Condition 2',
                      connected: {
                        id: `eth-balance-${Date.now()}`,
                        type: 'condition',
                        category: BLOCK_CATEGORIES.CONDITIONS,
                        label: 'ETH Balance',
                        inputs: [
                          { 
                            id: 'chain', 
                            type: ['value'], 
                            label: 'Chain ID', 
                            inputType: 'number',
                            value: '11155111',
                            placeholder: 'Enter any valid chain ID'
                          },
                          { 
                            id: 'minBalance', 
                            type: ['value'], 
                            label: 'Wei', 
                            inputType: 'number',
                            value: '1',
                            comparator: '>='
                          }
                        ],
                        properties: {
                          conditionType: 'rpc',
                          method: 'eth_getBalance',
                          parameters: [':userAddress', 'latest']
                        },
                        isTemplate: false
                      }
                    },
                    {
                      id: `condition-3-${Date.now()}`,
                      type: ['condition', 'operator'],
                      label: 'Add Condition'
                    }
                  ],
                  properties: {
                    operator: 'and',
                    maxInputs: 10
                  },
                  isTemplate: false
                };
                
                setBlocks(prev => [...prev, newBlock]);
              }}
              className="px-3 py-1.5 bg-white/5 text-white/80 rounded-lg text-sm
                border border-white/10 transition-all duration-200
                hover:bg-white/10 hover:border-white/20 hover:text-white
                focus:outline-none focus:ring-1 focus:ring-white/20
                flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
              <span>AND (Time + Balance)</span>
            </button>

            <button
              onClick={() => {
                // Clear workspace first
                handleClear();
                
                const newBlock: Block = {
                  id: `erc20-balance-${Date.now()}`,
                  type: 'condition',
                  category: BLOCK_CATEGORIES.CONDITIONS,
                  label: 'ERC20 Balance',
                  inputs: [
                    { 
                      id: 'chain', 
                      type: ['value'], 
                      label: 'Chain ID', 
                      inputType: 'number',
                      value: '11155111',
                      placeholder: 'Enter any valid chain ID'
                    },
                    { 
                      id: 'contractAddress', 
                      type: ['value'], 
                      label: 'Token Contract', 
                      inputType: 'text',
                      value: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // Sepolia ChainLink token
                      placeholder: 'Token contract address'
                    },
                    { 
                      id: 'tokenAmount', 
                      type: ['value'], 
                      label: 'Token Amount', 
                      inputType: 'number',
                      value: '1',
                      comparator: '>='
                    }
                  ],
                  properties: {
                    conditionType: 'contract',
                    standardContractType: 'ERC20',
                    method: 'balanceOf',
                    parameters: [':userAddress'],
                    returnValueTest: {
                      comparator: '>=',
                      value: '1'
                    }
                  },
                  isTemplate: false
                };
                
                setBlocks(prev => [...prev, newBlock]);
              }}
              className="px-3 py-1.5 bg-white/5 text-white/80 rounded-lg text-sm
                border border-white/10 transition-all duration-200
                hover:bg-white/10 hover:border-white/20 hover:text-white
                focus:outline-none focus:ring-1 focus:ring-white/20
                flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>ERC20 Balance</span>
            </button>
            
            <button
              onClick={() => {
                // Clear workspace first
                handleClear();
                
                const newBlock: Block = {
                  id: `erc721-ownership-${Date.now()}`,
                  type: 'condition',
                  category: BLOCK_CATEGORIES.CONDITIONS,
                  label: 'ERC721 Ownership',
                  inputs: [
                    { 
                      id: 'chain', 
                      type: ['value'], 
                      label: 'Chain ID', 
                      inputType: 'number',
                      value: '11155111',
                      placeholder: 'Enter any valid chain ID'
                    },
                    { 
                      id: 'contractAddress', 
                      type: ['value'], 
                      label: 'NFT Contract', 
                      inputType: 'text',
                      value: '0x7C9e161ebe55F02A2810701e3F1C479c9dC0a3E8', // Example NFT on Sepolia
                      placeholder: 'NFT contract address'
                    },
                    { 
                      id: 'tokenId', 
                      type: ['value'], 
                      label: 'Token ID', 
                      inputType: 'number',
                      value: '1',
                      comparator: '=='
                    }
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
                  },
                  isTemplate: false
                };
                
                setBlocks(prev => [...prev, newBlock]);
              }}
              className="px-3 py-1.5 bg-white/5 text-white/80 rounded-lg text-sm
                border border-white/10 transition-all duration-200
                hover:bg-white/10 hover:border-white/20 hover:text-white
                focus:outline-none focus:ring-1 focus:ring-white/20
                flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>ERC721 Ownership</span>
            </button>

            <button
              onClick={() => {
                // Clear workspace first
                handleClear();

                const newBlock: Block = {
                  id: `erc721-balance-${Date.now()}`,
                  type: 'condition',
                  category: BLOCK_CATEGORIES.CONDITIONS,
                  label: 'ERC721 Balance',
                  inputs: [
                    {
                      id: 'chain',
                      type: ['value'],
                      label: 'Chain ID',
                      inputType: 'number',
                      value: '137',
                      placeholder: 'Enter any valid chain ID'
                    },
                    {
                      id: 'contractAddress',
                      type: ['value'],
                      label: 'NFT Contract',
                      inputType: 'text',
                      value: '0x213Fb0f798263B51159871280061489Eae13C5B5', // Eth Denver NFT on Polygon Mainnet
                      placeholder: 'NFT contract address'
                    },
                    {
                      id: 'tokenAmount',
                      type: ['value'],
                      label: 'Token Amount',
                      inputType: 'number',
                      value: '1',
                      comparator: '>='
                    }
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
                  },
                  isTemplate: false
                };

                setBlocks(prev => [...prev, newBlock]);
              }}
              className="px-3 py-1.5 bg-white/5 text-white/80 rounded-lg text-sm
                border border-white/10 transition-all duration-200
                hover:bg-white/10 hover:border-white/20 hover:text-white
                focus:outline-none focus:ring-1 focus:ring-white/20
                flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>ERC721 Balance</span>
            </button>

            <button
              onClick={() => {
                // Clear workspace first
                handleClear();

                const newBlock: Block = {
                  id: `json-rpc-${Date.now()}`,
                  type: 'condition',
                  category: BLOCK_CATEGORIES.CONDITIONS,
                  label: 'JSON RPC',
                  inputs: [
                    {
                      id: 'endpoint',
                      type: ['value'],
                      label: 'Endpoint URI',
                      inputType: 'text',
                      value: 'https://bitcoin-rpc.publicnode.com',
                    },
                    {
                      id: 'method',
                      type: ['value'],
                      label: 'Method',
                      inputType: 'text',
                      value: 'getblock',
                    },
                    {
                      id: 'param_0',
                      type: ['value'],
                      label: 'Parameter 1',
                      inputType: 'text',
                      value: '00000000000000000001ed4d40e6b602d7f09b9d47d5e046d52339cc6673a486'
                    },
                    {
                      id: 'authorizationToken',
                      type: ['value'],
                      label: 'Authorization Token',
                      inputType: 'text',
                    },
                    {
                      id: 'query',
                      type: ['value'],
                      label: 'JSON Path Query',
                      inputType: 'text',
                      value: '$.time',
                    },
                    {
                      id: 'expectedValue',
                      type: ['value'],
                      label: 'Expected Value',
                      inputType: 'number',
                      comparator: '>='
                    }
                  ],
                  properties: {
                    conditionType: 'json-rpc',
                    canAddParameters: true,
                    parameterCount: 1,
                    returnValueTest: {
                      comparator: '>=',
                      value: 1734461294
                    }
                  },
                  isTemplate: false
                };

                setBlocks(prev => [...prev, newBlock]);
              }}
              className="px-3 py-1.5 bg-white/5 text-white/80 rounded-lg text-sm
                border border-white/10 transition-all duration-200
                hover:bg-white/10 hover:border-white/20 hover:text-white
                focus:outline-none focus:ring-1 focus:ring-white/20
                flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>JSON RPC</span>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={elementRef}
        className={`
          flex-1 min-h-[400px] p-4 rounded-lg overflow-y-auto
          bg-black/30 transition-all duration-200
          scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/5
          hover:scrollbar-thumb-white/10
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-white/5
          [&::-webkit-scrollbar-thumb]:bg-white/5
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:border-2
          [&::-webkit-scrollbar-thumb]:border-transparent
          [&::-webkit-scrollbar-thumb]:bg-clip-padding
          [&::-webkit-scrollbar-thumb]:hover:bg-white/10
          ${isOver && canDrop ? 'bg-white/[0.06]' : ''}
          ${isOver && !canDrop ? 'bg-red-500/[0.06]' : ''}
          ${!isOver && canDrop ? 'bg-white/[0.04]' : ''}
        `}
      >
        <div className="space-y-4 min-w-full">
          {blocks.map((block) => (
            <DraggableBlock
              key={block.id}
              block={block}
              isWorkspaceBlock={true}
              onBlockUpdate={handleBlockUpdate}
            />
          ))}
          {blocks.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <div className="text-white/40 text-sm font-medium">
                Drag condition or operator blocks here
              </div>
            </div>
          )}
        </div>
      </div>

      {dropError && (
        <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg
          text-red-400 text-sm font-medium animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{dropError}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockWorkspace; 