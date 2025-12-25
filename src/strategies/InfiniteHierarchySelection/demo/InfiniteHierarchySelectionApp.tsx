import React, { useState, useMemo, useRef } from 'react';
import { TweenList } from '../../../TweenList';
import { TweenListRef, ItemRenderState } from '../../../types';
import { InfiniteHierarchySelectionStrategy } from '../InfiniteHierarchySelectionStrategy';

// Generate hierarchical data
const generateData = (count: number, depth: number = 0, parentId: string = ''): any[] => {
  if (depth > 2) return [];
  
  return Array.from({ length: count }).map((_, i) => {
    const id = parentId ? `${parentId}-${i}` : `item-${i}`;
    const hasChildren = Math.random() > 0.3;
    
    return {
      id,
      label: `Item ${id}`,
      children: hasChildren ? generateData(3, depth + 1, id) : []
    };
  });
};

const DATA = generateData(20);

export const InfiniteHierarchySelectionApp: React.FC = () => {
  const [signal, setSignal] = useState(0);
  const listRef = useRef<TweenListRef>(null);
  // Track current position roughly to feed into strategy
  // In a real app, this could be state, but ref is better for performance to avoid re-renders
  const currentPositionRef = useRef(0);
  
  const strategy = useMemo(() => {
    const s = new InfiniteHierarchySelectionStrategy(DATA, { 
        totalPositions: 50000
    });
    // Connect strategy updates to React state
    s.setOnSelectionChange(() => {
      setSignal(prev => prev + 1);
    });
    
    // Initial position
    currentPositionRef.current = s.getInitialPosition();

    return s;
  }, []);

  const handleToggle = async (id: string, itemState: ItemRenderState, isSelected: boolean) => {
    if (itemState.isSticky && isSelected) {
      // It's a sticky selected item. Scroll to its natural position.
      // Use iterative safe position finding
      const viewportSlots = Math.ceil(600 / 40); // height / slotHeight
      const safePos = strategy.findSafeScrollPosition(id, currentPositionRef.current, viewportSlots);
      
      // Scroll to the safe position
      if (listRef.current) {
        await listRef.current.scrollTo(safePos, 'smooth');
        strategy.toggleSelection(id);
      }
    } else {
      strategy.toggleSelection(id);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
        <h2>Infinite Hierarchy Selection</h2>
        <p>Click items to select/deselect. Selected items become sticky when scrolled out or covered.</p>
        <p>Red items are selected.</p>
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TweenList
          ref={listRef}
          strategy={strategy}
          height={600}
          slotHeight={40}
          signal={signal}
          onPositionChange={(pos) => {
            currentPositionRef.current = pos;
          }}
        >
          {(data: any, itemState) => (
            <div
              onClick={() => handleToggle(data.id, itemState, data.isSelected)}
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: `${(data.depth || 0) * 20 + 10}px`,
                backgroundColor: '#fff',
                borderBottom: '1px solid #eee',
                boxSizing: 'border-box',
                cursor: 'pointer',
                color: data.isSelected ? 'red' : 'black',
                boxShadow: itemState.isSticky ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {data.label} {data.isSelected ? '(Selected)' : ''} {itemState.isSticky ? '(Sticky)' : ''}
              <span style={{ marginLeft: 'auto', marginRight: '10px', fontSize: '12px', color: '#999' }}>
                idx: {itemState.index}
              </span>
            </div>
          )}
        </TweenList>
      </div>
    </div>
  );
};
