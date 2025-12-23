import { describe, it, expect } from 'vitest';
import { HierarchyStrategy, TreeNode } from './HierarchyStrategy';

describe('HierarchyStrategy', () => {
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

  it('flattens the tree correctly', () => {
    const strategy = new HierarchyStrategy(data);
    expect(strategy.getTotalPositions()).toBe(6);
    
    expect(strategy.getItemData('root').depth).toBe(0);
    expect(strategy.getItemData('child1').depth).toBe(1);
    expect(strategy.getItemData('grandchild1').depth).toBe(2);
  });

  it('returns natural items when no scrolling', () => {
    const strategy = new HierarchyStrategy(data);
    const items = strategy.getItemsAtPosition(0, 3);
    
    expect(items).toHaveLength(3);
    expect(items[0].id).toBe('root');
    expect(items[0].offset).toBe(0);
    expect(items[1].id).toBe('child1');
    expect(items[1].offset).toBe(1);
    expect(items[2].id).toBe('grandchild1');
    expect(items[2].offset).toBe(2);
  });

  it('applies sticky headers when scrolling deep into hierarchy', () => {
    const strategy = new HierarchyStrategy(data);
    
    // Position 2: Top item is 'grandchild1' (offset 2 in natural list)
    // Parents: root, child1.
    // Natural view at pos 2 (viewport 3):
    // Slot 0: grandchild1
    // Slot 1: grandchild2
    // Slot 2: child2
    
    // Expected sticky behavior:
    // Slot 0: Topmost is grandchild1. Parents [root, child1].
    // root is not visible. Replace slot 0 with root.
    // Sticky: {root}
    
    // Slot 1: Topmost non-sticky is grandchild2 (natural slot 1).
    // Parents: [root, child1].
    // root is visible (in slot 0).
    // child1 is NOT visible. Replace slot 1 with child1.
    // Sticky: {root, child1}
    
    // Slot 2: Topmost non-sticky is child2 (natural slot 2).
    // Parents: [root].
    // root is visible.
    // No replacement.
    
    // Result:
    // Slot 0: root
    // Slot 1: child1
    // Slot 2: child2
    
    const items = strategy.getItemsAtPosition(2, 3);
    
    expect(items).toHaveLength(3);
    
    // Slot 0 should be sticky root
    expect(items[0].id).toBe('root');
    expect(items[0].offset).toBe(0);
    
    // Slot 1 should be sticky child1
    expect(items[1].id).toBe('child1');
    expect(items[1].offset).toBe(1);
    
    // Slot 2 should be child2 (because grandchild1 and grandchild2 were covered)
    // Wait, let's re-verify logic.
    // Natural list at pos 2:
    // 0: grandchild1
    // 1: grandchild2
    // 2: child2
    
    // Pass 1 (Slot 0):
    // Current: grandchild1. Parents [root, child1].
    // Missing: root. Replace with root.
    // Slot 0 -> root. Sticky {root}.
    
    // Pass 2 (Slot 1):
    // Current: grandchild2. Parents [root, child1].
    // root is in sticky set (visible).
    // child1 is missing. Replace with child1.
    // Slot 1 -> child1. Sticky {root, child1}.
    
    // Pass 3 (Slot 2):
    // Current: child2. Parents [root].
    // root is in sticky set.
    // No missing parents.
    // Slot 2 -> child2.
    
    expect(items[2].id).toBe('child2');
    expect(items[2].offset).toBe(2);
  });

  it('correctly handles transition when header becomes visible naturally', () => {
    const strategy = new HierarchyStrategy(data);
    
    // Position 1: Top item is 'child1'
    // Natural view:
    // 0: child1
    // 1: grandchild1
    // 2: grandchild2
    
    // Pass 1 (Slot 0):
    // Current: child1. Parents [root].
    // root is missing. Replace with root.
    // Slot 0 -> root. Sticky {root}.
    
    // Pass 2 (Slot 1):
    // Current: grandchild1. Parents [root, child1].
    // root is visible.
    // child1 is missing? (It was in slot 0 naturally, but replaced by root).
    // So child1 is NOT visible in slots 0..0.
    // Replace with child1.
    // Slot 1 -> child1. Sticky {root, child1}.
    
    // Pass 3 (Slot 2):
    // Current: grandchild2. Parents [root, child1].
    // Both visible.
    // Slot 2 -> grandchild2.
    
    const items = strategy.getItemsAtPosition(1, 3);
    expect(items[0].id).toBe('root');
    expect(items[1].id).toBe('child1');
    expect(items[2].id).toBe('grandchild2');
  });

  it('correctly handles root at top', () => {
    const strategy = new HierarchyStrategy(data);
    
    // Position 0: Top item is 'root'
    // Natural:
    // 0: root
    // 1: child1
    // 2: grandchild1
    
    // Pass 1 (Slot 0):
    // Current: root. Parents [].
    // No parents missing.
    // Slot 0 -> root.
    
    // Pass 2 (Slot 1):
    // Current: child1. Parents [root].
    // root is visible (slot 0).
    // Slot 1 -> child1.
    
    // Pass 3 (Slot 2):
    // Current: grandchild1. Parents [root, child1].
    // root visible. child1 visible.
    // Slot 2 -> grandchild1.
    
    const items = strategy.getItemsAtPosition(0, 3);
    expect(items[0].id).toBe('root');
    expect(items[1].id).toBe('child1');
    expect(items[2].id).toBe('grandchild1');
  });
});
