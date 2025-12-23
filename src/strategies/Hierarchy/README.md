# HierarchyStrategy

Flattens hierarchical data and provides sticky headers.

## Overview
HierarchyStrategy operates on tree-structured data. It flattens the tree into a list for rendering and handles sticky positioning of parent nodes when their children are scrolled into view.

## Features
- Tree flattening (depth-first traversal)
- Sticky headers for parent nodes
- Depth tracking for indentation
- Support for expandable/collapsible nodes (via data updates)

## Usage

```typescript
import { HierarchyStrategy, TreeNode } from './HierarchyStrategy';

const treeData: TreeNode[] = [
  { id: '1', title: 'Root', children: [...] },
  // ...
];

const strategy = new HierarchyStrategy(treeData);

// Pass to TweenList
<TweenList strategy={strategy} ... />
