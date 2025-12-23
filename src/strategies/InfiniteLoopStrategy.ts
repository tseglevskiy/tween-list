import { VisibilityStrategy, PositionedItem } from '../types';

/**
 * InfiniteLoopStrategy - Built-in strategy for infinite scrolling lists
 * 
 * Wraps a finite array of items into an infinite scrollable list using modulo arithmetic.
 * Supports in-place mutations via updateItem and setItems methods.
 */
export class InfiniteLoopStrategy<TData = any> implements VisibilityStrategy<TData> {
  private items: TData[];
  private itemsById: Map<string, TData>;
  private getItemId: (item: TData) => string;
  private totalPositions: number;
  private itemVersions: Map<string, number>;

  constructor(
    items: TData[],
    options?: {
      getItemId?: (item: TData) => string;
      totalPositions?: number;
    }
  ) {
    this.items = items;
    this.getItemId = options?.getItemId ?? ((item: any) => item.id);
    // Default to 100,000 positions to stay within typical browser scroll height limits
    // (e.g. 100,000 * 50px = 5,000,000px, well under the ~10-30M limit)
    this.totalPositions = options?.totalPositions ?? 100_000;
    this.itemsById = new Map();
    this.itemVersions = new Map();

    // Build ID map
    for (const item of items) {
      const id = this.getItemId(item);
      this.itemsById.set(id, item);
      this.itemVersions.set(id, 0);
    }
  }

  getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[] {
    if (this.items.length === 0) {
      return [];
    }

    const result: PositionedItem[] = [];

    for (let slot = 0; slot < viewportSlots; slot++) {
      // Calculate which item should be at this position + slot
      const absoluteIndex = position + slot;
      // Handle negative modulo properly
      let itemIndex = absoluteIndex % this.items.length;
      if (itemIndex < 0) {
        itemIndex += this.items.length;
      }
      const item = this.items[itemIndex];
      const originalId = this.getItemId(item);
      const version = this.itemVersions.get(originalId);

      // Create a unique ID for this position to support diffing
      // Format: originalId__absoluteIndex
      const uniqueId = `${originalId}__${absoluteIndex}`;

      result.push({
        id: uniqueId,
        offset: slot,
        index: absoluteIndex,
        version,
      });
    }

    return result;
  }

  getItemData(id: string): TData {
    // Parse original ID from unique ID (originalId__absoluteIndex)
    const separatorIndex = id.lastIndexOf('__');
    const originalId = separatorIndex !== -1 ? id.substring(0, separatorIndex) : id;

    const item = this.itemsById.get(originalId);
    if (!item) {
      // Fallback: try looking up by the full id (in case it wasn't a composite ID)
      const fallbackItem = this.itemsById.get(id);
      if (fallbackItem) return fallbackItem;

      throw new Error(`Item with id "${originalId}" (derived from "${id}") not found`);
    }
    return item;
  }

  getTotalPositions(): number {
    return this.totalPositions;
  }

  getInitialPosition(): number {
    return Math.floor(this.totalPositions / 2);
  }

  /**
   * Update an existing item in place
   * @param id - Item ID to update
   * @param data - New item data
   * @param incrementVersion - If true, increments version to trigger change animation
   */
  updateItem(id: string, data: TData, incrementVersion: boolean = false): void {
    // Find the item index
    const index = this.items.findIndex((item) => this.getItemId(item) === id);
    if (index === -1) {
      throw new Error(`Item with id "${id}" not found`);
    }

    // Update the item
    this.items[index] = data;
    this.itemsById.set(id, data);

    // Optionally increment version
    if (incrementVersion) {
      const currentVersion = this.itemVersions.get(id) ?? 0;
      this.itemVersions.set(id, currentVersion + 1);
    }
  }

  /**
   * Replace entire items array
   * @param items - New items array
   */
  setItems(items: TData[]): void {
    this.items = items;
    this.itemsById.clear();
    this.itemVersions.clear();

    // Rebuild maps
    for (const item of items) {
      const id = this.getItemId(item);
      this.itemsById.set(id, item);
      this.itemVersions.set(id, 0);
    }
  }
}
