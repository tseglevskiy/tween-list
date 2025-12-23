import { VisibilityStrategy, PositionedItem } from '../../types';

export interface TreeNode {
  id: string;
  children?: TreeNode[];
  [key: string]: any;
}

interface FlatItem<T> {
  data: T;
  id: string;
  depth: number;
  parents: string[]; // IDs of parents from root down to immediate parent
}

/**
 * HierarchyStrategy - Flattens hierarchical data and provides sticky headers
 */
export class HierarchyStrategy<TData extends TreeNode = TreeNode> implements VisibilityStrategy<TData> {
  private flatItems: FlatItem<TData>[];
  private itemsById: Map<string, TData>;
  private flatItemsById: Map<string, FlatItem<TData>>;
  private itemVersions: Map<string, number>;

  constructor(items: TData[]) {
    this.itemsById = new Map();
    this.flatItemsById = new Map();
    this.itemVersions = new Map();
    this.flatItems = this.flattenItems(items);
  }

  private flattenItems(
    items: TData[], 
    depth: number = 0, 
    parents: string[] = []
  ): FlatItem<TData>[] {
    let result: FlatItem<TData>[] = [];
    
    for (const item of items) {
      const flatItem: FlatItem<TData> = {
        data: item,
        id: item.id,
        depth,
        parents: [...parents]
      };
      
      result.push(flatItem);
      this.itemsById.set(item.id, item);
      this.flatItemsById.set(item.id, flatItem);
      this.itemVersions.set(item.id, 0);
      
      if (item.children && item.children.length > 0) {
        const childParents = [...parents, item.id];
        // Cast children to TData[] assuming homogeneous tree
        const children = this.flattenItems(item.children as unknown as TData[], depth + 1, childParents);
        result = result.concat(children);
      }
    }
    
    return result;
  }

  getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[] {
    if (this.flatItems.length === 0) {
      return [];
    }

    // 1. Calculate natural list of elements
    const result: PositionedItem[] = [];
    
    // We populate the result array with "holes" initially or just build it index by index
    // Using an array where index corresponds to offset is easiest
    const slots: (PositionedItem | null)[] = new Array(viewportSlots).fill(null);
    const stickyIds = new Set<string>();

    // 2. Initial population with natural items
    for (let slot = 0; slot < viewportSlots; slot++) {
      const index = position + slot;
      if (index >= 0 && index < this.flatItems.length) {
        const item = this.flatItems[index];
        slots[slot] = {
          id: item.id,
          offset: slot,
          index: index,
          version: this.itemVersions.get(item.id),
        };
      }
    }

    // 3. Sticky header replacement loop
    // Loop through slots from top to bottom to enforce sticky parents
    for (let slot = 0; slot < viewportSlots; slot++) {
      const currentItem = slots[slot];
      
      // If slot is empty (end of list), we stop processing sticky headers 
      // because there is no content to require a header
      if (!currentItem) {
        break;
      }

      // Check if this item is already a sticky header (unlikely in natural list, but for safety)
      if (stickyIds.has(currentItem.id)) {
        continue; 
      }

      const flatItem = this.flatItemsById.get(currentItem.id);
      if (!flatItem) continue;

      const parents = flatItem.parents;
      
      // Check if all parents are visible
      // A parent is "visible" if it is in the sticky set OR present in a slot above current slot?
      // Actually the algorithm says: "check if all they are visible"
      // "Visible" here means "present in the slots above" (including previous sticky replacements)
      
      let highestNotVisibleParentId: string | null = null;
      
      for (const parentId of parents) {
        // Check if parent is visible in slots 0 to slot-1
        let isVisible = false;
        
        // Check sticky set (since sticky items are always at the top slots)
        if (stickyIds.has(parentId)) {
          isVisible = true;
        } else {
          // Check natural items in slots ABOVE current slot (should not happen if sticky logic works top-down)
          // Actually, if a parent is naturally at slot 0, and we are at slot 1, it is visible.
          // But if we are at slot 0, and parent is naturally at -1 (scrolled out), it is NOT visible.
          
          // We only need to check the current `slots` array because it represents the rendered view.
          for (let s = 0; s < slot; s++) {
            if (slots[s]?.id === parentId) {
              isVisible = true;
              break;
            }
          }
        }
        
        if (!isVisible) {
          highestNotVisibleParentId = parentId;
          break; // Found the highest (first in list) not visible parent
        }
      }

      if (highestNotVisibleParentId) {
        // Replace current item with this parent
        const parentFlatItem = this.flatItemsById.get(highestNotVisibleParentId);
        if (parentFlatItem) {
          slots[slot] = {
            id: parentFlatItem.id,
            offset: slot,
            // Use the index of the parent in the flat list? 
            // Or maybe undefined since it's "virtual" at this position?
            // If we provide the real index, diffSnapshots can interpolate correctly?
            // Yes, let's look up its real index
            index: this.flatItems.indexOf(parentFlatItem), 
            version: this.itemVersions.get(parentFlatItem.id)
          };
          stickyIds.add(highestNotVisibleParentId);
          
          // Important: We replaced the item, but we should NOT re-evaluate this slot
          // The algorithm says "it become a member of sticky set, then repeat the loop"
          // If we repeat the loop for the SAME slot, we might replace the parent with ITS parent?
          // Yes! If `src` is replaced by `root` (if root exists).
          // But since we iterate parents from root down, `highestNotVisibleParentId` will be the root-most missing one.
          // So if `src` is missing, `root` must be visible or missing.
          // If `root` missing, `highest` is `root`. We replace with `root`.
          // Next iteration (same slot or next?):
          // If we replace with `root`. `root` is now visible.
          // Does `root` have parents? No.
          // So loop for this slot finishes.
          // But wait, the algorithm says "take the topmost not-sticky element".
          // If slot 0 is now sticky (`root`).
          // The topmost not-sticky is now slot 1.
          // So we simply continue to the next slot loop iteration!
        }
      }
    }

    // Filter out nulls
    return slots.filter((item): item is PositionedItem => item !== null);
  }

  getItemData(id: string): TData {
    // If we have access to metadata like depth, we might want to return extended data?
    // But VisibilityStrategy returns TData.
    // We can attach depth to TData in constructor?
    // Or users can look up depth via their own means?
    // Let's modify TData in place during flattening to include depth? 
    // Or assume TData is extensible.
    
    // Better: return the data stored in flatItems.
    // We can inject `depth` into the returned object if TData allows.
    // The demo needs depth for indentation.
    const flatItem = this.flatItemsById.get(id);
    if (!flatItem) {
      throw new Error(`Item with id "${id}" not found`);
    }
    
    // Return a copy or modified object with depth info
    return {
      ...flatItem.data,
      depth: flatItem.depth,
      hasChildren: flatItem.data.children && flatItem.data.children.length > 0
    } as unknown as TData;
  }

  getTotalPositions(): number {
    return this.flatItems.length;
  }

  getInitialPosition(): number {
    return 0;
  }
}
