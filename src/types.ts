/**
 * Represents an item positioned at a specific slot offset
 */
export interface PositionedItem {
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
export interface VisibilityStrategy<TData = any> {
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
export interface ItemRenderState {
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
export interface TweenListProps<TData = any> {
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
export interface TweenListRef {
  /** 
   * Scroll to a specific position (index) 
   * @param position Target item index
   * @param behavior Scroll behavior ('auto' for instant, 'smooth' for animated)
   * @returns Promise that resolves when scroll completes
   */
  scrollTo(position: number, behavior?: ScrollBehavior): Promise<void>;
}

/**
 * Internal interpolated item state used during rendering
 */
export interface InterpolatedItem {
  id: string;
  offset: number;
  index?: number;
  opacity: number;
  isAppearing: boolean;
  isDisappearing: boolean;
  isMoving: boolean;
  hasChanged: boolean;
  isSticky: boolean;
  version?: number;
}
