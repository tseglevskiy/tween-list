import * as react_jsx_runtime from 'react/jsx-runtime';

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
}
/**
 * Props for VirtualContainer component
 */
interface VirtualContainerProps<TData = any> {
    /** Strategy instance that controls visibility logic */
    strategy: VisibilityStrategy<TData>;
    /** Container height in pixels */
    height: number;
    /** Height of each slot in pixels */
    slotHeight: number;
    /** Container width (optional, defaults to 100%) */
    width?: number | string;
    /** Number of extra slots to render above/below viewport */
    overscan?: number;
    /** Render function for each item */
    children: (data: TData, itemState: ItemRenderState) => React.ReactNode;
    /** Called when scroll position changes */
    onPositionChange?: (position: number) => void;
    /** Signal to trigger re-read from strategy */
    signal?: unknown;
    /** Optional CSS class name for the container */
    className?: string;
    /** Optional inline styles for the container */
    style?: React.CSSProperties;
}

/**
 * VirtualContainer - Headless virtualized list component with strategy-driven visibility
 *
 * Operates on discrete integer positions rather than pixel offsets, enabling
 * smooth interpolation-based animations and pluggable visibility strategies.
 */
declare function VirtualContainer<TData = any>(props: VirtualContainerProps<TData>): react_jsx_runtime.JSX.Element;

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

export { InfiniteLoopStrategy, type ItemRenderState, type PositionedItem, VirtualContainer, type VirtualContainerProps, type VisibilityStrategy };
