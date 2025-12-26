import React from 'react';
import ReactDOM from 'react-dom/client';
import { InfiniteLoopApp } from '../src/strategies/InfiniteLoop/demo/InfiniteLoopApp';
import { InfiniteHierarchyApp } from '../src/strategies/InfiniteHierarchy/demo/InfiniteHierarchyApp';
import { InfiniteHierarchySelectionApp } from '../src/strategies/InfiniteHierarchySelection/demo/InfiniteHierarchySelectionApp';
import { InfiniteHierarchySelectionFlatApp } from '../src/strategies/InfiniteHierarchySelection/demo/InfiniteHierarchySelectionFlatApp';

const mode = (import.meta as any).env.VITE_APP_MODE;

let Component = InfiniteLoopApp;

if (mode === 'infinite-hierarchy') {
  Component = InfiniteHierarchyApp;
} else if (mode === 'infinite-hierarchy-selection') {
  Component = InfiniteHierarchySelectionFlatApp;
} else if (mode === 'infinite-hierarchy-selection-tree') {
  Component = InfiniteHierarchySelectionApp;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>
);
