import { PositionedItem, InterpolatedItem } from '../types';
import { lerp } from './lerp';

/**
 * Performs dual diffing to create interpolated item states
 * 
 * Compares:
 * 1. Floor vs Ceil snapshots for scroll interpolation
 * 2. Previous vs Current states for data-change detection
 * 
 * @param itemsAtFloor - Items at floor(scrollPosition)
 * @param itemsAtCeil - Items at ceil(scrollPosition)
 * @param t - Interpolation factor between floor and ceil (0-1)
 * @param prevItems - Previous render's item states for change detection
 * @returns Array of interpolated items with animation flags
 */
export function diffSnapshots(
  itemsAtFloor: PositionedItem[],
  itemsAtCeil: PositionedItem[],
  t: number,
  prevItems: Map<string, { offset: number; index?: number; version?: number }>
): InterpolatedItem[] {
  // Create Maps for O(1) lookups
  const floorMap = new Map<string, PositionedItem>();
  const ceilMap = new Map<string, PositionedItem>();

  for (const item of itemsAtFloor) {
    floorMap.set(item.id, item);
  }

  for (const item of itemsAtCeil) {
    ceilMap.set(item.id, item);
  }

  // Collect all unique IDs from both snapshots
  const allIds = new Set<string>([...floorMap.keys(), ...ceilMap.keys()]);

  const result: InterpolatedItem[] = [];

  for (const id of allIds) {
    const inFloor = floorMap.get(id);
    const inCeil = ceilMap.get(id);
    const prevState = prevItems.get(id);
    const index = inFloor ? inFloor.index : (inCeil ? inCeil.index : undefined);

    if (inFloor && inCeil) {
      // Item exists in both floor and ceil - interpolate position
      const offset = lerp(inFloor.offset, inCeil.offset, t);
      const isAppearing = !prevState; // Not in previous render
      const isDisappearing = false;
      
      // Check for structural movement
      // If we have index, use it. Otherwise fall back to offset check.
      let isMoving = false;
      if (prevState) {
        if (inFloor.index !== undefined && prevState.index !== undefined) {
           isMoving = prevState.index !== inFloor.index;
        } else {
           isMoving = prevState.offset !== inFloor.offset;
        }
      }

      const hasChanged = prevState && prevState.version !== undefined && inFloor.version !== undefined
        ? prevState.version !== inFloor.version
        : false;

      // Check for sticky behavior (constant relative offset)
      const isSticky = inFloor.offset === inCeil.offset;

      result.push({
        id,
        offset,
        index,
        opacity: 1,
        isAppearing,
        isDisappearing,
        isMoving,
        hasChanged,
        isSticky,
        version: inFloor.version,
      });
    } else if (inFloor && !inCeil) {
      // Item only in floor - scrolling out (disappearing)
      // Fade out based on interpolation factor
      const opacity = 1 - t;
      
      // Interpolate offset as if it were moving to (offset - 1)
      const offset = lerp(inFloor.offset, inFloor.offset - 1, t);

      result.push({
        id,
        offset,
        index,
        opacity,
        isAppearing: false,
        isDisappearing: true,
        isMoving: false,
        hasChanged: false,
        isSticky: false,
        version: inFloor.version,
      });
    } else if (!inFloor && inCeil) {
      // Item only in ceil - scrolling in (appearing)
      // Fade in based on interpolation factor
      const opacity = t;

      // Interpolate offset as if it came from (offset + 1)
      const offset = lerp(inCeil.offset + 1, inCeil.offset, t);

      result.push({
        id,
        offset,
        index,
        opacity,
        isAppearing: true,
        isDisappearing: false,
        isMoving: false,
        hasChanged: false,
        isSticky: false,
        version: inCeil.version,
      });
    }
  }

  return result;
}
