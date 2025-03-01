'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Block } from './BlockTypes';

interface ValueBlockProps {
  block: Block;
  isPreview?: boolean;
  onChange?: (value: string) => void;
}

const ValueBlock: React.FC<ValueBlockProps> = ({ 
  block, 
  isPreview = false,
  onChange 
}) => {
  const [value, setValue] = useState(block.value || '');

  useEffect(() => {
    if (block.value !== undefined) {
      setValue(block.value);
    }
  }, [block.value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  const getPlaceholder = () => {
    if (block.placeholder) return block.placeholder;
    if (block.label) return `Enter ${block.label.toLowerCase()}`;
    return '';
  };

  return (
    <div className={`
      group relative flex items-center gap-2 p-2 rounded-lg
      ${isPreview ? 'bg-green-800' : 'bg-green-700 shadow-md hover:shadow-lg transform hover:-translate-y-1'}
      transition-all duration-200
    `}>
      <label className={`
        text-sm font-medium whitespace-nowrap
        ${isPreview ? 'text-gray-200' : 'text-gray-100'}
      `}>
        {block.label}:
      </label>
      <input
        type={block.inputType || 'text'}
        value={value}
        onChange={handleChange}
        placeholder={getPlaceholder()}
        autoComplete="off"
        data-form-type="other"
        className={`
          bg-gray-800/90 rounded px-2 py-1 text-sm w-full text-gray-100
          border border-transparent
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
          placeholder-gray-500
          ${isPreview ? 'bg-gray-800' : 'bg-gray-800/90'}
        `}
      />
    </div>
  );
};

export default ValueBlock; 