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

interface Section {
  rootId: string;
  items: PositionedItem[];
}

/**
 * InfiniteHierarchyStrategy - Combines hierarchical sticky headers with infinite scrolling
 * 
 * Limitations:
 * - It doesn't cover the case where the list is too short and a section can appear on the bottom while some children are still on the top.
 * - It doesn't cover the case where hierarchy has not enough place in the window for being displayed for a specific child.
 */
export class InfiniteHierarchyStrategy<TData extends TreeNode = TreeNode> implements VisibilityStrategy<TData> {
  private flatItems: FlatItem<TData>[];
  private itemsById: Map<string, TData>;
  private flatItemsById: Map<string, FlatItem<TData>>;
  private itemVersions: Map<string, number>;
  private totalPositions: number;

  constructor(
    items: TData[], 
    options?: {
      totalPositions?: number;
    }
  ) {
    this.itemsById = new Map();
    this.flatItemsById = new Map();
    this.itemVersions = new Map();
    this.flatItems = this.flattenItems(items);
    this.totalPositions = options?.totalPositions ?? 100_000;
  }

  /**
   * Main entry point for calculating visible items.
   * The pipeline consists of three steps:
   * 1. Generate "Natural Slots": Items that would be visible based purely on scroll position.
   * 2. Group into Sections: Organize items by their root ancestor to handle infinite wrapping (transitions between end and start of list).
   * 3. Resolve Sticky Headers: Ensure all visible items have their parents visible, stacking them at the top if necessary.
   */
  getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[] {
    if (this.flatItems.length === 0) {
      return [];
    }

    const naturalSlots = this.generateNaturalSlots(position, viewportSlots);
    const sections = this.groupItemsIntoSections(naturalSlots);
    return this.resolveStickyHeaders(naturalSlots, sections);
  }

  /**
   * Step 1: Generate items based on the raw scroll position.
   * Handles the modulo arithmetic to create the illusion of an infinite list.
   */
  private generateNaturalSlots(position: number, viewportSlots: number): PositionedItem[] {
    const naturalSlots: PositionedItem[] = [];
    for (let slot = 0; slot < viewportSlots; slot++) {
      const absoluteIndex = position + slot;
      
      // Modulo arithmetic for infinite loop
      let itemIndex = absoluteIndex % this.flatItems.length;
      if (itemIndex < 0) {
        itemIndex += this.flatItems.length;
      }

      const flatItem = this.flatItems[itemIndex];
      const originalId = flatItem.id;
      const version = this.itemVersions.get(originalId);
      const uniqueId = `${originalId}__${absoluteIndex}`;

      naturalSlots.push({
        id: uniqueId,
        offset: slot,
        index: absoluteIndex,
        version,
      });
    }
    return naturalSlots;
  }

  /**
   * Step 2: Group natural items into sections based on their Root ID.
   * This is critical for infinite scrolling because the view might straddle the end of the list and the beginning of the next loop.
   * Each group represents a coherent hierarchical tree (or part of one).
   */
  private groupItemsIntoSections(naturalSlots: PositionedItem[]): Section[] {
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let lastFlatIndex = -1;

    for (const item of naturalSlots) {
      const originalId = this.getOriginalId(item.id);
      const flatItem = this.flatItemsById.get(originalId);
      
      if (!flatItem) continue;

      const flatIndex = this.flatItems.indexOf(flatItem);

      // Determine root ID: either the first parent, or the item itself if it has no parents
      const rootId = flatItem.parents.length > 0 ? flatItem.parents[0] : flatItem.id;

      // Detect wrap: if index drops, we wrapped around the infinite list
      const isWrap = lastFlatIndex !== -1 && flatIndex < lastFlatIndex;
      const isNewRoot = !currentSection || currentSection.rootId !== rootId;

      if (isNewRoot || isWrap) {
        currentSection = {
          rootId,
          items: []
        };
        sections.push(currentSection);
      }
      currentSection!.items.push(item);
      lastFlatIndex = flatIndex;
    }
    return sections;
  }

  /**
   * Step 3: Iterate through sections to enforce hierarchical consistency.
   * 
   * The core algorithm ensures that for every visible item, its parent chain is also visible.
   * If a parent is not naturally visible (scrolled out), it is added as a "Sticky Header".
   * 
   * This process is iterative because adding a sticky header covers the topmost slot,
   * potentially hiding an item. Hiding an item might remove the need for *its* parent,
   * or creating a sticky header might reveal a new context.
   * 
   * The "previousStickyStack" carries over sticky headers from previous sections (e.g., when transitioning loops).
   */
  private resolveStickyHeaders(naturalSlots: PositionedItem[], sections: Section[]): PositionedItem[] {
    const finalSlots = new Map<number, PositionedItem>();
    naturalSlots.forEach(item => finalSlots.set(item.offset, item));

    let previousStickyStack: PositionedItem[] = [];

    for (const section of sections) {
      let currentSectionStickyStack: PositionedItem[] = [];
      let restartSection = true;

      // We loop until the sticky stack stabilizes for this section
      while (restartSection) {
        restartSection = false;
        
        // The effective stack is the combination of headers from previous sections
        // and any new headers we've determined we need for the current section.
        const effectiveList = [...previousStickyStack, ...currentSectionStickyStack];
        const effectiveCount = effectiveList.length;

        // Iterate section items from bottom to top.
        // We check if an item is uncovered (not hidden by sticky headers).
        // If it is uncovered, we verify its parent chain.
        let sectionHasUncoveredItems = false;
        let allUncoveredSatisfied = true;

        for (let i = section.items.length - 1; i >= 0; i--) {
          const item = section.items[i];
          
          if (item.offset < effectiveCount) {
            continue; // Skip covered items
          }

          sectionHasUncoveredItems = true;
          const uncoveredItem = item;

          // Check if parent is missing
          const missingParentInfo = this.findMissingParent(uncoveredItem, effectiveList, section.items, effectiveCount);

          if (missingParentInfo) {
             // Parent is missing! We need to make it sticky.

             // 1. Conflict Resolution: If we need space, we might pop from the 'previous' list.
             // This handles the transition logic where deep headers from the previous section
             // give way to headers required by the new section.
             if (previousStickyStack.length > 0) {
                 previousStickyStack.pop();
             }

             // 2. Add required parent to current stack
             currentSectionStickyStack.push(missingParentInfo);

             // 3. Restart: The stack changed, so visibility changed. 
             // We must re-evaluate all items against the new stack.
             restartSection = true;
             allUncoveredSatisfied = false;
             break; // Break item loop
          }
        }

        if (restartSection) {
            continue;
        }

        if (!sectionHasUncoveredItems) {
            // If the sticky stack covers all items in this section, we move to the next section.
            // The stack is propagated.
            break; 
        }

        if (allUncoveredSatisfied) {
            // Found a stable state where all visible items have their parents visible.
            // We apply the result and return immediately.
            const finalStickyList = [...previousStickyStack, ...currentSectionStickyStack];
            this.applyStickyItemsToSlots(finalSlots, finalStickyList);
            return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
        }
      }

      // Propagate the stack to the next section
      previousStickyStack = [...previousStickyStack, ...currentSectionStickyStack];
    }

    // Fallback if we exhaust all sections
    this.applyStickyItemsToSlots(finalSlots, previousStickyStack);
    return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
  }

  /**
   * Helper to check if a specific item's parent is visible.
   * Returns the constructed sticky item if the parent is missing, or null if satisfied.
   */
  private findMissingParent(
      item: PositionedItem, 
      effectiveList: PositionedItem[], 
      sectionItems: PositionedItem[], 
      effectiveCount: number
  ): PositionedItem | null {
      const originalId = this.getOriginalId(item.id);
      const flatItem = this.flatItemsById.get(originalId);
      
      if (!flatItem) return null;

      // Check parents from top (root) down to immediate parent
      for (const parentId of flatItem.parents) {
          // 1. Check if parent is already sticky
          const inSticky = effectiveList.some(s => this.getOriginalId(s.id) === parentId);
          if (inSticky) continue;

          // 2. Check if parent is naturally visible in the viewport (and not covered)
          // We calculate the exact unique ID the parent *should* have given the child's position.
          const parentUniqueId = this.calculateParentUniqueId(flatItem, parentId, item.index);
          
          if (!parentUniqueId) continue; 

          const naturalParent = sectionItems.find(si => 
              si.id === parentUniqueId && 
              si.offset >= effectiveCount
          );

          if (naturalParent) continue;

          // Parent is missing! Construct it.
          return {
              id: parentUniqueId,
              offset: 0, // Placeholder, offset is assigned based on stack position later
              index: this.getAbsoluteIndexFromUniqueId(parentUniqueId),
              version: this.itemVersions.get(parentId)
          };
      }

      return null;
  }

  private calculateParentUniqueId(childFlatItem: FlatItem<TData>, parentId: string, childAbsoluteIndex?: number): string | null {
      if (childAbsoluteIndex === undefined) return null;

      const parentFlatItem = this.flatItemsById.get(parentId);
      if (!parentFlatItem) return null;

      const childFlatIndex = this.flatItems.indexOf(childFlatItem);
      const parentFlatIndex = this.flatItems.indexOf(parentFlatItem);
      const distance = childFlatIndex - parentFlatIndex;
      
      const parentAbsoluteIndex = childAbsoluteIndex - distance;
      return `${parentId}__${parentAbsoluteIndex}`;
  }

  private applyStickyItemsToSlots(slots: Map<number, PositionedItem>, stickyList: PositionedItem[]) {
      stickyList.forEach((stickyItem, index) => {
          stickyItem.offset = index;
          slots.set(index, stickyItem);
      });
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
      
      // Initialize version if not present
      if (!this.itemVersions.has(item.id)) {
        this.itemVersions.set(item.id, 0);
      }
      
      if (item.children && item.children.length > 0) {
        const childParents = [...parents, item.id];
        const children = this.flattenItems(item.children as unknown as TData[], depth + 1, childParents);
        result = result.concat(children);
      }
    }
    
    return result;
  }

  /* Utility Methods */

  private getOriginalId(uniqueId: string): string {
    const separatorIndex = uniqueId.lastIndexOf('__');
    return separatorIndex !== -1 ? uniqueId.substring(0, separatorIndex) : uniqueId;
  }

  private getAbsoluteIndexFromUniqueId(uniqueId: string): number {
      const parts = uniqueId.split('__');
      return parseInt(parts[parts.length - 1], 10);
  }

  getItemData(id: string): TData {
    const originalId = this.getOriginalId(id);

    const flatItem = this.flatItemsById.get(originalId);
    if (!flatItem) {
      throw new Error(`Item with id "${originalId}" (derived from "${id}") not found`);
    }
    
    const parentId = flatItem.parents.length > 0 ? flatItem.parents[flatItem.parents.length - 1] : undefined;
    return {
      ...flatItem.data,
      depth: flatItem.depth,
      hasChildren: flatItem.data.children && flatItem.data.children.length > 0,
      parentId
    } as unknown as TData;
  }

  getTotalPositions(): number {
    return this.totalPositions;
  }

  getInitialPosition(): number {
    return Math.floor(this.totalPositions / 2);
  }
}
