import * as react from 'react';

/**
 * Represents an item positioned at a specific slot offset
 */
interface PositionedItem {
    /** Unique identifier for the item */
    id: string;
    /** Slot index relative to viewport (0 = top slot) */
    offset: number;
    /** Absolute index in the list (for change detection) */
    index?: number;
    /** Optional version number - increment to trigger change animation */
    version?: number;
}
/**
 * Strategy interface that controls visibility logic
 */
interface VisibilityStrategy<TData = any> {
    /**
     * Returns visible items at a discrete integer position.
     * Called for both floor and ceil of current scroll position.
     */
    getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[];
    /**
     * Returns renderable data for a given item ID
     */
    getItemData(id: string): TData;
    /**
     * Total number of positions for scroll bounds
     */
    getTotalPositions(): number;
    /**
     * Suggested initial position
     */
    getInitialPosition(): number;
}
/**
 * State information passed to render function for each item
 */
interface ItemRenderState {
    /** Item identifier */
    id: string;
    /** Interpolated slot offset */
    offset: number;
    /** Absolute index in the list */
    index?: number;
    /** Opacity value 0-1 for enter/exit animations */
    opacity: number;
    /** Item is entering the viewport */
    isAppearing: boolean;
    /** Item is leaving the viewport */
    isDisappearing: boolean;
    /** Item offset changed due to data update */
    isMoving: boolean;
    /** Item data changed (same id, new version) */
    hasChanged: boolean;
    /** Item is sticky (constant offset relative to viewport) */
    isSticky: boolean;
}
/**
 * Props for TweenList component
 */
interface TweenListProps<TData = any> {
    /** Strategy instance that controls visibility logic */
    strategy: VisibilityStrategy<TData>;
    /** Container height in pixels */
    height: number;
    /** Height of each slot in pixels */
    slotHeight: number;
    /** Container width (optional, defaults to 100%) */
    width?: number | string;
    /** Render function for each item */
    children: (data: TData, itemState: ItemRenderState) => React.ReactNode;
    /** Called when scroll position changes */
    onPositionChange?: (position: number) => void;
    /** Signal to trigger re-read from strategy */
    signal?: unknown;
    /** Optional CSS class name for the container */
    className?: string;
    /** Optional CSS class name for the internal scroll container */
    scrollClassName?: string;
    /** Optional inline styles for the container */
    style?: React.CSSProperties;
}
/**
 * Imperative handle for TweenList component
 */
interface TweenListRef {
    /**
     * Scroll to a specific position (index)
     * @param position Target item index
     * @param behavior Scroll behavior ('auto' for instant, 'smooth' for animated)
     * @returns Promise that resolves when scroll completes
     */
    scrollTo(position: number, behavior?: ScrollBehavior): Promise<void>;
}

/**
 * TweenList - Headless virtualized list component with strategy-driven visibility
 *
 * Operates on discrete integer positions rather than pixel offsets, enabling
 * smooth interpolation-based animations and pluggable visibility strategies.
 */
declare const TweenList: react.ForwardRefExoticComponent<TweenListProps<any> & react.RefAttributes<TweenListRef>>;

/**
 * InfiniteLoopStrategy - Built-in strategy for infinite scrolling lists
 *
 * Wraps a finite array of items into an infinite scrollable list using modulo arithmetic.
 * Supports in-place mutations via updateItem and setItems methods.
 */
declare class InfiniteLoopStrategy<TData = any> implements VisibilityStrategy<TData> {
    private items;
    private itemsById;
    private getItemId;
    private totalPositions;
    private itemVersions;
    constructor(items: TData[], options?: {
        getItemId?: (item: TData) => string;
        totalPositions?: number;
    });
    getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[];
    getItemData(id: string): TData;
    getTotalPositions(): number;
    getInitialPosition(): number;
    /**
     * Update an existing item in place
     * @param id - Item ID to update
     * @param data - New item data
     * @param incrementVersion - If true, increments version to trigger change animation
     */
    updateItem(id: string, data: TData, incrementVersion?: boolean): void;
    /**
     * Replace entire items array
     * @param items - New items array
     */
    setItems(items: TData[]): void;
}

interface TreeNode$1 {
    id: string;
    children?: TreeNode$1[];
    [key: string]: any;
}
/**
 * InfiniteHierarchyStrategy - Combines hierarchical sticky headers with infinite scrolling
 *
 * Limitations:
 * - It doesn't cover the case where the list is too short and a section can appear on the bottom while some children are still on the top.
 * - It doesn't cover the case where hierarchy has not enough place in the window for being displayed for a specific child.
 */
declare class InfiniteHierarchyStrategy<TData extends TreeNode$1 = TreeNode$1> implements VisibilityStrategy<TData> {
    private flatItems;
    private itemsById;
    private flatItemsById;
    private itemVersions;
    private totalPositions;
    constructor(items: TData[], options?: {
        totalPositions?: number;
    });
    /**
     * Main entry point for calculating visible items.
     * The pipeline consists of three steps:
     * 1. Generate "Natural Slots": Items that would be visible based purely on scroll position.
     * 2. Group into Sections: Organize items by their root ancestor to handle infinite wrapping (transitions between end and start of list).
     * 3. Resolve Sticky Headers: Ensure all visible items have their parents visible, stacking them at the top if necessary.
     */
    getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[];
    /**
     * Step 1: Generate items based on the raw scroll position.
     * Handles the modulo arithmetic to create the illusion of an infinite list.
     */
    private generateNaturalSlots;
    /**
     * Step 2: Group natural items into sections based on their Root ID.
     * This is critical for infinite scrolling because the view might straddle the end of the list and the beginning of the next loop.
     * Each group represents a coherent hierarchical tree (or part of one).
     */
    private groupItemsIntoSections;
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
    private resolveStickyHeaders;
    /**
     * Helper to check if a specific item's parent is visible.
     * Returns the constructed sticky item if the parent is missing, or null if satisfied.
     */
    private findMissingParent;
    private calculateParentUniqueId;
    private applyStickyItemsToSlots;
    private flattenItems;
    private getOriginalId;
    private getAbsoluteIndexFromUniqueId;
    getItemData(id: string): TData;
    getTotalPositions(): number;
    getInitialPosition(): number;
}

interface TreeNode {
    id: string;
    children?: TreeNode[];
    [key: string]: any;
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
declare class InfiniteHierarchySelectionStrategy<TData extends TreeNode = TreeNode> implements VisibilityStrategy<TData> {
    private flatItems;
    private itemsById;
    private flatItemsById;
    private itemVersions;
    private totalPositions;
    private selectedIds;
    private onSelectionChangeCallback?;
    constructor(items: TData[], options?: {
        totalPositions?: number;
    });
    /**
     * Main entry point for calculating visible items.
     * Extends the base algorithm to include selected items as sticky headers.
     */
    getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[];
    private generateNaturalSlots;
    private groupItemsIntoSections;
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
    private resolveStickyHeaders;
    private getInitialSelectedStickyStack;
    private checkForCoveredSelection;
    private findCoveredSelected;
    private findMissingParent;
    private calculateParentUniqueId;
    private getAbsoluteIndexFromUniqueId;
    private applyStickyItemsToSlots;
    private flattenItems;
    private getClosestInstanceAbove;
    private getOriginalId;
    toggleSelection(id: string): void;
    select(id: string): void;
    deselect(id: string): void;
    getSelectedIds(): Set<string>;
    setOnSelectionChange(callback: (selectedIds: Set<string>) => void): void;
    private notifySelectionChange;
    getItemData(id: string): TData;
    getTotalPositions(): number;
    getInitialPosition(): number;
    /**
     * Iteratively searches for a scroll position where the item becomes naturally visible (not sticky).
     * Simulates deselection to ensure the item doesn't disappear when stickiness is removed.
     */
    findSafeScrollPosition(id: string, currentPosition: number, viewportSlots: number): number;
}

export { InfiniteHierarchySelectionStrategy, InfiniteHierarchyStrategy, InfiniteLoopStrategy, type ItemRenderState, type PositionedItem, TweenList, type TweenListProps, type VisibilityStrategy };
