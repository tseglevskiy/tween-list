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

  /**
   * Main entry point for calculating visible items.
   * Extends the base algorithm to include selected items as sticky headers.
   */
  getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[] {
    if (this.flatItems.length === 0) {
      return [];
    }

    const naturalSlots = this.generateNaturalSlots(position, viewportSlots);
    const sections = this.groupItemsIntoSections(naturalSlots);
    return this.resolveStickyHeaders(position, naturalSlots, sections);
  }

  /* Core Pipeline Steps */

  private generateNaturalSlots(position: number, viewportSlots: number): PositionedItem[] {
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
    return naturalSlots;
  }

  private groupItemsIntoSections(naturalSlots: PositionedItem[]): Section[] {
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
    return sections;
  }

  /**
   * Core algorithm for determining sticky headers.
   * Differs from base strategy by prioritizing selected items.
   * 
   * Priority Logic:
   * 1. Selected items (always sticky if not visible).
   * 2. Hierarchical parents (sticky if needed by visible child).
   * 
   * When conflicts arise (need space):
   * - Selected items are NEVER removed from the sticky stack.
   * - Hierarchical parents from previous sections CAN be removed (popped).
   */
  private resolveStickyHeaders(position: number, naturalSlots: PositionedItem[], sections: Section[]): PositionedItem[] {
    const finalSlots = new Map<number, PositionedItem>();
    naturalSlots.forEach(item => finalSlots.set(item.offset, item));

    // Step 1: Initialize sticky list with selected items NOT in natural list
    // This ensures selected items are always accessible
    let previousStickyStack = this.getInitialSelectedStickyStack(position, naturalSlots);

    for (const section of sections) {
      let currentSectionStickyStack: PositionedItem[] = [];
      let restartSection = true;

      while (restartSection) {
        restartSection = false;
        
        const effectiveList = [...previousStickyStack, ...currentSectionStickyStack];
        const effectiveCount = effectiveList.length;

        // Step 2: Check if any natural element covered by the sticky stack is selected.
        // If a selected item is about to be covered by a sticky header, 
        // we must make IT sticky as well so it remains visible (promoted to header).
        if (this.checkForCoveredSelection(naturalSlots, effectiveList, effectiveCount)) {
            const itemToSticky = this.findCoveredSelected(naturalSlots, effectiveList, effectiveCount);
            if (itemToSticky) {
                currentSectionStickyStack.push(itemToSticky);
                restartSection = true;
                continue;
            }
        }

        // Step 3: Iterate section items to find missing hierarchical parents
        let sectionHasUncoveredItems = false;
        let allUncoveredSatisfied = true;

        for (let i = section.items.length - 1; i >= 0; i--) {
          const item = section.items[i];
          
          if (item.offset < effectiveCount) {
            continue; 
          }

          sectionHasUncoveredItems = true;
          const uncoveredItem = item;

          const missingParentInfo = this.findMissingParent(uncoveredItem, effectiveList, section.items, effectiveCount);

          if (missingParentInfo) {
              // Parent is missing. We need to add it.
              
              // Conflict Resolution:
              // We try to remove the lowest element from the 'previous' list to make room,
              // BUT ONLY IF it is NOT a selected item.
              if (previousStickyStack.length > 0) {
                  const candidateToRemove = previousStickyStack[previousStickyStack.length - 1];
                  const candidateId = this.getOriginalId(candidateToRemove.id);
                  
                  if (!this.selectedIds.has(candidateId)) {
                      previousStickyStack.pop();
                  } else {
                      // Selected item! Do NOT remove.
                      // The stack will grow, covering more natural items.
                  }
              }

              // Add required parent
              currentSectionStickyStack.push(missingParentInfo);

              restartSection = true;
              allUncoveredSatisfied = false;
              break; 
          }
        }

        if (restartSection) {
            continue; 
        }

        if (!sectionHasUncoveredItems) {
            break; 
        }

        if (allUncoveredSatisfied) {
            const finalStickyList = [...previousStickyStack, ...currentSectionStickyStack];
            this.applyStickyItemsToSlots(finalSlots, finalStickyList);
            return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
        }
      } 

      previousStickyStack = [...previousStickyStack, ...currentSectionStickyStack];
    }

    const finalStickyList = previousStickyStack;
    this.applyStickyItemsToSlots(finalSlots, finalStickyList);
    return Array.from(finalSlots.values()).sort((a, b) => a.offset - b.offset);
  }

  /* Helpers for Sticky Logic */

  private getInitialSelectedStickyStack(position: number, naturalSlots: PositionedItem[]): PositionedItem[] {
    const naturalIds = new Set(naturalSlots.map(item => this.getOriginalId(item.id)));
    const initialSticky: PositionedItem[] = [];
    
    this.selectedIds.forEach(id => {
        if (!naturalIds.has(id)) {
             const flatItem = this.flatItemsById.get(id);
             if (flatItem) {
                const absoluteIndex = this.getClosestInstanceAbove(flatItem, position);
                const uniqueId = `${id}__${absoluteIndex}`;
                initialSticky.push({
                    id: uniqueId,
                    offset: 0, 
                    index: absoluteIndex,
                    version: this.itemVersions.get(id)
                });
             }
        }
    });

    initialSticky.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return initialSticky;
  }

  private checkForCoveredSelection(naturalSlots: PositionedItem[], effectiveList: PositionedItem[], effectiveCount: number): boolean {
       return !!this.findCoveredSelected(naturalSlots, effectiveList, effectiveCount);
  }

  private findCoveredSelected(naturalSlots: PositionedItem[], effectiveList: PositionedItem[], effectiveCount: number): PositionedItem | null {
        for (let i = 0; i < effectiveCount; i++) {
            if (i >= naturalSlots.length) break;
            
            const naturalItem = naturalSlots[i];
            const originalId = this.getOriginalId(naturalItem.id);
            
            const alreadySticky = effectiveList.some(s => this.getOriginalId(s.id) === originalId);
            if (alreadySticky) continue;

            if (this.selectedIds.has(originalId)) {
                return {
                    ...naturalItem,
                    offset: 0
                };
            }
        }
        return null;
  }

  private findMissingParent(
      item: PositionedItem, 
      effectiveList: PositionedItem[], 
      sectionItems: PositionedItem[], 
      effectiveCount: number
  ): PositionedItem | null {
      const originalId = this.getOriginalId(item.id);
      const flatItem = this.flatItemsById.get(originalId);
      
      if (!flatItem) return null;

      for (const parentId of flatItem.parents) {
          const inSticky = effectiveList.some(s => this.getOriginalId(s.id) === parentId);
          if (inSticky) continue;

          const parentUniqueId = this.calculateParentUniqueId(flatItem, parentId, item.index);
          if (!parentUniqueId) continue; 

          const naturalParent = sectionItems.find(si => 
              si.id === parentUniqueId && 
              si.offset >= effectiveCount
          );

          if (naturalParent) continue;

          return {
              id: parentUniqueId,
              offset: 0,
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

  private getAbsoluteIndexFromUniqueId(uniqueId: string): number {
      const parts = uniqueId.split('__');
      return parseInt(parts[parts.length - 1], 10);
  }

  private applyStickyItemsToSlots(slots: Map<number, PositionedItem>, stickyList: PositionedItem[]) {
      stickyList.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

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

  private getClosestInstanceAbove(flatItem: FlatItem<TData>, position: number): number {
    const totalItems = this.flatItems.length;
    const itemIndex = this.flatItems.indexOf(flatItem);
    
    const loopStart = Math.floor(position / totalItems) * totalItems;
    let candidate = loopStart + itemIndex;
    
    if (candidate > position) { 
      candidate -= totalItems;
    }
    
    return candidate;
  }

  private getOriginalId(uniqueId: string): string {
    const separatorIndex = uniqueId.lastIndexOf('__');
    return separatorIndex !== -1 ? uniqueId.substring(0, separatorIndex) : uniqueId;
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
