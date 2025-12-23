import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TweenListProps } from './types';
import { diffSnapshots } from './utils/diffSnapshots';

const MAX_SCROLL_HEIGHT = 10_000_000; // Cap scroll height to prevent overflow

/**
 * TweenList - Headless virtualized list component with strategy-driven visibility
 * 
 * Operates on discrete integer positions rather than pixel offsets, enabling
 * smooth interpolation-based animations and pluggable visibility strategies.
 */
export function TweenList<TData = any>(props: TweenListProps<TData>) {
  const {
    strategy,
    height,
    slotHeight,
    width = '100%',
    overscan = 2,
    children,
    onPositionChange,
    signal,
    className,
    scrollClassName,
    style,
  } = props;

  const [scrollPosition, setScrollPosition] = useState<number>(
    strategy.getInitialPosition()
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevItemsRef = useRef<Map<string, { offset: number; index?: number; version?: number }>>(new Map());

  // Calculate viewport slots
  const viewportSlots = Math.ceil(height / slotHeight);
  const totalSlots = viewportSlots + overscan * 2;

  // Calculate scroll metrics
  const totalPositions = strategy.getTotalPositions();
  const scrollHeight = Math.min(totalPositions * slotHeight, MAX_SCROLL_HEIGHT);

  // Handle scroll events with RAF throttling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Cancel any pending RAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      // Schedule new RAF
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = container.scrollTop;
        const position = scrollTop / slotHeight;

        setScrollPosition(position);

        if (onPositionChange) {
          onPositionChange(position);
        }
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [slotHeight, onPositionChange]);

  // Set initial scroll position on mount (before paint)
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialPosition = strategy.getInitialPosition();
    const initialScrollTop = initialPosition * slotHeight;

    container.scrollTop = initialScrollTop;
    setScrollPosition(initialPosition);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate floor, ceil, and interpolation factor
  const { floor, ceil, t } = useMemo(() => {
    const floor = Math.floor(scrollPosition);
    // Always interpolate to next frame to detect sticky items consistently
    const ceil = floor + 1;
    const t = scrollPosition - floor;

    return { floor, ceil, t };
  }, [scrollPosition]);

  // Query strategy for items at floor and ceil positions
  // Include signal in dependencies to trigger re-read
  const itemsAtFloor = useMemo(() => {
    return strategy.getItemsAtPosition(floor, totalSlots);
  }, [strategy, floor, totalSlots, signal]);

  const itemsAtCeil = useMemo(() => {
    return strategy.getItemsAtPosition(ceil, totalSlots);
  }, [strategy, ceil, totalSlots, signal]);

  // Compute interpolated items using dual-diffing
  const interpolatedItems = useMemo(() => {
    return diffSnapshots(itemsAtFloor, itemsAtCeil, t, prevItemsRef.current);
  }, [itemsAtFloor, itemsAtCeil, t]);

  // Update prevItemsRef after render
  useEffect(() => {
    const newPrevItems = new Map<string, { offset: number; index?: number; version?: number }>();

    for (const item of interpolatedItems) {
      newPrevItems.set(item.id, {
        offset: item.offset,
        index: item.index,
        version: item.version,
      });
    }

    prevItemsRef.current = newPrevItems;
  });

  // Separate sticky items from scrolling items
  const stickyItems = interpolatedItems.filter(item => item.isSticky);
  const scrollItems = interpolatedItems.filter(item => !item.isSticky);

  return (
    <div
      style={{
        position: 'relative',
        height: `${height}px`,
        width,
        ...style,
      }}
      className={className}
    >
      {/* Static Overlay Layer for Sticky Items */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
          pointerEvents: 'none', // Allow clicks to pass through to scroll container
        }}
      >
        {stickyItems.map((item) => {
          const data = strategy.getItemData(item.id);
          
          const itemState = {
            id: item.id,
            offset: item.offset,
            index: item.index,
            opacity: item.opacity,
            isAppearing: item.isAppearing,
            isDisappearing: item.isDisappearing,
            isMoving: item.isMoving,
            hasChanged: item.hasChanged,
            isSticky: true,
          };

          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                top: `${item.offset * slotHeight}px`, // Fixed position relative to viewport
                left: 0,
                right: 0,
                height: `${slotHeight}px`,
                opacity: item.opacity,
                pointerEvents: 'auto', // Re-enable clicks for the items themselves
              }}
            >
              {children(data, itemState)}
            </div>
          );
        })}
      </div>

      {/* Scroll Container */}
      <div
        ref={containerRef}
        className={scrollClassName}
        style={{
          height: '100%',
          width: '100%',
          overflow: 'auto',
          position: 'relative',
          zIndex: 0,
        }}
      >
        {/* Fix #6: Spacer with items positioned inside it per spec */}
        <div style={{ height: `${scrollHeight}px`, position: 'relative' }}>
          {scrollItems.map((item) => {
            const data = strategy.getItemData(item.id);
            
            // Fix #4: Keep interpolated offset in itemState (don't subtract overscan)
            const itemState = {
              id: item.id,
              offset: item.offset,
              index: item.index,
              opacity: item.opacity,
              isAppearing: item.isAppearing,
              isDisappearing: item.isDisappearing,
              isMoving: item.isMoving,
              hasChanged: item.hasChanged,
              isSticky: false,
            };

            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: `${slotHeight}px`,
                  transform: `translateY(${(floor + item.offset + t) * slotHeight}px)`,
                  opacity: item.opacity,
                }}
              >
                {children(data, itemState)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
