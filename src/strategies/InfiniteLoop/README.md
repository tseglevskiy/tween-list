# InfiniteLoopStrategy

Built-in strategy for infinite scrolling lists.

## Overview
Wraps a finite array of items into an infinite scrollable list using modulo arithmetic. It allows for seamless scrolling in both directions.

## Features
- Infinite scrolling (virtualized wrapping)
- In-place item updates (`updateItem`)
- Full list replacement (`setItems`)
- Version tracking for smooth transitions

## Usage

```typescript
import { InfiniteLoopStrategy } from './InfiniteLoopStrategy';

const items = [...];
const strategy = new InfiniteLoopStrategy(items);

// Pass to TweenList
<TweenList strategy={strategy} ... />
