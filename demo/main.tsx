import React from 'react';
import ReactDOM from 'react-dom/client';
import { InfiniteLoopApp } from '../src/strategies/InfiniteLoop/demo/InfiniteLoopApp';
import { HierarchyApp } from '../src/strategies/Hierarchy/demo/HierarchyApp';

const mode = (import.meta as any).env.VITE_APP_MODE;

// Default to InfiniteLoopApp if no mode specified (or mode='infinite')
const Component = mode === 'hierarchy' ? HierarchyApp : InfiniteLoopApp;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>
);
