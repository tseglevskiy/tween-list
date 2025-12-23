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

  getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[] {
    if (this.flatItems.length === 0) {
      return [];
    }

    // 1. Generate natural slots
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

    // 2. Group into sections by root ID (and handle wrapping)
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let lastFlatIndex = -1;

    for (const item of naturalSlots) {
      const originalId = this.getOriginalId(item.id);
      const flatItem = this.flatItemsById.get(originalId);
      
      // If item not found (shouldn't happen), skip
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

    // 3. Process sections
    let theirSubstituteList: PositionedItem[] = [];
    
    // We will build the final result by modifying the slots directly or maintaining a map
    // Actually, we can just replace items in `naturalSlots` directly since we know their offsets.
    // Let's create a map of offset -> PositionedItem to easily overwrite.
    const finalSlots = new Map<number, PositionedItem>();
    naturalSlots.forEach(item => finalSlots.set(item.offset, item));

    for (const section of sections) {
      // If we ran out of natural items in this section (e.g. all covered), 
      // we might skip processing, but let's stick to the algorithm.

      // "effective sticky list" = theirSubstituteList + sectionSubstituteList
      let sectionSubstituteList: PositionedItem[] = [];

      let restartSection = true;
      let sectionFullyCovered = false;

      while (restartSection) {
        restartSection = false;
        
        // Construct effective list for this iteration
        const effectiveList = [...theirSubstituteList, ...sectionSubstituteList];
        const effectiveCount = effectiveList.length;

        // Iterate section items from bottom to top
        // "if the iteration over the section is done, we can finish the whole process"
        // If we find an uncovered item that needs a sticky parent, we restart.
        // If we finish loop without restarts, we are done.

        let sectionHasUncoveredItems = false;
        let allUncoveredSatisfied = true;

        for (let i = section.items.length - 1; i >= 0; i--) {
          const item = section.items[i];
          
          // Check if covered: offset < effectiveCount
          if (item.offset < effectiveCount) {
            continue; // Skip covered items
          }

          sectionHasUncoveredItems = true;
          const uncoveredItem = item;

          // Process this uncovered item
          const originalId = this.getOriginalId(uncoveredItem.id);
          const flatItem = this.flatItemsById.get(originalId);
          
          if (!flatItem) continue;

          // Iterate parents from Highest (Root) to Lowest
          let parentMissing = false;

          for (const parentId of flatItem.parents) {
              // Check if visible (in effective list OR in uncovered natural slots)
              
              // 1. Check if in effective sticky list
              const inSticky = effectiveList.some(s => this.getOriginalId(s.id) === parentId);
              if (inSticky) continue;

              // 2. Check if naturally visible AND uncovered
              // Must match the exact expected instance (by calculating expected absolute index)
              const childFlatIndex = this.flatItems.indexOf(flatItem);
              const parentFlatItem = this.flatItemsById.get(parentId);
              
              if (!parentFlatItem || uncoveredItem.index === undefined) continue;

              const parentFlatIndex = this.flatItems.indexOf(parentFlatItem);
              const distance = childFlatIndex - parentFlatIndex;
              const parentAbsoluteIndex = uncoveredItem.index - distance;
              const expectedParentUniqueId = `${parentId}__${parentAbsoluteIndex}`;

              const naturalParent = section.items.find(si => 
                  si.id === expectedParentUniqueId && 
                  si.offset >= effectiveCount
              );

              if (naturalParent) continue;

              // If we get here, parent is NOT visible.
              parentMissing = true;

              // "1 - remove lowest hierarchy element from 'their' list (if exists)"
              if (theirSubstituteList.length > 0) {
                  theirSubstituteList.pop();
              }

              // "2 - add required parent to the 'section' substitute list"
              // We reuse the variables declared above
              // const childFlatIndex = this.flatItems.indexOf(flatItem);
              // const parentFlatItem = this.flatItemsById.get(parentId);
              
              if (parentFlatItem && uncoveredItem.index !== undefined) {
                  // Reuse parentFlatIndex/distance from above? 
                  // Yes, they are the same logic.
                  // const parentFlatIndex = this.flatItems.indexOf(parentFlatItem);
                  // const distance = childFlatIndex - parentFlatIndex;
                  // const parentAbsoluteIndex = uncoveredItem.index - distance;
                  
                  // Re-use parentAbsoluteIndex calculated above
                  const parentUniqueId = `${parentId}__${parentAbsoluteIndex}`;
                  
                  sectionSubstituteList.push({
                      id: parentUniqueId,
                      offset: 0, // Placeholder
                      index: parentAbsoluteIndex,
                      version: this.itemVersions.get(parentId)
                  });
              }

              // "Restart iteration from the beginning"
              restartSection = true;
              break; // Break parent loop
          }

          if (parentMissing) {
              allUncoveredSatisfied = false;
              break; // Break item loop to restart section
          }
        }

        if (restartSection) {
            continue; // Check next iteration of while loop
        }

        if (!sectionHasUncoveredItems) {
            // "if the section is covered completely ... go to iterate the next section"
            sectionFullyCovered = true;
            break; // Move to next section
        }

        if (allUncoveredSatisfied) {
            // "if you successfully iterated through all naturally visible elements of the section, stop the process"
            // Apply current sticky lists to finalSlots
            const finalStickyList = [...theirSubstituteList, ...sectionSubstituteList];
            finalStickyList.forEach((stickyItem, index) => {
                stickyItem.offset = index;
                finalSlots.set(index, stickyItem);
            });
            
            return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
        }
      } // End while(restartSection)

      // If we exit while loop with sectionFullyCovered = true
      // Update `theirSubstituteList` for next section
      theirSubstituteList = [...theirSubstituteList, ...sectionSubstituteList];
    }

    // If we finished all sections (should have stopped early usually), return what we have
    const finalStickyList = theirSubstituteList; // sectionList is empty for last iteration
    finalStickyList.forEach((stickyItem, index) => {
        stickyItem.offset = index;
        finalSlots.set(index, stickyItem);
    });

    return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
  }

  private getOriginalId(uniqueId: string): string {
    const separatorIndex = uniqueId.lastIndexOf('__');
    return separatorIndex !== -1 ? uniqueId.substring(0, separatorIndex) : uniqueId;
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
