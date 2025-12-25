# InfiniteHierarchySelectionStrategy

Extends hierarchical sticky headers and infinite scrolling with intelligent selection stickiness.

## Overview
InfiniteHierarchySelectionStrategy builds upon the logic of [InfiniteHierarchyStrategy](../InfiniteHierarchy/README.md) by adding a selection mechanism. Selected items are treated as "sticky" when they are not naturally visible in the viewport. This ensures that the user never loses context of what is selected, even while scrolling through a massive or infinite hierarchy.

## Features
- **All features of InfiniteHierarchyStrategy** (flattening, infinite scrolling, sticky headers)
- **Selection Stickiness**: Selected items stay visible at the top of the view if they scroll out of sight.
- **Priority Handling**: Selected items are prioritized over standard parent headers.
- **Dynamic Stack Growth**: The sticky stack grows to accommodate all selected items and necessary parents, rather than displacing them.

## Usage

```typescript
import { InfiniteHierarchySelectionStrategy, TreeNode } from './InfiniteHierarchySelectionStrategy';

const treeData: TreeNode[] = [
  { id: '1', title: 'Root', children: [...] },
  // ...
];

const strategy = new InfiniteHierarchySelectionStrategy(treeData);

// Selection API
strategy.select('some-id');
strategy.deselect('some-id');
strategy.toggleSelection('some-id');

// Listen for changes
strategy.setOnSelectionChange((selectedIds) => {
    console.log('Selection updated:', selectedIds);
});

// Pass to TweenList
<TweenList strategy={strategy} ... />

// Safe Scroll Target Detection
// Use this to determine where to scroll to ensure a selected item remains visible upon deselection
const safePos = strategy.findSafeScrollPosition('some-id', currentScrollPosition, viewportSlots);
```

## Algorithm Explained

The strategy modifies the standard sticky header algorithm to prioritize selected items:

1.  **Preparation**: Flattens the tree.
2.  **Selection**: Identifies naturally visible items.
3.  **Global Sticky Initialization**: Before processing sections, it identifies *all* selected items that are NOT in the naturally visible set and adds them to the sticky list immediately. This ensures distant selected items are brought into view.
4.  **Section Processing**:
    *   Iterates through hierarchical sections.
    *   **Protected Stack**: Unlike the standard strategy, this strategy **never removes** a selected item from the sticky stack to make room for a parent. Instead, the stack grows.
    *   **Covered Item Rescue**: As the sticky stack grows (due to parents or other selected items), it may cover naturally visible items at the top of the list. The algorithm continuously checks if any "covered" item is selected. If so, that item is immediately "rescued" (promoted) to the sticky list to ensure it remains visible.
5.  **Final Composition**: The result is a list where all selected items (whether local or distant) and all necessary context (parents of visible items) are presented at the top.

### Safe Scroll Position Finding
The strategy exposes `findSafeScrollPosition(id, currentPosition, viewportSlots)`. This method is crucial for interactions where a sticky selected item is clicked to deselect it. Since the item is sticky only *because* it is selected, deselecting it would normally cause it to disappear (return to its far-away natural position). 

This method iteratively searches for the closest scroll position where the item would be **naturally visible** (i.e., not requiring sticky behavior). This allows the application to smoothly scroll to that position *before* deselecting, ensuring a seamless user experience.

## Limitations

- It doesn't cover the case where the list is too short and a section can appear on the bottom while some children are still on the top.
- It doesn't cover the case where hierarchy has not enough place in the window for being displayed for a specific child.
- It doesn't explicitly support the case where the number of selected items exceeds the viewport size (the viewport will be filled with sticky items, leaving no room for scrolling).
