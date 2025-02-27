import { BlockInput, BlockProperties } from './BlockTypes';

export interface DragItem {
  id: string;
  type: string;
  category?: string;
  label: string;
  inputs?: BlockInput[];
  properties?: BlockProperties;
  value?: string;
  isTemplate: boolean;
}

export type DragRef = ((element: HTMLDivElement | null) => void) | React.RefObject<HTMLDivElement | null>; 
