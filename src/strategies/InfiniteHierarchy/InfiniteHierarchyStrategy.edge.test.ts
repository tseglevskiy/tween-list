import { describe, it, expect } from 'vitest';
import { InfiniteHierarchyStrategy, TreeNode } from './InfiniteHierarchyStrategy';

describe('InfiniteHierarchyStrategy Edge Cases', () => {
  it('handles empty data', () => {
    const strategy = new InfiniteHierarchyStrategy([]);
    const items = strategy.getItemsAtPosition(0, 5);
    expect(items).toHaveLength(0);
  });

  it('handles single item hierarchy', () => {
    const data: TreeNode[] = [{ id: 'root' }];
    const strategy = new InfiniteHierarchyStrategy(data);
    
    // Viewport larger than list (size 1)
    const items = strategy.getItemsAtPosition(0, 3);
    
    expect(items).toHaveLength(3);
    expect(items[0].id).toBe('root__0');
    expect(items[1].id).toBe('root__1');
    expect(items[2].id).toBe('root__2');
  });

  it('handles negative scrolling positions', () => {
    const data: TreeNode[] = [
      { id: '1' },
      { id: '2' },
      { id: '3' }
    ];
    const strategy = new InfiniteHierarchyStrategy(data);
    
    // Position -1: Should be item '3' (index 2)
    const items = strategy.getItemsAtPosition(-1, 3);
    
    // Slot 0 (Pos -1): 3 (index 2) -> id '3__-1'
    expect(items[0].id).toBe('3__-1');
    expect(items[0].offset).toBe(0);
    
    // Slot 1 (Pos 0): 1 (index 0) -> id '1__0'
    expect(items[1].id).toBe('1__0');
    expect(items[1].offset).toBe(1);
    
    // Slot 2 (Pos 1): 2 (index 1) -> id '2__1'
    expect(items[2].id).toBe('2__1');
    expect(items[2].offset).toBe(2);
  });

  it('handles large position values', () => {
    const data: TreeNode[] = [{ id: 'a' }, { id: 'b' }];
    const strategy = new InfiniteHierarchyStrategy(data);
    
    // 1000 % 2 = 0 -> item 'a'
    const items = strategy.getItemsAtPosition(1000, 2);
    
    expect(items[0].id).toBe('a__1000');
    expect(items[1].id).toBe('b__1001');
  });
});
