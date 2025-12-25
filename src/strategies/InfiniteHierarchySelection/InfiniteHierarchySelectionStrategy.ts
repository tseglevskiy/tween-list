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
 * InfiniteHierarchySelectionStrategy - Combines hierarchical sticky headers with infinite scrolling
 * and selection-based stickiness.
 * 
 * Algorithm:
 * 1. Identify selected items not naturally visible and add them to the sticky list.
 * 2. Process hierarchical sections. If a parent is missing, add it to the sticky list.
 *    - Never remove selected items from the sticky list to make room for parents; instead, grow the list.
 * 3. Dynamically capture selected items that become covered by the growing sticky list.
 * 
 * Limitations:
 * - It doesn't cover the case where the list is too short and a section can appear on the bottom while some children are still on the top.
 * - It doesn't cover the case where hierarchy has not enough place in the window for being displayed for a specific child.
 * - It doesn't support the case where all selected items do not fit into the window.
 */
export class InfiniteHierarchySelectionStrategy<TData extends TreeNode = TreeNode> implements VisibilityStrategy<TData> {
  private flatItems: FlatItem<TData>[];
  private itemsById: Map<string, TData>;
  private flatItemsById: Map<string, FlatItem<TData>>;
  private itemVersions: Map<string, number>;
  private totalPositions: number;
  
  private selectedIds: Set<string>;
  private onSelectionChangeCallback?: (selectedIds: Set<string>) => void;

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
    this.selectedIds = new Set();
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

  // Selection API
  toggleSelection(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.notifySelectionChange();
  }

  select(id: string) {
    this.selectedIds.add(id);
    this.notifySelectionChange();
  }

  deselect(id: string) {
    this.selectedIds.delete(id);
    this.notifySelectionChange();
  }

  getSelectedIds(): Set<string> {
    return new Set(this.selectedIds);
  }

  setOnSelectionChange(callback: (selectedIds: Set<string>) => void) {
    this.onSelectionChangeCallback = callback;
  }

  private notifySelectionChange() {
    if (this.onSelectionChangeCallback) {
      this.onSelectionChangeCallback(new Set(this.selectedIds));
    }
  }
  
  private getClosestInstanceAbove(flatItem: FlatItem<TData>, position: number): number {
    const totalItems = this.flatItems.length;
    const itemIndex = this.flatItems.indexOf(flatItem);
    
    const loopStart = Math.floor(position / totalItems) * totalItems;
    let candidate = loopStart + itemIndex;
    
    // In infinite loop, we want the instance that is "logically" just above or at the position.
    // If candidate > position, we might want the previous loop's instance.
    if (candidate > position) { // Changed >= to > to allow item at current position
      candidate -= totalItems;
    }
    
    return candidate;
  }

  getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[] {
    if (this.flatItems.length === 0) {
      return [];
    }

    // 1. Generate natural slots
    const naturalSlots: PositionedItem[] = [];
    for (let slot = 0; slot < viewportSlots; slot++) {
      const absoluteIndex = position + slot;
      
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

    // 2. Group into sections by root ID
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let lastFlatIndex = -1;

    for (const item of naturalSlots) {
      const originalId = this.getOriginalId(item.id);
      const flatItem = this.flatItemsById.get(originalId);
      
      if (!flatItem) continue;

      const flatIndex = this.flatItems.indexOf(flatItem);
      const rootId = flatItem.parents.length > 0 ? flatItem.parents[0] : flatItem.id;

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

    // 3. Process sections with Selection Logic
    
    // Step 1: Initialize sticky list with selected items NOT in natural list
    // We sort them by index to maintain some order, though strict order might depend on application needs.
    // Using flatIndex order (appearance in tree) is a safe default.
    let theirSubstituteList: PositionedItem[] = [];
    
    // Collect all selected items not visible
    const naturalIds = new Set(naturalSlots.map(item => this.getOriginalId(item.id)));
    
    // Helper to create PositionedItem for selected item
    const createStickySelected = (originalId: string): PositionedItem => {
        const flatItem = this.flatItemsById.get(originalId)!;
        const absoluteIndex = this.getClosestInstanceAbove(flatItem, position);
        const uniqueId = `${originalId}__${absoluteIndex}`;
        return {
            id: uniqueId,
            offset: 0, // Placeholder
            index: absoluteIndex,
            version: this.itemVersions.get(originalId)
        };
    };

    const initialSticky: PositionedItem[] = [];
    this.selectedIds.forEach(id => {
        if (!naturalIds.has(id)) {
            initialSticky.push(createStickySelected(id));
        }
    });

    // Sort by flat index to respect hierarchy order in sticky list?
    // Or by absolute index?
    // If we have items from different loops, absolute index is better.
    initialSticky.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    
    theirSubstituteList = initialSticky;


    const finalSlots = new Map<number, PositionedItem>();
    naturalSlots.forEach(item => finalSlots.set(item.offset, item));

    for (const section of sections) {
      let sectionSubstituteList: PositionedItem[] = [];
      let restartSection = true;
      let sectionFullyCovered = false;

      while (restartSection) {
        restartSection = false;
        
        const effectiveList = [...theirSubstituteList, ...sectionSubstituteList];
        const effectiveCount = effectiveList.length;

        // Step 2.1: Check if any natural element covered by the sticky stack is selected
        let foundSelectedCovered = false;
        
        // We check all slots that are "covered" by the current effective list.
        // Also we must check the slot *immediately following* the list if it contains a selected item,
        // because if we don't pick it up now, it might be pushed out by a parent addition in Step 2.2?
        // Actually, Step 2.2 checks for parents of *visible* items.
        // If a visible selected item is at `effectiveCount` (not covered), it's visible.
        // But if we add a parent, it becomes covered.
        // So checking `effectiveCount` (the one about to be covered) is also wise?
        // Or simply: the previous logic checked `naturalSlots[effectiveCount]`.
        // The new logic checks `naturalSlots[0...effectiveCount-1]`.
        // Let's do both. Check up to `effectiveCount`.
        // If `naturalSlots[effectiveCount]` is selected, we might as well make it sticky to ensure stability.
        
        for (let i = 0; i <= effectiveCount; i++) {
            if (i >= naturalSlots.length) break;
            
            const naturalItem = naturalSlots[i];
            const originalId = this.getOriginalId(naturalItem.id);
            
            // If checking the item AT effectiveCount, it is technically visible.
            // But checking it handles the "about to be covered" case or "ensure selected are sticky" case.
            // However, simply making ALL visible selected items sticky is not the goal (only those covered).
            // But if we stick to "covered only" (i < effectiveCount), we fix the bug.
            
            // Re-evaluating: The bug was item-0-0-0 at slot 0 was covered by item-X at slot 0.
            // So checking i < effectiveCount is MANDATORY.
            
            if (i < effectiveCount) {
                const alreadySticky = effectiveList.some(s => this.getOriginalId(s.id) === originalId);
                if (alreadySticky) continue;

                if (this.selectedIds.has(originalId)) {
                    const stickyVersion: PositionedItem = {
                        ...naturalItem,
                        offset: 0
                    };
                    sectionSubstituteList.push(stickyVersion);
                    foundSelectedCovered = true;
                    break; 
                }
            } else if (i === effectiveCount) {
                // This corresponds to my old logic: check the topmost VISIBLE item.
                // If it is selected, we might want to sticky it?
                // The old logic did this. Let's keep it to be safe/consistent.
                if (this.selectedIds.has(originalId)) {
                    // But wait, if it's visible, why sticky?
                    // "3. Dynamically capture selected items that become covered..."
                    // If it is NOT covered, we don't strictly need to sticky it.
                    // But if we add a parent in Step 2.2, it WILL be covered.
                    // So we can wait for Step 2.2?
                    // If Step 2.2 adds a parent, `restartSection` becomes true.
                    // Then `effectiveCount` increases.
                    // Then next iteration, `i` (which was equal to old effectiveCount) will be < new effectiveCount.
                    // So it will be caught then!
                    
                    // So strictly speaking, we ONLY need to check i < effectiveCount.
                    // The "check effectiveCount" logic was a premature optimization or simplification in my previous attempt.
                    // REMOVE i === effectiveCount check.
                }
            }
        }
        
        if (foundSelectedCovered) {
             restartSection = true;
             continue;
        }

        let sectionHasUncoveredItems = false;
        let allUncoveredSatisfied = true;

        for (let i = section.items.length - 1; i >= 0; i--) {
          const item = section.items[i];
          
          if (item.offset < effectiveCount) {
            continue; 
          }

          sectionHasUncoveredItems = true;
          const uncoveredItem = item;

          const originalId = this.getOriginalId(uncoveredItem.id);
          const flatItem = this.flatItemsById.get(originalId);
          
          if (!flatItem) continue;

          let parentMissing = false;

          for (const parentId of flatItem.parents) {
              const inSticky = effectiveList.some(s => this.getOriginalId(s.id) === parentId);
              if (inSticky) continue;

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

              parentMissing = true;

              // Step 2 (Modified): Protected Sticky Stack
              // "1 - remove lowest hierarchy element from 'their' list (if exists)"
              // Modification: "never remove selected items"
              
              if (theirSubstituteList.length > 0) {
                  const candidateToRemove = theirSubstituteList[theirSubstituteList.length - 1];
                  const candidateId = this.getOriginalId(candidateToRemove.id);
                  
                  if (!this.selectedIds.has(candidateId)) {
                      theirSubstituteList.pop();
                  } else {
                      // Selected item! Do NOT remove.
                      // Stack grows.
                  }
              }

              // "2 - add required parent"
              const parentUniqueId = `${parentId}__${parentAbsoluteIndex}`;
              
              sectionSubstituteList.push({
                  id: parentUniqueId,
                  offset: 0,
                  index: parentAbsoluteIndex,
                  version: this.itemVersions.get(parentId)
              });

              restartSection = true;
              break; 
          }

          if (parentMissing) {
              allUncoveredSatisfied = false;
              break;
          }
        }

        if (restartSection) {
            continue; 
        }

        if (!sectionHasUncoveredItems) {
            sectionFullyCovered = true;
            break; 
        }

        if (allUncoveredSatisfied) {
            const finalStickyList = [...theirSubstituteList, ...sectionSubstituteList];
            // Sort sticky list by absolute index to maintain natural visual order
            finalStickyList.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
            
            finalStickyList.forEach((stickyItem, index) => {
                stickyItem.offset = index;
                finalSlots.set(index, stickyItem);
            });
            
            return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
        }
      } 

      theirSubstituteList = [...theirSubstituteList, ...sectionSubstituteList];
    }

    const finalStickyList = theirSubstituteList;
    // Sort sticky list by absolute index to maintain natural visual order
    finalStickyList.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

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
      parentId,
      isSelected: this.selectedIds.has(originalId)
    } as unknown as TData;
  }

  getTotalPositions(): number {
    return this.totalPositions;
  }

  getInitialPosition(): number {
    return Math.floor(this.totalPositions / 2);
  }
}
