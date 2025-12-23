import { describe, it, expect } from 'vitest';
import { InfiniteHierarchyStrategy, TreeNode } from './InfiniteHierarchyStrategy';

describe('InfiniteHierarchyStrategy', () => {
  const data: TreeNode[] = [
    {
      id: 'root',
      children: [
        {
          id: 'child1',
          children: [
            { id: 'grandchild1' },
            { id: 'grandchild2' },
          ],
        },
        {
          id: 'child2',
          children: [
            { id: 'grandchild3' },
          ],
        },
      ],
    },
  ];

  // Flattened structure:
  // 0: root (depth 0, parents [])
  // 1: child1 (depth 1, parents [root])
  // 2: grandchild1 (depth 2, parents [root, child1])
  // 3: grandchild2 (depth 2, parents [root, child1])
  // 4: child2 (depth 1, parents [root])
  // 5: grandchild3 (depth 2, parents [root, child2])
  // Total length: 6

  it('flattens the tree correctly', () => {
    const strategy = new InfiniteHierarchyStrategy(data);
    
    expect(strategy.getItemData('root').depth).toBe(0);
    expect(strategy.getItemData('child1').depth).toBe(1);
    expect(strategy.getItemData('grandchild1').depth).toBe(2);
  });

  it('returns natural items with unique IDs', () => {
    const strategy = new InfiniteHierarchyStrategy(data);
    const items = strategy.getItemsAtPosition(0, 3);
    
    expect(items).toHaveLength(3);
    // root__0
    expect(items[0].id).toBe('root__0');
    expect(items[0].offset).toBe(0);
    // child1__1
    expect(items[1].id).toBe('child1__1');
    expect(items[1].offset).toBe(1);
    // grandchild1__2
    expect(items[2].id).toBe('grandchild1__2');
    expect(items[2].offset).toBe(2);
  });

  it('handles infinite scrolling wrapping', () => {
    const strategy = new InfiniteHierarchyStrategy(data);
    // Length is 6. Position 5 is last item (grandchild3).
    // Position 6 wraps to 0 (root).
    const items = strategy.getItemsAtPosition(5, 3);
    
    // Natural:
    // Slot 0 (Pos 5): grandchild3 (parents: root, child2)
    // Slot 1 (Pos 6): root (parents: [])
    // Slot 2 (Pos 7): child1 (parents: root)

    // Sticky Logic:
    
    // Slot 0: grandchild3__5
    // Parents: root (index 0), child2 (index 4).
    // Expected Parent Indices:
    // root: 5 - (5 - 0) = 0. ID: root__0.
    // child2: 5 - (5 - 4) = 4. ID: child2__4.
    // Visible?
    // root__0 is NOT in slots (0..-1).
    // Replace slot 0 with root__0.
    // Sticky: {root__0}
    expect(items[0].id).toBe('root__0');

    // Slot 1: root__6 (Next loop iteration of root)
    // Parents: []
    // root__0 is in sticky set. But item is root__6.
    // No replacement needed.
    expect(items[1].id).toBe('root__6');

    // Slot 2: child1__7
    // Parents: root. Expected ID: 7 - (1 - 0) = 6. -> root__6.
    // Is root__6 visible?
    // Yes, in Slot 1.
    // No replacement.
    expect(items[2].id).toBe('child1__7');
  });

  it('handles sticky headers correctly deep in hierarchy', () => {
    const strategy = new InfiniteHierarchyStrategy(data);
    
    // Position 2: Top item is 'grandchild1' (offset 2 in natural list)
    // Parents: root, child1.
    // Natural:
    // Slot 0 (Pos 2): grandchild1__2
    // Slot 1 (Pos 3): grandchild2__3
    // Slot 2 (Pos 4): child2__4

    const items = strategy.getItemsAtPosition(2, 3);
    
    // Slot 0: grandchild1__2.
    // Parents: root (expected root__0), child1 (expected child1__1).
    // Missing root__0. Replace.
    // Slot 0 -> root__0. Sticky {root__0}.
    expect(items[0].id).toBe('root__0');
    
    // Slot 1: grandchild2__3.
    // Parents: root (expected root__0), child1 (expected child1__1).
    // root__0 is visible (sticky).
    // child1__1 is missing. Replace.
    // Slot 1 -> child1__1. Sticky {root__0, child1__1}.
    expect(items[1].id).toBe('child1__1');
    
    // Slot 2: child2__4.
    // Parents: root (expected root__0).
    // root__0 visible.
    // Slot 2 -> child2__4.
    expect(items[2].id).toBe('child2__4');
  });

  it('handles wrapping with sticky headers correctly', () => {
    const strategy = new InfiniteHierarchyStrategy(data);
    
    // Let's scroll such that we are deep in the SECOND iteration of the list.
    // Length 6.
    // Start at Position 8 (2 + 6).
    // Same structure as Position 2, but absolute indices shifted by 6.
    
    const items = strategy.getItemsAtPosition(8, 3);
    
    // Natural:
    // Slot 0 (Pos 8): grandchild1__8
    // Slot 1 (Pos 9): grandchild2__9
    // Slot 2 (Pos 10): child2__10
    
    // Slot 0: grandchild1__8.
    // Parents: root, child1.
    // Expected root: 8 - (2 - 0) = 6. -> root__6.
    // Expected child1: 8 - (2 - 1) = 7. -> child1__7.
    // Missing root__6. Replace.
    expect(items[0].id).toBe('root__6');
    
    // Slot 1: grandchild2__9.
    // Parents: root (root__6), child1 (child1__7).
    // root__6 visible.
    // child1__7 missing. Replace.
    expect(items[1].id).toBe('child1__7');
    
    // Slot 2: child2__10.
    // Parents: root (root__6).
    // root__6 visible.
    expect(items[2].id).toBe('child2__10');
  });
});
