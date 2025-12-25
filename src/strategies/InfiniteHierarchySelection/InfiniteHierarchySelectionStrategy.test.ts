import { describe, it, expect } from 'vitest';
import { InfiniteHierarchySelectionStrategy } from './InfiniteHierarchySelectionStrategy';
import { InfiniteHierarchyStrategy } from '../InfiniteHierarchy/InfiniteHierarchyStrategy';

// Generate hierarchical data
const generateData = (count: number, depth: number = 0, parentId: string = ''): any[] => {
  if (depth > 3) return []; // Increased depth
  
  return Array.from({ length: count }).map((_, i) => {
    const id = parentId ? `${parentId}-${i}` : `item-${i}`;
    // Deterministic children generation
    const hasChildren = i % 2 === 0; 
    
    return {
      id,
      label: `Item ${id}`,
      children: hasChildren ? generateData(2, depth + 1, id) : []
    };
  });
};

const DATA = generateData(5); // Should create a decent sized tree

describe('InfiniteHierarchySelectionStrategy', () => {
  it('behaves exactly like InfiniteHierarchyStrategy when no items are selected', () => {
    const strategyOriginal = new InfiniteHierarchyStrategy(DATA, { totalPositions: 1000 });
    const strategySelection = new InfiniteHierarchySelectionStrategy(DATA, { totalPositions: 1000 });
    
    const viewportSlots = 10;
    const testRange = 200; // Test enough positions to cover multiple loops and sticky situations

    for (let position = 0; position < testRange; position++) {
      const itemsOriginal = strategyOriginal.getItemsAtPosition(position, viewportSlots);
      const itemsSelection = strategySelection.getItemsAtPosition(position, viewportSlots);

      expect(itemsSelection.length).toBe(itemsOriginal.length);
      
      for (let i = 0; i < itemsOriginal.length; i++) {
        const itemO = itemsOriginal[i];
        const itemS = itemsSelection[i];
        
        expect(itemS.id).toBe(itemO.id);
        expect(itemS.offset).toBe(itemO.offset);
        expect(itemS.index).toBe(itemO.index);
        expect(itemS.version).toBe(itemO.version);
      }
    }
  });

  it('handles selection stickiness', () => {
      // Basic test to verify selection stickiness works at all
      const strategy = new InfiniteHierarchySelectionStrategy(DATA, { totalPositions: 1000 });
      // Find a deep item
      // item-0 -> item-0-0 -> item-0-0-0
      const deepItemId = 'item-0-0-0';
      
      strategy.select(deepItemId);
      
      // Scroll to position 0. 
      // item-0 is at 0. item-0-0 at 1. item-0-0-0 at 2.
      // At position 0, item-0-0-0 is visible at slot 2.
      // It is selected. It should be there.
      let items = strategy.getItemsAtPosition(0, 5);
      expect(items.find(i => i.id.startsWith(deepItemId))).toBeDefined();

      // Now scroll way past it.
      // Item index is 2.
      // Scroll to position 10.
      // item-0-0-0 is at 2. 2 < 10.
      // It should stick to top.
      items = strategy.getItemsAtPosition(10, 5);
      
      const stickyItem = items.find(i => i.id.startsWith(deepItemId));
      expect(stickyItem).toBeDefined();
      expect(stickyItem?.offset).toBe(0);
      
      // And check that its parent 'item-0-0' is NOT present 
      // (because of the rule: "parents should not be visible because of that")
      const parentId = 'item-0-0';
      const parentSticky = items.find(i => i.id.startsWith(parentId + '__'));
      expect(parentSticky).toBeUndefined();
  });

  it('ensures selected item appears exactly once in the viewport', () => {
    const flatten = (items: any[]): any[] => {
      return items.reduce((acc, item) => {
        acc.push(item);
        if (item.children) {
          acc.push(...flatten(item.children));
        }
        return acc;
      }, []);
    };

    const allItems = flatten(DATA);
    
    // We will test with a specific viewport size
    const viewportSlots = 10;
    const testPositions = 100; // Check 100 scroll positions
    
    for (const itemToSelect of allItems) {
      const strategy = new InfiniteHierarchySelectionStrategy(DATA, { totalPositions: 10000 });
      strategy.select(itemToSelect.id);
      
      for (let pos = 0; pos < testPositions; pos += 5) { // Step by 5 to sample
        const items = strategy.getItemsAtPosition(pos, viewportSlots);
        
        // Count occurrences of the selected item
        const occurrences = items.filter(i => i.id.startsWith(itemToSelect.id + '__')).length;
        
        if (occurrences !== 1) {
            console.error(`Failed at pos ${pos} for item ${itemToSelect.id}. Occurrences: ${occurrences}`);
        }
        expect(occurrences).toBe(1);
      }
    }
  });

  it('maintains consistency across loop iterations (no selection)', () => {
    // Generate a longer dataset
    const generateLongData = (count: number, depth: number = 0, parentId: string = ''): any[] => {
        if (depth > 2) return [];
        return Array.from({ length: count }).map((_, i) => {
            const id = parentId ? `${parentId}-${i}` : `item-${i}`;
            const hasChildren = i % 2 === 0;
            return {
                id,
                children: hasChildren ? generateLongData(2, depth + 1, id) : []
            };
        });
    };
    
    const longData = generateLongData(5); 
    const strategy = new InfiniteHierarchySelectionStrategy(longData);
    
    // Determine flattened length
    const itemsAt0 = strategy.getItemsAtPosition(0, 1000); 
    const firstId = itemsAt0[0].id.split('__')[0];
    const length = itemsAt0.findIndex((item, index) => index > 0 && item.id.split('__')[0] === firstId);
    
    expect(length).toBeGreaterThan(0);
    
    const viewportSlots = 10;
    
    // Check consistency for a full loop
    for (let k = 0; k < length; k++) {
        const itemsK = strategy.getItemsAtPosition(k, viewportSlots);
        const itemsKN = strategy.getItemsAtPosition(k + length, viewportSlots);
        const itemsKminusN = strategy.getItemsAtPosition(k - length, viewportSlots);
        
        expect(itemsK.length).toBe(itemsKN.length);
        expect(itemsK.length).toBe(itemsKminusN.length);
        
        for (let i = 0; i < itemsK.length; i++) {
            const itemK = itemsK[i];
            const itemKN = itemsKN[i];
            const itemKminusN = itemsKminusN[i];
            
            const originalIdK = itemK.id.split('__')[0];
            const originalIdKN = itemKN.id.split('__')[0];
            const originalIdKminusN = itemKminusN.id.split('__')[0];
            
            expect(originalIdK).toBe(originalIdKN);
            expect(originalIdK).toBe(originalIdKminusN);
            
            expect(itemK.offset).toBe(itemKN.offset);
            expect(itemK.offset).toBe(itemKminusN.offset);
            
            // Check absolute index difference
            if (itemK.index !== undefined && itemKN.index !== undefined) {
                 expect(itemKN.index - itemK.index).toBe(length);
            }
            if (itemK.index !== undefined && itemKminusN.index !== undefined) {
                 expect(itemK.index - itemKminusN.index).toBe(length);
            }
        }
    }
  });

  it('ensures multiple selected items are always visible regardless of scroll position', () => {
    // Generate mid-size data with variance
    const generateVariedData = (count: number, depth: number = 0, parentId: string = ''): any[] => {
        if (depth > 4) return [];
        return Array.from({ length: count }).map((_, i) => {
            const id = parentId ? `${parentId}-${i}` : `item-${i}`;
            // Random-ish branching factor based on index
            const childCount = (i % 3) + 1; 
            // Only even items have children, to create gaps
            const hasChildren = i % 2 === 0;
            
            return {
                id,
                children: hasChildren ? generateVariedData(childCount, depth + 1, id) : []
            };
        });
    };
    
    // Create roughly 100 items
    // Root: 10 items.
    // Each even root (5 items) has ~2 children. -> 10 children.
    // Depth 2... should sum up.
    const data = generateVariedData(10); 
    const strategy = new InfiniteHierarchySelectionStrategy(data, { totalPositions: 5000 });
    
    // Find all IDs
    const flattenIds = (nodes: any[]): string[] => {
        return nodes.reduce((acc, node) => {
            acc.push(node.id);
            if (node.children) acc.push(...flattenIds(node.children));
            return acc;
        }, [] as string[]);
    };
    const allIds = flattenIds(data);
    
    // Select two distinct items: one early, one late/deep
    const firstSelection = allIds[2]; // Early
    const secondSelection = allIds[allIds.length - 2]; // Late/Deep
    
    strategy.select(firstSelection);
    strategy.select(secondSelection);
    
    const viewportSlots = 15;
    const checkRange = 500; // Check a significant range
    
    for (let pos = 0; pos < checkRange; pos++) {
        const items = strategy.getItemsAtPosition(pos, viewportSlots);
        
        const hasFirst = items.some(i => i.id.startsWith(firstSelection + '__'));
        const hasSecond = items.some(i => i.id.startsWith(secondSelection + '__'));
        
        if (!hasFirst || !hasSecond) {
            console.error(`Failed at pos ${pos}. Has ${firstSelection}: ${hasFirst}, Has ${secondSelection}: ${hasSecond}`);
        }
        
        expect(hasFirst).toBe(true);
        expect(hasSecond).toBe(true);
    }
  });
});
