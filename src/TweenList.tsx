import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TweenListProps, TweenListRef } from './types';
import { diffSnapshots } from './utils/diffSnapshots';
import { easeInOutCubic } from './utils/easing';

const MAX_SCROLL_HEIGHT = 10_000_000; // Cap scroll height to prevent overflow

/**
 * TweenList - Headless virtualized list component with strategy-driven visibility
 * 
 * Operates on discrete integer positions rather than pixel offsets, enabling
 * smooth interpolation-based animations and pluggable visibility strategies.
 */
export const TweenList = forwardRef<TweenListRef, TweenListProps<any>>(function TweenList<TData = any>(
  props: TweenListProps<TData>, 
  ref: React.Ref<TweenListRef>
) {
  const {
    strategy,
    height,
    slotHeight,
    width = '100%',
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
  const animationRafRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    scrollTo: (position: number, behavior: ScrollBehavior = 'auto') => {
      return new Promise<void>((resolve) => {
        const container = containerRef.current;
        if (!container) {
          resolve();
          return;
        }

        // Cancel any pending scroll animation
        if (animationRafRef.current !== null) {
          cancelAnimationFrame(animationRafRef.current);
          animationRafRef.current = null;
        }

        const scrollTop = position * slotHeight;
        
        if (behavior === 'smooth') {
          const startScrollTop = container.scrollTop;
          const distance = scrollTop - startScrollTop;
          const startTime = performance.now();
          const duration = 500; // Fixed duration for consistency

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutCubic(progress);
            
            const newScrollTop = startScrollTop + (distance * easedProgress);
            container.scrollTop = newScrollTop;
            
            if (progress < 1) {
              animationRafRef.current = requestAnimationFrame(animate);
            } else {
              animationRafRef.current = null;
              resolve();
            }
          };
          
          animationRafRef.current = requestAnimationFrame(animate);
        } else {
          // Update DOM
          container.scrollTop = scrollTop;
          
          // Update state immediately to reflect change without waiting for scroll event
          // This is important for "teleporting"
          setScrollPosition(position);
          resolve();
        }
      });
    }
  }));
  const prevItemsRef = useRef<Map<string, { offset: number; index?: number; version?: number }>>(new Map());

  // Calculate viewport slots
  const viewportSlots = Math.ceil(height / slotHeight);

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
    return strategy.getItemsAtPosition(floor, viewportSlots);
  }, [strategy, floor, viewportSlots, signal]);

  const itemsAtCeil = useMemo(() => {
    return strategy.getItemsAtPosition(ceil, viewportSlots);
  }, [strategy, ceil, viewportSlots, signal]);

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
          {/* Sticky Layer - Now inside scroll container using position: sticky */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              left: 0,
              right: 0,
              height: 0, // Don't displace content
              zIndex: 10,
              overflow: 'visible', // Allow items to be seen
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
                    top: `${item.offset * slotHeight}px`, // Position relative to sticky container (viewport top)
                    left: 0,
                    right: 0,
                    height: `${slotHeight}px`,
                    opacity: item.opacity,
                  }}
                >
                  {children(data, itemState)}
                </div>
              );
            })}
          </div>

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
});
