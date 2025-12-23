# InfiniteHierarchyStrategy

Combines hierarchical sticky headers with infinite scrolling capabilities.

## Overview
InfiniteHierarchyStrategy flattens tree-structured data into a list and enables infinite scrolling with sticky headers. It correctly handles parent headers even when the list wraps around, ensuring that the correct instance of a parent (relative to its children) is displayed.

## Features
- Tree flattening (depth-first traversal)
- Infinite scrolling (modulo arithmetic)
- Sticky headers for parent nodes
- Correct parent association across loop boundaries
- Depth tracking for indentation

## Usage

```typescript
import { InfiniteHierarchyStrategy, TreeNode } from './InfiniteHierarchyStrategy';

const treeData: TreeNode[] = [
  { id: '1', title: 'Root', children: [...] },
  // ...
];

// Optional: customize total virtual positions
const strategy = new InfiniteHierarchyStrategy(treeData, { totalPositions: 100000 });

// Pass to TweenList
<TweenList strategy={strategy} ... />
```

## Algorithm Explained

The strategy employs a multi-step process to render the hierarchy correctly:

1.  **Preparation**: The hierarchical tree is flattened into a single list where each item knows its depth and its ancestors.
2.  **Selection**: The algorithm identifies which items from this flattened list would naturally appear in the view based on the current scroll position.
3.  **Grouping**: The visible items are divided into logical blocks called "sections". Each section contains items that share the same top-level root parent. This separation ensures that the algorithm can handle transitions between different trees or between the end and start of the list independently.
4.  **Sticky Header Resolution**: The algorithm processes these sections one by one from top to bottom to determine which headers should be sticky:
    *   It maintains a running "stack" of sticky headers accumulated from previous sections.
    *   For the current section, it checks if any item requires a parent header that is not currently visible.
    *   If a parent is missing, it must be "stuck" to the top. The algorithm adds this parent to the current section's sticky headers.
    *   Crucially, if there are sticky headers from a *previous* section occupying the slots, the algorithm removes the bottom-most one to make room for the new parent. This creates the visual effect of the new header "pushing" the old one out of view.
    *   This process repeats until all necessary parents for the section are visible or sticky.
5.  **Final Composition**: The final view is constructed by overlaying these sticky headers onto the top positions of the visible list, replacing the items that were naturally there.

## Limitations

- It doesn't cover the case where the list is too short and a section can appear on the bottom while some children are still on the top.
- It doesn't cover the case where hierarchy has not enough place in the window for being displayed for a specific child.
