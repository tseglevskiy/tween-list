import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TweenList } from '../TweenList';
import { VisibilityStrategy, PositionedItem } from '../types';
import { InfiniteLoopStrategy } from '../strategies/InfiniteLoop/InfiniteLoopStrategy';

// Mock strategy for testing
class MockStrategy implements VisibilityStrategy<string> {
  private items: string[];

  constructor(items: string[]) {
    this.items = items;
  }

  getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[] {
    const result: PositionedItem[] = [];
    for (let i = 0; i < viewportSlots && i < this.items.length; i++) {
      const index = (position + i) % this.items.length;
      result.push({
        id: this.items[index],
        offset: i,
      });
    }
    return result;
  }

  getItemData(id: string): string {
    return id;
  }

  getTotalPositions(): number {
    return 1000;
  }

  getInitialPosition(): number {
    return 500;
  }
}

describe('TweenList', () => {
  it('should render container with correct dimensions', () => {
    const strategy = new MockStrategy(['item1', 'item2', 'item3']);

    const { container } = render(
      <TweenList
        strategy={strategy}
        height={300}
        slotHeight={50}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    const containerDiv = container.firstChild as HTMLElement;
    expect(containerDiv).toBeTruthy();
    expect(containerDiv.style.height).toBe('300px');
    expect(containerDiv.style.width).toBe('100%');
    
    // Check scroll container (1st child now, as overlay was moved inside)
    const scrollContainer = containerDiv.children[0] as HTMLElement;
    expect(scrollContainer.style.overflow).toBe('auto');
  });

  it('should render with custom width', () => {
    const strategy = new MockStrategy(['item1']);

    const { container } = render(
      <TweenList
        strategy={strategy}
        height={300}
        slotHeight={50}
        width="500px"
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    const containerDiv = container.firstChild as HTMLElement;
    expect(containerDiv.style.width).toBe('500px');
  });

  it('should render items from strategy', () => {
    const strategy = new MockStrategy(['item1', 'item2', 'item3']);

    render(
      <TweenList
        strategy={strategy}
        height={300}
        slotHeight={50}
      >
        {(data) => <div data-testid={`item-${data}`}>{data}</div>}
      </TweenList>
    );

    // Should render items based on viewport slots + overscan
    // viewport slots = ceil(300 / 50) = 6
    // default overscan = 2, so total slots = 6 + 2*2 = 10
    // But we only have 3 items that will wrap
    expect(screen.getByTestId('item-item1')).toBeTruthy();
    expect(screen.getByTestId('item-item2')).toBeTruthy();
    expect(screen.getByTestId('item-item3')).toBeTruthy();
  });

  it('should pass item data and state to render function', () => {
    const strategy = new MockStrategy(['test-item']);
    const renderSpy = vi.fn((data, state) => <div>{data}</div>);

    render(
      <TweenList
        strategy={strategy}
        height={100}
        slotHeight={50}
      >
        {renderSpy}
      </TweenList>
    );

    expect(renderSpy).toHaveBeenCalled();
    const [data, state] = renderSpy.mock.calls[0];
    expect(data).toBe('test-item');
    expect(state).toHaveProperty('id');
    expect(state).toHaveProperty('offset');
    expect(state).toHaveProperty('opacity');
    expect(state).toHaveProperty('isAppearing');
    expect(state).toHaveProperty('isDisappearing');
    expect(state).toHaveProperty('isMoving');
    expect(state).toHaveProperty('hasChanged');
  });

  it('should create spacer div for scrolling', () => {
    const strategy = new MockStrategy(['item1']);

    const { container } = render(
      <TweenList
        strategy={strategy}
        height={300}
        slotHeight={50}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    const containerDiv = container.firstChild as HTMLElement;
    const scrollContainer = containerDiv.children[0] as HTMLElement;
    const spacer = scrollContainer.children[0] as HTMLElement;
    expect(spacer).toBeTruthy();
    
    // totalPositions = 1000, slotHeight = 50
    // scrollHeight = min(1000 * 50, 10_000_000) = 50_000
    // Check height using style object or inline style string
    const heightStyle = spacer.style.height || spacer.getAttribute('style');
    expect(heightStyle).toContain('50000px');
  });

  it('should cap scroll height at MAX_SCROLL_HEIGHT', () => {
    class LargeStrategy extends MockStrategy {
      getTotalPositions(): number {
        return 1_000_000; // Would be 50_000_000px
      }
    }

    const strategy = new LargeStrategy(['item1']);

    const { container } = render(
      <TweenList
        strategy={strategy}
        height={300}
        slotHeight={50}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    const containerDiv = container.firstChild as HTMLElement;
    const scrollContainer = containerDiv.children[0] as HTMLElement;
    const spacer = scrollContainer.children[0] as HTMLElement;
    // Should be capped at 10_000_000
    const heightStyle = spacer.style.height || spacer.getAttribute('style');
    expect(heightStyle).toContain('10000000px');
  });

  it('should position items absolutely with correct top offset', () => {
    const strategy = new MockStrategy(['item1']);

    const { container } = render(
      <TweenList
        strategy={strategy}
        height={100}
        slotHeight={50}
        overscan={0}
      >
        {(data) => <div data-testid="item">{data}</div>}
      </TweenList>
    );

    const itemWrapper = screen.getByTestId('item').parentElement as HTMLElement;
    expect(itemWrapper.style.position).toBe('absolute');
    expect(itemWrapper.style.height).toBe('50px');
  });

  it('should call onPositionChange when provided', () => {
    const strategy = new MockStrategy(['item1']);
    const onPositionChange = vi.fn();

    render(
      <TweenList
        strategy={strategy}
        height={300}
        slotHeight={50}
        onPositionChange={onPositionChange}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    // Note: In a real test environment, we'd need to simulate scroll
    // For now, just verify the prop is accepted
    expect(onPositionChange).not.toHaveBeenCalled();
  });

  it('should re-query strategy when signal changes', () => {
    const strategy = new MockStrategy(['item1']);
    const getItemsAtPositionSpy = vi.spyOn(strategy, 'getItemsAtPosition');

    const { rerender } = render(
      <TweenList
        strategy={strategy}
        height={100}
        slotHeight={50}
        signal={1}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    const callCountBefore = getItemsAtPositionSpy.mock.calls.length;

    // Change signal to trigger re-query
    rerender(
      <TweenList
        strategy={strategy}
        height={100}
        slotHeight={50}
        signal={2}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    const callCountAfter = getItemsAtPositionSpy.mock.calls.length;
    expect(callCountAfter).toBeGreaterThan(callCountBefore);
  });

  it('should handle custom overscan value', () => {
    const strategy = new MockStrategy(['item1', 'item2']);
    const getItemsAtPositionSpy = vi.spyOn(strategy, 'getItemsAtPosition');

    render(
      <TweenList
        strategy={strategy}
        height={100}
        slotHeight={50}
        overscan={5}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    // viewport slots = ceil(100 / 50) = 2
    // overscan = 5, total = 2 + 5*2 = 12
    const firstCall = getItemsAtPositionSpy.mock.calls[0];
    expect(firstCall[1]).toBe(12); // viewportSlots + overscan * 2
  });

  it('should handle empty strategy', () => {
    const strategy = new MockStrategy([]);

    const { container } = render(
      <TweenList
        strategy={strategy}
        height={300}
        slotHeight={50}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    // Should render without errors - the container exists but has no item children
    const containerDiv = container.firstChild as HTMLElement;
    expect(containerDiv).toBeTruthy();
    // With empty strategy, the spacer div should exist but have no item children
    const scrollContainer = containerDiv.children[0] as HTMLElement;
    const spacer = scrollContainer.firstChild as HTMLElement;
    expect(spacer).toBeTruthy();
    // Sticky container is always present, so length is 1
    expect(spacer.children.length).toBe(1);
    const stickyContainer = spacer.children[0] as HTMLElement;
    expect(stickyContainer.children.length).toBe(0);
  });

  it('should apply opacity to item wrappers', () => {
    const strategy = new MockStrategy(['item1']);

    const { container } = render(
      <TweenList
        strategy={strategy}
        height={100}
        slotHeight={50}
      >
        {(data) => <div data-testid="item">{data}</div>}
      </TweenList>
    );

    const itemWrapper = screen.getByTestId('item').parentElement as HTMLElement;
    // Opacity should be set (1 for stable items)
    expect(itemWrapper.style.opacity).toBeTruthy();
  });

  it('should calculate viewport slots correctly', () => {
    const strategy = new MockStrategy(['item1']);
    const getItemsAtPositionSpy = vi.spyOn(strategy, 'getItemsAtPosition');

    render(
      <TweenList
        strategy={strategy}
        height={275}
        slotHeight={50}
        overscan={1}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    // viewport slots = ceil(275 / 50) = 6
    // overscan = 1, total = 6 + 1*2 = 8
    const firstCall = getItemsAtPositionSpy.mock.calls[0];
    expect(firstCall[1]).toBe(8);
  });

  it('should use strategy initial position', () => {
    class CustomInitialStrategy extends MockStrategy {
      getInitialPosition(): number {
        return 100;
      }
    }

    const strategy = new CustomInitialStrategy(['item1']);
    const getItemsAtPositionSpy = vi.spyOn(strategy, 'getItemsAtPosition');

    render(
      <TweenList
        strategy={strategy}
        height={100}
        slotHeight={50}
      >
        {(data) => <div>{data}</div>}
      </TweenList>
    );

    // Should query around position 100
    const calls = getItemsAtPositionSpy.mock.calls;
    const positions = calls.map((call) => call[0]);
    expect(positions).toContain(100);
  });

  it('should handle version tracking in items', () => {
    class VersionedStrategy extends MockStrategy {
      getItemsAtPosition(position: number, viewportSlots: number): PositionedItem[] {
        return [
          { id: 'item1', offset: 0, version: 5 },
        ];
      }
    }

    const strategy = new VersionedStrategy(['item1']);
    const renderSpy = vi.fn((data, state) => <div>{data}</div>);

    render(
      <TweenList
        strategy={strategy}
        height={100}
        slotHeight={50}
      >
        {renderSpy}
      </TweenList>
    );

    // Verify item state is passed to render function
    expect(renderSpy).toHaveBeenCalled();
  });

  it('should render multiple items with unique keys', () => {
    const strategy = new MockStrategy(['item1', 'item2', 'item3']);

    const { container } = render(
      <TweenList
        strategy={strategy}
        height={300}
        slotHeight={50}
      >
        {(data) => <div data-testid={data}>{data}</div>}
      </TweenList>
    );

    const items = container.querySelectorAll('[data-testid^="item"]');
    expect(items.length).toBeGreaterThan(0);
    
    // Each should have unique key (React ensures this)
    const ids = Array.from(items).map((el) => el.getAttribute('data-testid'));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should position items correctly with InfiniteLoopStrategy', () => {
    // Regression test for correct positioning of repeated items
    const items = [
      { id: '1', content: 'Item 1' },
      { id: '2', content: 'Item 2' },
      { id: '3', content: 'Item 3' },
    ];
    const strategy = new InfiniteLoopStrategy(items, { totalPositions: 100 });
    
    render(
      <TweenList
        strategy={strategy}
        height={200}
        slotHeight={100}
        width={100}
      >
        {(data) => <div>{data.content}</div>}
      </TweenList>
    );

    // Initial state: Position 50.
    // "Item 1" appears at offset 1 and offset 4 (due to loop).
    // offset 1: (50 + 1) * 100 = 5100px.
    // offset 4: (50 + 4) * 100 = 5400px.
    const item1Contents = screen.getAllByText('Item 1');
    expect(item1Contents).toHaveLength(2);
    
    const transforms = item1Contents.map(el => el.parentElement!.style.transform).sort();
    
    expect(transforms).toEqual([
        'translateY(5100px)',
        'translateY(5400px)'
    ]);
  });
});
