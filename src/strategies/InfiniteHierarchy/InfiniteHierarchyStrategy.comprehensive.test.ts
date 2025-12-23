import { describe, it, expect } from 'vitest';
import { InfiniteHierarchyStrategy, TreeNode } from './InfiniteHierarchyStrategy';

// Helper to check if an item matches the expected parent instance
function isParentInstance(parentId: string, childItem: any, potentialParent: any, flatItems: any[], flatItemsById: Map<string, any>) {
  // Get flat objects
  const childOriginalId = getOriginalId(childItem.id);
  const parentOriginalId = getOriginalId(potentialParent.id);
  
  if (parentOriginalId !== parentId) return false;

  const childFlatItem = flatItemsById.get(childOriginalId);
  const parentFlatItem = flatItemsById.get(parentOriginalId);
  
  if (!childFlatItem || !parentFlatItem) return false;

  // Calculate expected index
  const childFlatIndex = flatItems.indexOf(childFlatItem);
  const parentFlatIndex = flatItems.indexOf(parentFlatItem);
  const distance = childFlatIndex - parentFlatIndex;
  
  // If child is wrapped, its absolute index might be far from parent?
  // No, the parent instance MUST be relative to the child's instance.
  // The algorithm generates sticky parent with: index = child.index - distance.
  // So we check: potentialParent.index === childItem.index - distance
  
  return potentialParent.index === childItem.index - distance;
}

function getOriginalId(uniqueId: string): string {
  const separatorIndex = uniqueId.lastIndexOf('__');
  return separatorIndex !== -1 ? uniqueId.substring(0, separatorIndex) : uniqueId;
}

describe('InfiniteHierarchyStrategy Comprehensive', () => {
  // Create a complex tree structure
  const data: TreeNode[] = [
    {
      id: 'rootA',
      children: [
        {
          id: 'childA1',
          children: [
            { id: 'gcA1_1' },
            { id: 'gcA1_2' },
          ]
        },
        {
          id: 'childA2',
          children: [
            { id: 'gcA2_1' }
          ]
        }
      ]
    },
    {
      id: 'rootB', // Empty root
    },
    {
      id: 'rootC',
      children: [
        { id: 'childC1' },
        { id: 'childC2' },
        { id: 'childC3' }
      ]
    }
  ];
  
  // Flat list length:
  // RootA (1) + ChildA1 (1) + GC (2) + ChildA2 (1) + GC (1) = 6
  // RootB (1)
  // RootC (1) + Children (3) = 4
  // Total = 11 items.

  it('maintains hierarchy integrity across all scroll positions', () => {
    const strategy = new InfiniteHierarchyStrategy(data);
    const totalItems = 11; // Based on data structure
    const viewportSize = 5;
    
    // Test range: 0 to 2 * totalItems (cover 2 full loops to ensure wrapping logic holds)
    for (let pos = 0; pos <= totalItems * 2; pos++) {
      const items = strategy.getItemsAtPosition(pos, viewportSize);
      
      // 1. Check length
      expect(items).toHaveLength(viewportSize);
      
      // 2. Check offsets order
      for (let i = 0; i < items.length; i++) {
        expect(items[i].offset).toBe(i);
      }
      
      // 3. Check Parent Visibility
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const originalId = getOriginalId(item.id);
        const itemData = strategy.getItemData(item.id); // This gets data from flatItems
        
        // Use internal access hack to get parents for verification?
        // Or reconstruct parents map.
        // Strategy exposes getItemData which has parentId (singular).
        // But we need ALL parents (ancestors).
        // We can access private fields via `any` or build a shadow map.
        
        const strategyAny = strategy as any;
        const flatItemsById = strategyAny.flatItemsById;
        const flatItems = strategyAny.flatItems;
        const flatItem = flatItemsById.get(originalId);
        
        const parents = flatItem.parents; // ['rootA', 'childA1'] etc.
        
        // For each parent, there must be a visible item above
        for (const parentId of parents) {
          let found = false;
          
          // Check items from 0 to i-1 (strictly above)
          // Or is it allowed to be at the same slot? No, parent must be above.
          // Wait, if sticky replacement happens:
          // Slot 0: Parent
          // Slot 1: Child
          // Parent is at index 0. Child at index 1.
          
          for (let j = 0; j < i; j++) {
            const potentialParent = items[j];
            if (isParentInstance(parentId, item, potentialParent, flatItems, flatItemsById)) {
              found = true;
              break;
            }
          }
          
          if (!found) {
            console.error(`Position ${pos}: Item ${item.id} (Slot ${i}) missing parent ${parentId}`);
            console.log('Items:', items.map(it => it.id));
          }
          
          expect(found).toBe(true);
        }
      }
    }
  });
});
