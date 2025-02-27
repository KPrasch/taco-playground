'use client';

import React, { useRef, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { Block, BlockInput } from './BlockTypes';
import { ComparatorSelect } from './ComparatorSelect';
import { DropTarget } from './DropTarget';
import { DragItem, DragRef } from './types';

interface DraggableBlockProps {
  block: Block;
  isWorkspaceBlock?: boolean;
  onBlockUpdate?: (updatedBlock: Block) => void;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ 
  block,
  isWorkspaceBlock = false,
  onBlockUpdate,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((inputId: string, item: DragItem, parentInputId?: string) => {
    if (!onBlockUpdate) return;

    const updatedBlock = JSON.parse(JSON.stringify(block));
    
    // Handle value blocks for any input type
    if (item.type === 'value') {
      // For value blocks, find the input and set its value directly
      if (parentInputId) {
        // Handle drops into nested conditions
        const parentInput = updatedBlock.inputs?.find((input: BlockInput) => input.id === parentInputId);
        if (parentInput?.connected) {
          const connectedBlock = parentInput.connected;
          const targetInput = connectedBlock.inputs?.find((input: BlockInput) => input.id === inputId);
          if (targetInput) {
            targetInput.value = item.value;
            // Update the parent input with the modified connected block
            parentInput.connected = connectedBlock;
            onBlockUpdate(updatedBlock);
            return { handled: true }; // Return early after handling value drop
          }
        }
      } else {
        // Handle direct drops into inputs
        const input = updatedBlock.inputs?.find((input: BlockInput) => input.id === inputId);
        if (input) {
          input.value = item.value;
          onBlockUpdate(updatedBlock);
          return { handled: true }; // Return early after handling value drop
        }
      }
    }
    
    if (parentInputId) {
      // Handle drops into nested conditions
      const parentInput = updatedBlock.inputs?.find((input: BlockInput) => input.id === parentInputId);
      if (parentInput?.connected) {
        const connectedBlock = parentInput.connected;
        const targetInput = connectedBlock.inputs?.find((input: BlockInput) => input.id === inputId);
        if (targetInput) {
          // Create a new block from the dropped item
          const droppedBlock = JSON.parse(JSON.stringify(item)) as Block;
          droppedBlock.isTemplate = false;

          // Initialize values for all inputs in the dropped block
          if (droppedBlock.inputs) {
            droppedBlock.inputs = droppedBlock.inputs.map((input: BlockInput) => ({
              ...input,
              value: input.value || '',
              inputType: input.inputType || 'text'
            }));
          }

          // Connect the dropped block
          targetInput.connected = droppedBlock;

          // If this is an operator block, add a new input slot if needed
          if (connectedBlock.type === 'operator') {
            const connectedCount = connectedBlock.inputs?.filter((input: BlockInput) => input.connected).length || 0;
            const maxInputs = connectedBlock.properties?.maxInputs;
            const lastInput = connectedBlock.inputs?.[connectedBlock.inputs.length - 1];

            if (lastInput?.id === inputId && (!maxInputs || connectedCount < maxInputs)) {
              connectedBlock.inputs.push({
                id: `condition-${Date.now()}`,
                type: ['condition', 'operator'],
                label: 'Add Condition'
              });
            }
          }

          // Update the parent input with the modified connected block
          parentInput.connected = connectedBlock;
          onBlockUpdate(updatedBlock);
          return { handled: true }; // Return after handling nested drop
        }
      }
    } else if (block.type === 'operator') {
      const input = updatedBlock.inputs?.find((input: BlockInput) => input.id === inputId);
      if (input) {
        // This is the key fix - we need to handle drops of condition blocks into operator inputs
        // even if the input already has a connected block (replace it)
        const droppedBlock = JSON.parse(JSON.stringify(item)) as Block;
        droppedBlock.isTemplate = false;

        // Initialize values for all inputs in the dropped block
        if (droppedBlock.inputs) {
          droppedBlock.inputs = droppedBlock.inputs.map((input: BlockInput) => ({
            ...input,
            value: input.value || '',
            inputType: input.inputType || 'text'
          }));
        }

        input.connected = droppedBlock;

        // Update the label to show the condition number
        const connectedCount = updatedBlock.inputs?.filter((input: BlockInput) => input.connected).length || 0;
        input.label = `Condition ${connectedCount}`;

        const lastInput = updatedBlock.inputs?.[updatedBlock.inputs.length - 1];
        const maxInputs = updatedBlock.properties?.maxInputs;
        
        // Only add new input slot if we haven't reached maxInputs (if specified)
        // and if this was the last input
        if (lastInput?.id === inputId && 
            (!maxInputs || connectedCount < maxInputs)) {
          updatedBlock.inputs.push({
            id: `condition-${Date.now()}`,
            type: ['condition', 'operator'],
            label: 'Add Condition'
          });
        }
        
        onBlockUpdate(updatedBlock);
        return { handled: true }; // Return after handling operator drop
      }
    } else if (block.type === 'condition') {
      // Handle direct drops into condition inputs
      const input = updatedBlock.inputs?.find((input: BlockInput) => input.id === inputId);
      if (input && item.type === 'value') {
        // For value blocks, just set the value directly
        input.value = item.value;
        onBlockUpdate(updatedBlock);
        return { handled: true }; // Return early after handling value drop
      }
    }
  }, [block, onBlockUpdate]);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'block',
    item: () => {
      const newId = isWorkspaceBlock ? block.id : `${block.id}-${Date.now()}`;
      const newBlock: DragItem = {
        id: newId,
        type: block.type,
        category: block.category,
        label: block.label,
        inputs: block.inputs,
        properties: block.properties,
        value: block.value,
        isTemplate: !isWorkspaceBlock,
      };
      return newBlock;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [block, isWorkspaceBlock]);

  // Combine refs utility
  const combineRefs = useCallback((...refs: DragRef[]) => {
    return (element: HTMLDivElement | null) => {
      refs.forEach((ref) => {
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref && 'current' in ref) {
          ref.current = element;
        }
      });
    };
  }, []);

  const handleValueChange = (inputId: string, e: React.ChangeEvent<HTMLInputElement>, parentPath?: string[]) => {
    if (!onBlockUpdate || !isWorkspaceBlock) return;

    const value = e.target.value;
    const updatedBlock = JSON.parse(JSON.stringify(block));
    
    // Helper function to find and update nested input following a path
    const findAndUpdateInput = (currentBlock: Block, targetInputId: string, path: string[]): boolean => {
      if (path.length === 0) {
        // We've reached the target level, look for our input
        const directInput = currentBlock.inputs?.find((input: BlockInput) => input.id === targetInputId);
        if (directInput) {
          directInput.value = value;
          return true;
        }
        return false;
      }

      // Get the next input in the path
      const nextInputId = path[0];
      const nextInput = currentBlock.inputs?.find((input: BlockInput) => input.id === nextInputId);
      
      if (nextInput?.connected) {
        // Continue down the path
        return findAndUpdateInput(nextInput.connected, targetInputId, path.slice(1));
      }
      
      return false;
    };
    
    if (parentPath && parentPath.length > 0) {
      // Find the input by following the parent path
      if (findAndUpdateInput(updatedBlock, inputId, parentPath)) {
        onBlockUpdate(updatedBlock);
      }
    } else {
      // Handle top-level inputs
      const input = updatedBlock.inputs?.find((input: BlockInput) => input.id === inputId);
      if (input) {
        // Special handling for chainID inputs to ensure they're properly updated
        if (inputId === 'chain') {
          // Store the raw value as entered by the user
          input.value = value;
        } else {
          input.value = value;
        }

        // Immediately update the block to trigger JSON preview update
        onBlockUpdate(updatedBlock);
      }
    }
  };

  const handleComparatorChange = (inputId: string, comparator: string) => {
    if (!onBlockUpdate || !isWorkspaceBlock) return;

    const updatedBlock = JSON.parse(JSON.stringify(block));
    const input = updatedBlock.inputs?.find((input: BlockInput) => input.id === inputId);
    
    if (input) {
      input.comparator = comparator;
      onBlockUpdate(updatedBlock);
    }
  };

  const handleRemoveCondition = (inputId: string) => {
    if (!onBlockUpdate) return;
    const updatedBlock = JSON.parse(JSON.stringify(block));
    
    if (block.type === 'operator' && updatedBlock.inputs) {
      // Remove the connection
      const targetInput = updatedBlock.inputs.find((input: BlockInput) => input.id === inputId);
      if (targetInput) {
        targetInput.connected = undefined;
      }

      // Filter out empty slots except the last one
      const nonEmptyInputs = updatedBlock.inputs.filter((input: BlockInput) => input.connected);
      const lastEmptyInput = {
        id: `condition-${Date.now()}`,
        type: ['condition', 'operator'],
        label: 'Add Condition'
      };

      // Rebuild the inputs array with renumbered conditions
      updatedBlock.inputs = [
        ...nonEmptyInputs.map((input: BlockInput, index: number) => ({
          ...input,
          label: `Condition ${index + 1}`
        })),
        lastEmptyInput
      ];
    }

    onBlockUpdate(updatedBlock);
  };

  const handleAddParameter = useCallback(() => {
    if (!onBlockUpdate || !isWorkspaceBlock) return;

    const updatedBlock = JSON.parse(JSON.stringify(block));
    const paramCount = (updatedBlock.properties?.parameterCount as number) || 1;

    // Create new parameter input
    const newParam: BlockInput = {
      id: `param_${paramCount}`,
      type: ['value'],
      label: `Parameter ${paramCount + 1}`,
      inputType: 'text'
    };

    // Find the index of the last parameter input
    const lastParamIndex = updatedBlock.inputs.findIndex((input: BlockInput) =>
      input.id.startsWith('param_') &&
      parseInt(input.id.split('_')[1]) === paramCount - 1
    );

    if (lastParamIndex !== -1) {
      // Insert the new parameter right after the current one
      updatedBlock.inputs.splice(lastParamIndex + 1, 0, newParam);
    } else {
      // Fallback: add to the end if we can't find the current parameter
      updatedBlock.inputs.push(newParam);
    }

    // Update parameter count
    if (!updatedBlock.properties) {
      updatedBlock.properties = {};
    }
    updatedBlock.properties.parameterCount = paramCount + 1;

    onBlockUpdate(updatedBlock);
  }, [block, onBlockUpdate, isWorkspaceBlock]);

  return (
    <div
      ref={combineRefs(elementRef, drag)}
      className={`
        relative
        ${isDragging ? 'opacity-50' : ''}
        ${isWorkspaceBlock ? 'cursor-move' : 'cursor-grab'}
      `}
      data-block-type={block.type}
    >
      <div className={`
        bg-white/[0.03] border border-white/10 rounded-lg p-3
        transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]
        shadow-lg shadow-black/20
        ${block.type === 'operator' ? 'bg-opacity-30' : ''}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`
              w-1.5 h-1.5 rounded-full
              ${block.type === 'condition' ? 'bg-purple-400/70' : ''}
              ${block.type === 'operator' ? 'bg-blue-400/70' : ''}
              ${block.type === 'value' ? 'bg-green-400/70' : ''}
            `} />
            <span className="text-sm text-white/70">{block.label}</span>
          </div>
        </div>

        {block.inputs && block.inputs.length > 0 && (
          <div className="mt-3 space-y-3 pt-2 border-t border-white/5">
            {block.inputs.map((input: BlockInput, index) => {
              if (input.type?.includes('operator') || input.type?.includes('condition')) {
                return (
                  <div key={input.id} className={`
                    ${index !== 0 ? 'pt-3 border-t border-white/5' : ''}
                  `}>
                    <DropTarget
                      inputId={input.id}
                      isWorkspaceBlock={isWorkspaceBlock}
                      onDrop={handleDrop}
                      className="border rounded-lg transition-all duration-200"
                    >
                      {input.connected ? (
                        <div className="relative group">
                          <DraggableBlock
                            block={input.connected}
                            isWorkspaceBlock={isWorkspaceBlock}
                            onBlockUpdate={(updatedBlock) => {
                              const newBlock = JSON.parse(JSON.stringify(block));
                              const targetInput = newBlock.inputs?.find((i: BlockInput) => i.id === input.id);
                              if (targetInput) {
                                targetInput.connected = updatedBlock;
                                onBlockUpdate?.(newBlock);
                              }
                            }}
                          />
                          {isWorkspaceBlock && (
                            <button
                              onClick={() => handleRemoveCondition(input.id)}
                              className="absolute -right-1.5 -top-1.5 p-1 bg-red-500/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              <svg className="w-2.5 h-2.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="p-2.5 text-sm text-white/30">{input.label}</div>
                      )}
                    </DropTarget>
                  </div>
                );
              }

              // Only render input fields for direct condition blocks
              if (block.type === 'condition') {
                // Check if this is a numeric input that should have a comparator
                const needsComparator = 
                  (input.id === 'minBalance' || input.id === 'minTimestamp' || input.id === 'tokenAmount' || input.id === 'tokenId' || input.id === 'expectedValue');
                
                return (
                  <div key={input.id} className={`
                    ${index !== 0 ? 'pt-3 border-t border-white/5' : ''}
                  `}>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-white/50">{input.label}</span>
                      
                      {needsComparator ? (
                        <div className="flex items-center gap-2">
                          <ComparatorSelect
                            value={input.comparator || '>='}
                            onChange={(value: string) => handleComparatorChange(input.id, value)}
                            className="w-16"
                          />
                          <DropTarget
                            inputId={input.id}
                            isWorkspaceBlock={isWorkspaceBlock}
                            onDrop={handleDrop}
                            acceptValueBlocks={true}
                            className="flex-1"
                          >
                            <input
                              type={input.inputType || 'text'}
                              value={input.value || ''}
                              onChange={(e) => handleValueChange(input.id, e)}
                              autoComplete="off"
                              data-form-type="other"
                              className="w-full px-2 py-1.5 text-sm bg-black/30 border border-white/5 rounded 
                                focus:outline-none focus:border-white/20 placeholder-white/20"
                              placeholder={`Enter ${input.label.toLowerCase()}`}
                            />
                          </DropTarget>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <DropTarget
                            inputId={input.id}
                            isWorkspaceBlock={isWorkspaceBlock}
                            onDrop={handleDrop}
                            acceptValueBlocks={true}
                            className="flex-1"
                          >
                            <input
                              type={input.inputType || 'text'}
                              value={input.value || ''}
                              onChange={(e) => handleValueChange(input.id, e)}
                              autoComplete="off"
                              data-form-type="other"
                              className="w-full px-2 py-1.5 text-sm bg-black/30 border border-white/5 rounded
                                focus:outline-none focus:border-white/20 placeholder-white/20"
                              placeholder={`Enter ${input.label.toLowerCase()}`}
                            />
                          </DropTarget>
                          {block.properties?.canAddParameters && input.id.startsWith('param_') &&
                           parseInt(input.id.split('_')[1]) === ((block.properties?.parameterCount ?? 1) - 1) && (
                            <button
                              onClick={handleAddParameter}
                              className="p-1 bg-green-500/70 rounded-full hover:bg-green-500/90 transition-colors duration-200"
                              title="Add parameter"
                            >
                              <svg className="w-3 h-3 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableBlock; 
