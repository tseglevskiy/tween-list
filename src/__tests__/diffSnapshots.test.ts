import { describe, it, expect } from 'vitest';
import { diffSnapshots } from '../utils/diffSnapshots';
import { PositionedItem } from '../types';

describe('diffSnapshots', () => {
  it('should interpolate items present in both floor and ceil', () => {
    const floor: PositionedItem[] = [
      { id: 'a', offset: 0 },
      { id: 'b', offset: 1 },
    ];
    const ceil: PositionedItem[] = [
      { id: 'a', offset: 0 },
      { id: 'b', offset: 1 },
    ];
    const prevItems = new Map();

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'a',
      offset: 0,
      opacity: 1,
      isAppearing: true, // Not in prevItems
      isDisappearing: false,
      isMoving: false,
      hasChanged: false,
    });
  });

  it('should interpolate positions between floor and ceil', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 0 }];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 2 }];
    const prevItems = new Map([['a', { offset: 0 }]]);

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result[0].offset).toBe(1); // lerp(0, 2, 0.5) = 1
    expect(result[0].opacity).toBe(1);
  });

  it('should mark items as appearing when only in ceil', () => {
    const floor: PositionedItem[] = [];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 0 }];
    const prevItems = new Map();

    const result = diffSnapshots(floor, ceil, 0.3, prevItems);

    expect(result).toHaveLength(1);
    // lerp(ceil_offset + 1, ceil_offset, t)
    // lerp(1, 0, 0.3) = 0.7
    expect(result[0]).toMatchObject({
      id: 'a',
      offset: 0.7, 
      opacity: 0.3, // Fade in based on t
      isAppearing: true,
      isDisappearing: false,
    });
  });

  it('should mark items as disappearing when only in floor', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 0 }];
    const ceil: PositionedItem[] = [];
    const prevItems = new Map([['a', { offset: 0 }]]);

    const result = diffSnapshots(floor, ceil, 0.3, prevItems);

    expect(result).toHaveLength(1);
    // lerp(floor_offset, floor_offset - 1, t)
    // lerp(0, -1, 0.3) = -0.3
    expect(result[0]).toMatchObject({
      id: 'a',
      offset: -0.3,
      opacity: 0.7, // 1 - t for fade out
      isAppearing: false,
      isDisappearing: true,
    });
  });

  it('should detect when items are moving (offset changed)', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 2 }];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 2 }];
    const prevItems = new Map([['a', { offset: 0 }]]); // Was at offset 0

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result[0].isMoving).toBe(true);
    expect(result[0].isAppearing).toBe(false); // Was in previous render
  });

  it('should not mark as moving when offset is unchanged', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 1 }];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 1 }];
    const prevItems = new Map([['a', { offset: 1 }]]);

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result[0].isMoving).toBe(false);
  });

  it('should detect version changes (hasChanged)', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 0, version: 2 }];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 0, version: 2 }];
    const prevItems = new Map([['a', { offset: 0, version: 1 }]]);

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result[0].hasChanged).toBe(true);
  });

  it('should not mark as changed when version is unchanged', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 0, version: 1 }];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 0, version: 1 }];
    const prevItems = new Map([['a', { offset: 0, version: 1 }]]);

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result[0].hasChanged).toBe(false);
  });

  it('should not mark as changed when version is undefined', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 0 }];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 0 }];
    const prevItems = new Map([['a', { offset: 0 }]]);

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result[0].hasChanged).toBe(false);
  });

  it('should handle multiple items with mixed states', () => {
    const floor: PositionedItem[] = [
      { id: 'a', offset: 0 }, // In both
      { id: 'b', offset: 1 }, // Disappearing
    ];
    const ceil: PositionedItem[] = [
      { id: 'a', offset: 0 }, // In both
      { id: 'c', offset: 2 }, // Appearing
    ];
    const prevItems = new Map([
      ['a', { offset: 0 }],
      ['b', { offset: 1 }],
    ]);

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result).toHaveLength(3);

    const itemA = result.find((item) => item.id === 'a');
    const itemB = result.find((item) => item.id === 'b');
    const itemC = result.find((item) => item.id === 'c');

    expect(itemA?.opacity).toBe(1);
    expect(itemA?.isAppearing).toBe(false);
    expect(itemA?.isDisappearing).toBe(false);

    expect(itemB?.opacity).toBe(0.5); // 1 - 0.5
    expect(itemB?.isDisappearing).toBe(true);

    expect(itemC?.opacity).toBe(0.5); // t
    expect(itemC?.isAppearing).toBe(true);
  });

  it('should handle empty inputs', () => {
    const floor: PositionedItem[] = [];
    const ceil: PositionedItem[] = [];
    const prevItems = new Map();

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result).toHaveLength(0);
  });

  it('should interpolate with t=0 (use floor values)', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 0 }];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 10 }];
    const prevItems = new Map();

    const result = diffSnapshots(floor, ceil, 0, prevItems);

    expect(result[0].offset).toBe(0);
  });

  it('should interpolate with t=1 (use ceil values)', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 0 }];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 10 }];
    const prevItems = new Map();

    const result = diffSnapshots(floor, ceil, 1, prevItems);

    expect(result[0].offset).toBe(10);
  });

  it('should preserve version in result', () => {
    const floor: PositionedItem[] = [{ id: 'a', offset: 0, version: 5 }];
    const ceil: PositionedItem[] = [{ id: 'a', offset: 0, version: 5 }];
    const prevItems = new Map();

    const result = diffSnapshots(floor, ceil, 0.5, prevItems);

    expect(result[0].version).toBe(5);
  });
});
