import type { GridStack } from 'gridstack';
import { createContext } from 'svelte';

export interface GridStackContext {
  grid?: GridStack;
}

export const [getGridStackContext, setGridStackContext] = createContext<GridStackContext>();
