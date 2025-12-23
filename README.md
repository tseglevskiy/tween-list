# Tween List

A headless, strategy-driven virtualized list component for React that operates on **discrete integer positions** rather than pixel offsets. It separates rendering mechanics from visibility logic, enabling smooth, stateful animations and complex behaviors like infinite scrolling with zero position glitches.

## The Problem with Traditional Virtualization

Most virtualization libraries map pixel scroll offsets directly to array indices (`offset / itemHeight`). This works for simple flat lists but breaks down when you need:
- **Infinite Loops**: Wrapping items seamlessly without duplicating data.
- **Stateful Animations**: Detecting when an item *moves* vs when the viewport *scrolls*.
- **Complex Visibility**: Sticky headers, hierarchical trees, or non-linear navigation.

## The Tween List Solution

Tween List decouples the "Where am I?" logic (Strategy) from the "How do I render?" logic (Container).

1.  **Integer Positions**: The scroll position is a float (e.g., `5.3`), meaning "30% of the way between slot 5 and slot 6".
2.  **Strategy Pattern**: You provide a `VisibilityStrategy` that calculates which items exist at integer position `5` and `6`.
3.  **Interpolation**: The container diffs the state at `floor(5)` and `ceil(6)` and interpolates them. If an item exists in both, it moves smoothly. If it exists in only one, it fades in/out.

This allows for:
- **Glitch-free Infinite Scrolling**: The strategy just uses modulo arithmetic. The container sees a continuous stream of items.
- **Smooth Entry/Exit**: Items fade in when they enter the view and fade out when they leave.
- **Data Change Animations**: Detects if an item moved structurally or just scrolled, allowing for precise FLIP animations.

## Installation

```bash
npm install tween-list
```

## Quick Start

```tsx
import { TweenList, InfiniteLoopStrategy } from 'tween-list';

// 1. Define your data
const items = [
  { id: '1', text: 'Item 1' },
  { id: '2', text: 'Item 2' },
  { id: '3', text: 'Item 3' },
];

// 2. Create a strategy
const strategy = new InfiniteLoopStrategy(items);

// 3. Render the container
function App() {
  return (
    <TweenList
      strategy={strategy}
      height={400}
      slotHeight={60}
    >
      {(item, state) => (
        <div 
          style={{ 
            opacity: state.opacity, // Fades in/out at edges
            // Use state.offset for custom transforms if needed
          }}
        >
          {item.text}
        </div>
      )}
    </TweenList>
  );
}
```

## Architecture

### The TweenList

The `TweenList` is a React component that:
-   Manages the scroll event loop (throttled via `requestAnimationFrame`).
-   Calculates the current "Integer Position" based on scroll offset.
-   Queries your `VisibilityStrategy` for items at the current `floor` and `ceil` positions.
-   **Interpolates** the state between floor and ceil to determine the exact visual offset and opacity for each item.
-   Renders your items using absolute positioning within a scrollable spacer.

### The VisibilityStrategy

The `VisibilityStrategy` is a plain class responsible for data logic. It answers:
-   "What items are visible at position X?"
-   "What is the data for item ID Y?"

It knows nothing about pixels, rendering, or the DOM.

#### Interface

```typescript
interface VisibilityStrategy<TData = any> {
  // Returns items visible at a specific integer position
  getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[];
  
  // Returns the actual data object for an ID
  getItemData(id: string): TData;
  
  // Returns total scrollable positions (for scrollbar sizing)
  getTotalPositions(): number;
  
  // Returns where to start scrolling (e.g. middle of infinite list)
  getInitialPosition(): number;
}
```

### PositionedItem & Indexing

The strategy returns `PositionedItem` objects:

```typescript
interface PositionedItem {
  id: string;      // Unique key
  offset: number;  // Visual slot offset (0 = top of viewport, 1 = second slot...)
  index?: number;  // Absolute index in the list (for detecting reorders)
}
```

-   **`id`**: Must be unique for the active view. `InfiniteLoopStrategy` generates IDs like `originalId__absoluteIndex` to support the same item appearing twice (at the top and bottom of the loop).
-   **`offset`**: Where the item is relative to the *requested position*.
-   **`index`**: (Optional) The absolute index in your dataset. Used to distinguish "scrolling" from "reordering".

## Animation & State

The render prop receives an `ItemRenderState` object with powerful animation flags:

```typescript
interface ItemRenderState {
  id: string;
  offset: number;          // Interpolated visual offset (e.g. 0.3 slots from top)
  opacity: number;         // 0 to 1. (1 = fully visible, <1 = entering/leaving)
  isAppearing: boolean;    // True if item is new in the viewport (scrolling in)
  isDisappearing: boolean; // True if item is leaving the viewport (scrolling out)
  isMoving: boolean;       // True if item moved structurally (reorder), not just scrolled
  hasChanged: boolean;     // True if item version incremented (data update)
}
```

### How it works
-   **Scrolling**: As you scroll from 0 to 1, an item at offset 0 moves smoothly to offset -1. Its `opacity` interpolates from 1 to 0.
-   **Looping**: When an item wraps around, it is treated as a "new" instance (new ID suffix), so it fades in at the bottom while the old one fades out at the top.
-   **Reordering**: If you insert an item, `isMoving` becomes true for displaced items, allowing you to apply CSS transitions (FLIP technique).

## Built-in Strategies

### `InfiniteLoopStrategy`

A robust implementation of infinite scrolling.
-   **Circular Buffer**: Wraps your data array endlessly.
-   **Stable IDs**: Automatically handles ID collisions for wrapped items.
-   **Smart Defaults**: Sets a safe scroll range to avoid browser limits.

```typescript
const strategy = new InfiniteLoopStrategy(items, {
  totalPositions: 100_000, // Safe scroll range
  getItemId: (item) => item.id
});
```

### `HierarchyStrategy`

Flattens hierarchical data and provides sticky headers.
-   **Tree Flattening**: Converts nested tree data into a flat list.
-   **Sticky Headers**: Parent nodes stick to the top when their children are visible.
-   **Depth Awareness**: Provides depth information for indentation.

```typescript
const strategy = new HierarchyStrategy(treeData);
```

## Custom Strategies

You can implement your own strategy for advanced use cases:
-   **Sticky Headers**: Always return a header item at `offset: 0`.
-   **Tree Views**: Flatten a tree based on expanded state.
-   **Grids**: Map 1D position to 2D grid items.

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `strategy` | `VisibilityStrategy` | Required | The logic driving the list. |
| `height` | `number` | Required | Viewport height in pixels. |
| `slotHeight` | `number` | Required | Fixed height of each slot. |
| `width` | `number \| string` | `'100%'` | Container width. |
| `overscan` | `number` | `2` | Extra slots to render off-screen. |
| `children` | `Function` | Required | Render prop `(data, state) => Node`. |
| `signal` | `any` | `undefined` | Change this prop to force a re-render/diff. |
| `onPositionChange` | `(pos: number) => void` | - | Callback with current float position. |

## Running the Demo

Clone the repository and run:

```bash
npm install
```

We have samples for each strategy in `src/strategies/<StrategyName>/demo/`. You can run them using the following commands:

-   **Infinite Loop Demo**:
    ```bash
    npm run demo:infinite
    ```

-   **Hierarchy (Tree) Demo**:
    ```bash
    npm run demo:hierarchy
    ```

This starts a Vite server with an interactive playground demonstrating the capabilities of each strategy.

## License

MIT
