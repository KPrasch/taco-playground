'use client';

import React, { useState } from 'react';
import { TacoCondition } from '../../types/taco';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { isNumericString } from './blockUtils';

interface JsonPreviewProps {
  condition: TacoCondition | null;
}

const JsonPreview: React.FC<JsonPreviewProps> = ({ condition }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'json' | 'typescript'>('json');

  // Format the JSON for display
  const formattedJson = condition ? JSON.stringify(condition, null, 2) : '';

  // Format the TypeScript for display with just the condition creation
  const formatTypeScript = (condition: TacoCondition | null): string => {
    if (!condition) return '';
    
    // Helper function to safely access properties that might not exist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getProperty = (obj: any, prop: string): any => {
      return obj && typeof obj === 'object' && prop in obj ? obj[prop] : undefined;
    };
    
    // Recursive function to format a condition and its nested operands
    const formatCondition = (condition: TacoCondition, varName: string = 'condition'): string[] => {
      const lines: string[] = [];
      
      // Check for predefined conditions first
      if (getProperty(condition, 'standardContractType') === 'ERC721' && getProperty(condition, 'method') === 'ownerOf') {
        // This is an ERC721 ownership condition
        lines.push(`const ${varName} = new conditions.predefined.erc721.ERC721Ownership({`);
        lines.push(`  contractAddress: '${getProperty(condition, 'contractAddress') || '0x0000000000000000000000000000000000000000'}',`);
        
        // Extract token ID from parameters if available
        const parameters = getProperty(condition, 'parameters');
        if (parameters && Array.isArray(parameters) && parameters.length > 0) {
          lines.push(`  parameters: [${parameters[0]}],`);
        }
        
        lines.push(`  chain: ${getProperty(condition, 'chain') || 11155111},  // ${getChainName(getProperty(condition, 'chain') || 11155111)}`);
        lines.push('});');
      }
      // Check for other predefined conditions here
      else if (getProperty(condition, 'standardContractType') === 'ERC20' && getProperty(condition, 'method') === 'balanceOf') {
        // This is an ERC20 balance condition
        lines.push(`const ${varName} = new conditions.predefined.erc20.ERC20Balance({`);
        lines.push(`  contractAddress: '${getProperty(condition, 'contractAddress') || '0x0000000000000000000000000000000000000000'}',`);
        
        const returnValueTest = getProperty(condition, 'returnValueTest');
        if (returnValueTest && 'value' in returnValueTest) {
          lines.push(`  returnValueTest: { comparator: "${returnValueTest.comparator || '>='}", value: ${returnValueTest.value} },`);
        }
        
        lines.push(`  chain: ${getProperty(condition, 'chain') || 11155111},  // ${getChainName(getProperty(condition, 'chain') || 11155111)}`);
        lines.push('});');
      }
      // Base condition types
      else if (condition.conditionType === 'time') {
        lines.push(`const ${varName} = new conditions.base.time.TimeCondition({`);
        lines.push(`  chain: ${getProperty(condition, 'chain') || 11155111},  // ${getChainName(getProperty(condition, 'chain') || 11155111)}`);
        
        const returnValueTest = getProperty(condition, 'returnValueTest');
        if (returnValueTest && 'value' in returnValueTest) {
          lines.push(`  returnValueTest: { comparator: "${returnValueTest.comparator || '>='}", value: ${returnValueTest.value} },`);
        }
        lines.push('});');
      } 
      else if (condition.conditionType === 'rpc') {
        lines.push(`const ${varName} = new conditions.base.rpc.RpcCondition({`);
        lines.push(`  chain: ${getProperty(condition, 'chain') || 11155111},  // ${getChainName(getProperty(condition, 'chain') || 11155111)}`);
        lines.push(`  method: "${getProperty(condition, 'method')}",`);
        
        const parameters = getProperty(condition, 'parameters');
        if (parameters) {
          const paramsStr = JSON.stringify(parameters)
            .replace(/"([^"]+)":/g, '$1:') // Remove quotes from property names
            .replace(/"/g, '\''); // Replace double quotes with single quotes for strings
          lines.push(`  parameters: ${paramsStr},`);
        }
        
        const returnValueTest = getProperty(condition, 'returnValueTest');
        if (returnValueTest) {
          const testStr = JSON.stringify(returnValueTest)
            .replace(/"([^"]+)":/g, '$1:')
            .replace(/"/g, '\'');
          lines.push(`  returnValueTest: ${testStr},`);
        }
        
        lines.push('});');
      }
      else if (condition.conditionType === 'json-rpc') {
        lines.push(`const ${varName} = new conditions.base.jsonRpc.JsonRpcCondition({`);

        const endpoint = getProperty(condition, 'endpoint');
        lines.push(`  endpoint: '${endpoint}',`);

        const method = getProperty(condition, 'method');
        lines.push(`  method: '${method}',`);

        const params = getProperty(condition, 'params');
        if (params && params.length > 0) {
          const paramsStr = JSON.stringify(params)
            .replace(/"([^"]+)":/g, '$1:')
            .replace(/"/g, '\'');
          lines.push(`  params: ${paramsStr},`);
        }

        const query = getProperty(condition, 'query');
        if (query) lines.push(`  query: '${query}',`);

        const authorizationToken = getProperty(condition, 'authorizationToken');
        if (authorizationToken) lines.push(`  authorizationToken: '${authorizationToken}',`);

        const returnValueTest = getProperty(condition, 'returnValueTest');
        if (returnValueTest && 'value' in returnValueTest) {
          const formattedValue = isNumericString(returnValueTest.value) ? returnValueTest.value : `'${returnValueTest.value}'`;
          lines.push(`  returnValueTest: { comparator: "${returnValueTest.comparator || '>='}", value: ${formattedValue} },`);
        }

        lines.push('});');
      }
      else if (condition.conditionType === 'contract') {
        lines.push(`const ${varName} = new conditions.base.contract.ContractCondition({`);
        lines.push(`  chain: ${getProperty(condition, 'chain') || 11155111},  // ${getChainName(getProperty(condition, 'chain') || 11155111)}`);
        
        const contractAddress = getProperty(condition, 'contractAddress');
        if (contractAddress) lines.push(`  contractAddress: '${contractAddress}',`);
        
        const standardContractType = getProperty(condition, 'standardContractType');
        if (standardContractType) lines.push(`  standardContractType: '${standardContractType}',`);
        
        const functionAbi = getProperty(condition, 'functionAbi');
        if (functionAbi) {
          const abiStr = JSON.stringify(functionAbi)
            .replace(/"([^"]+)":/g, '$1:')
            .replace(/"/g, '\'');
          lines.push(`  functionAbi: ${abiStr},`);
        }
        
        const method = getProperty(condition, 'method');
        if (method) lines.push(`  method: '${method}',`);
        
        const parameters = getProperty(condition, 'parameters');
        if (parameters) {
          const paramsStr = JSON.stringify(parameters)
            .replace(/"([^"]+)":/g, '$1:')
            .replace(/"/g, '\'');
          lines.push(`  parameters: ${paramsStr},`);
        }
        
        const returnValueTest = getProperty(condition, 'returnValueTest');
        if (returnValueTest) {
          const testStr = JSON.stringify(returnValueTest)
            .replace(/"([^"]+)":/g, '$1:')
            .replace(/"/g, '\'');
          lines.push(`  returnValueTest: ${testStr},`);
        }
        lines.push('});');
      }
      else if (condition.conditionType === 'compound') {
        const operands = getProperty(condition, 'operands');
        const operator = getProperty(condition, 'operator');
        
        if (operands && Array.isArray(operands) && operands.length > 0) {
          // Generate code for each operand
          const operandVars: string[] = [];
          
          operands.forEach((operand, index) => {
            const operandVarName = `operand${index + 1}`;
            operandVars.push(operandVarName);
            
            // Recursively format each operand
            const operandLines = formatCondition(operand, operandVarName);
            lines.push(...operandLines);
            lines.push(''); // Add a blank line between operands
          });
          
          // Now create the compound condition with all operands
          lines.push(`const ${varName} = new conditions.compound.CompoundCondition({`);
          lines.push(`  operator: "${operator}",`);
          lines.push('  operands: [');
          operandVars.forEach(varName => {
            lines.push(`    ${varName},`);
          });
          lines.push('  ],');
          lines.push('});');
        } else {
          // Empty compound condition
          lines.push(`const ${varName} = new conditions.compound.CompoundCondition({`);
          lines.push(`  operator: "${operator}",`);
          lines.push('  operands: [],');
          lines.push('});');
        }
      }
      else {
        // Generic condition for unknown types
        lines.push('// This condition type may require custom setup');
        lines.push(`const ${varName} = ${JSON.stringify(condition, null, 2)
          .replace(/"([^"]+)":/g, '$1:')
          .replace(/"/g, '\'')};`);
      }
      
      return lines;
    };
    
    const lines: string[] = [];
    
    // Add imports
    lines.push('import { conditions } from "@nucypher/taco";');
    lines.push('');
    
    // Format the condition
    lines.push(...formatCondition(condition));
    
    return lines.join('\n');
  };

  // Helper function to get chain name from chain ID
  const getChainName = (chainId: number): string => {
    const chains: Record<number, string> = {
      1: 'ethereum mainnet',
      5: 'goerli',
      11155111: 'sepolia',
      137: 'polygon',
      80001: 'mumbai',
      42161: 'arbitrum',
      421613: 'arbitrum goerli',
      10: 'optimism',
      420: 'optimism goerli',
      56: 'bnb chain',
      97: 'bnb testnet',
      43114: 'avalanche',
      43113: 'fuji'
    };
    
    return chains[chainId] || 'custom network';
  };

  const formattedTypeScript = formatTypeScript(condition);

  const handleCopy = async () => {
    const textToCopy = viewMode === 'json' ? formattedJson : formattedTypeScript;
    if (!textToCopy) return;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'json' ? 'typescript' : 'json');
  };

  // Custom styles for the syntax highlighter
  const customStyle = {
    backgroundColor: 'transparent',
    margin: 0,
    padding: '0.5rem',
    fontSize: '0.875rem',
    maxHeight: '100%',
    overflow: 'auto',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-white/10 px-6 py-4 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            <svg className="w-5 h-5 text-taco" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h3 className="text-sm font-diatype font-bold text-white tracking-wide uppercase">
            {viewMode === 'json' ? 'JSON Preview' : 'API Usage'}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {copySuccess && (
            <div className="text-xs text-taco flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </div>
          )}
          <button
            onClick={toggleViewMode}
            className="px-2 py-1 text-xs bg-white/5 text-white/60 rounded
              hover:bg-white/10 hover:text-white/80 transition-all duration-200
              flex items-center gap-1.5"
            title={`Switch to ${viewMode === 'json' ? 'API Usage' : 'JSON'} view`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={viewMode === 'json' 
                  ? "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  : "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"} 
              />
            </svg>
            <span>{viewMode === 'json' ? 'API Usage' : 'JSON'}</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-black/30 relative group">
        {condition ? (
          <>
            <div className="text-white/70 text-sm font-mono w-full">
              <SyntaxHighlighter
                language={viewMode === 'json' ? 'json' : 'typescript'}
                style={atomDark}
                customStyle={customStyle}
                wrapLines={true}
                wrapLongLines={false}
                showLineNumbers={true}
                lineNumberStyle={{ color: 'rgba(255, 255, 255, 0.3)', paddingRight: '1em', userSelect: 'none' }}
              >
                {viewMode === 'json' ? formattedJson : formattedTypeScript}
              </SyntaxHighlighter>
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 text-white/40 hover:text-white/80
                hover:bg-white/10 rounded-lg transition-all duration-200
                opacity-0 group-hover:opacity-100"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/40 text-sm">
              No condition created yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JsonPreview; 