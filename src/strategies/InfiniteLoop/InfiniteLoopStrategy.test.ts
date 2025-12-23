import { describe, it, expect } from 'vitest';
import { InfiniteLoopStrategy } from './InfiniteLoopStrategy';

interface TestItem {
  id: string;
  value: string;
}

describe('InfiniteLoopStrategy', () => {
  describe('initialization', () => {
    it('should initialize with items array', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
      ];

      const strategy = new InfiniteLoopStrategy(items);

      expect(strategy.getItemData('a')).toEqual({ id: 'a', value: 'Item A' });
      expect(strategy.getItemData('b')).toEqual({ id: 'b', value: 'Item B' });
    });

    it('should use default totalPositions of 100_000', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      expect(strategy.getTotalPositions()).toBe(100_000);
    });

    it('should use custom totalPositions when provided', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items, {
        totalPositions: 1000,
      });

      expect(strategy.getTotalPositions()).toBe(1000);
    });

    it('should use default getItemId that reads id property', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      const positioned = strategy.getItemsAtPosition(0, 1);
      expect(positioned[0].id).toBe('a__0');
    });

    it('should use custom getItemId when provided', () => {
      const items = [{ customId: 'x', value: 'Item X' }];
      const strategy = new InfiniteLoopStrategy(items, {
        getItemId: (item) => item.customId,
      });

      const positioned = strategy.getItemsAtPosition(0, 1);
      expect(positioned[0].id).toBe('x__0');
    });
  });

  describe('getItemsAtPosition', () => {
    it('should return items for viewport slots', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
        { id: 'c', value: 'Item C' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      const result = strategy.getItemsAtPosition(0, 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ id: 'a__0', offset: 0 });
      expect(result[1]).toMatchObject({ id: 'b__1', offset: 1 });
      expect(result[2]).toMatchObject({ id: 'c__2', offset: 2 });
    });

    it('should wrap around using modulo arithmetic', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
        { id: 'c', value: 'Item C' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      // Position 1 with 3 slots should show: b, c, a (wrapping)
      const result = strategy.getItemsAtPosition(1, 3);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('b__1');
      expect(result[1].id).toBe('c__2');
      expect(result[2].id).toBe('a__3'); // Wrapped around
    });

    it('should handle large position values with modulo', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      // Position 1000 % 2 = 0, should start at 'a'
      const result = strategy.getItemsAtPosition(1000, 2);

      expect(result[0].id).toBe('a__1000');
      expect(result[1].id).toBe('b__1001');
    });

    it('should return empty array for empty items', () => {
      const strategy = new InfiniteLoopStrategy([]);

      const result = strategy.getItemsAtPosition(0, 5);

      expect(result).toHaveLength(0);
    });

    it('should include version in positioned items', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      const result = strategy.getItemsAtPosition(0, 1);

      expect(result[0].version).toBe(0); // Initial version
    });

    it('should assign correct slot offsets', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      const result = strategy.getItemsAtPosition(5, 4);

      expect(result[0].offset).toBe(0);
      expect(result[1].offset).toBe(1);
      expect(result[2].offset).toBe(2);
      expect(result[3].offset).toBe(3);
    });
  });

  describe('getItemData', () => {
    it('should return item data by id', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      expect(strategy.getItemData('a')).toEqual({ id: 'a', value: 'Item A' });
      expect(strategy.getItemData('b')).toEqual({ id: 'b', value: 'Item B' });
    });

    it('should throw error for non-existent id', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      expect(() => strategy.getItemData('nonexistent')).toThrow(
        'Item with id "nonexistent" (derived from "nonexistent") not found'
      );
    });
  });

  describe('getInitialPosition', () => {
    it('should return middle of totalPositions', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      expect(strategy.getInitialPosition()).toBe(50_000); // 100_000 / 2
    });

    it('should return middle of custom totalPositions', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items, {
        totalPositions: 1000,
      });

      expect(strategy.getInitialPosition()).toBe(500);
    });
  });

  describe('updateItem', () => {
    it('should update item data', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      strategy.updateItem('a', { id: 'a', value: 'Updated A' });

      expect(strategy.getItemData('a')).toEqual({ id: 'a', value: 'Updated A' });
    });

    it('should not increment version by default', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      strategy.updateItem('a', { id: 'a', value: 'Updated A' });

      const result = strategy.getItemsAtPosition(0, 1);
      expect(result[0].version).toBe(0);
    });

    it('should increment version when incrementVersion is true', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      strategy.updateItem('a', { id: 'a', value: 'Updated A' }, true);

      const result = strategy.getItemsAtPosition(0, 1);
      expect(result[0].version).toBe(1);
    });

    it('should increment version multiple times', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      strategy.updateItem('a', { id: 'a', value: 'Update 1' }, true);
      strategy.updateItem('a', { id: 'a', value: 'Update 2' }, true);
      strategy.updateItem('a', { id: 'a', value: 'Update 3' }, true);

      const result = strategy.getItemsAtPosition(0, 1);
      expect(result[0].version).toBe(3);
    });

    it('should throw error for non-existent id', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      expect(() =>
        strategy.updateItem('nonexistent', { id: 'nonexistent', value: 'X' })
      ).toThrow('Item with id "nonexistent" not found');
    });

    it('should preserve other items when updating one', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      strategy.updateItem('a', { id: 'a', value: 'Updated A' });

      expect(strategy.getItemData('a').value).toBe('Updated A');
      expect(strategy.getItemData('b').value).toBe('Item B');
    });
  });

  describe('setItems', () => {
    it('should replace entire items array', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      const newItems: TestItem[] = [
        { id: 'x', value: 'Item X' },
        { id: 'y', value: 'Item Y' },
      ];

      strategy.setItems(newItems);

      expect(strategy.getItemData('x')).toEqual({ id: 'x', value: 'Item X' });
      expect(strategy.getItemData('y')).toEqual({ id: 'y', value: 'Item Y' });
      expect(() => strategy.getItemData('a')).toThrow();
    });

    it('should reset versions to 0', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      // Increment version first
      strategy.updateItem('a', { id: 'a', value: 'Updated' }, true);

      // Replace items
      strategy.setItems([{ id: 'a', value: 'New Item A' }]);

      const result = strategy.getItemsAtPosition(0, 1);
      expect(result[0].version).toBe(0); // Reset to 0
    });

    it('should handle empty array', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      strategy.setItems([]);

      const result = strategy.getItemsAtPosition(0, 5);
      expect(result).toHaveLength(0);
    });

    it('should update getItemsAtPosition after setItems', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      strategy.setItems([{ id: 'x', value: 'Item X' }]);

      const result = strategy.getItemsAtPosition(0, 2);
      expect(result[0].id).toBe('x__0');
      expect(result[1].id).toBe('x__1'); // Should wrap
    });
  });

  describe('edge cases', () => {
    it('should handle single item array', () => {
      const items: TestItem[] = [{ id: 'a', value: 'Item A' }];
      const strategy = new InfiniteLoopStrategy(items);

      const result = strategy.getItemsAtPosition(0, 5);

      expect(result).toHaveLength(5);
      // All items should derive from 'a' but have unique IDs (a__0, a__1, etc.)
      expect(result.every((item) => item.id.startsWith('a__'))).toBe(true);
      // And all should be unique
      const ids = new Set(result.map(item => item.id));
      expect(ids.size).toBe(5);
    });

    it('should handle position 0', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      const result = strategy.getItemsAtPosition(0, 2);

      expect(result[0].id).toBe('a__0');
      expect(result[1].id).toBe('b__1');
    });

    it('should handle negative modulo correctly', () => {
      const items: TestItem[] = [
        { id: 'a', value: 'Item A' },
        { id: 'b', value: 'Item B' },
        { id: 'c', value: 'Item C' },
      ];
      const strategy = new InfiniteLoopStrategy(items);

      // JavaScript's modulo with negative numbers
      const result = strategy.getItemsAtPosition(-1, 2);

      // -1 % 3 = -1 in JavaScript, which should map to item at index -1
      // This tests actual JavaScript behavior
      expect(result).toHaveLength(2);
    });
  });
});
