import React, { useState, useMemo, useRef } from 'react';
import { TweenList } from '../../../TweenList';
import { TweenListRef, ItemRenderState } from '../../../types';
import { InfiniteHierarchySelectionStrategy, FlatHierarchyItem } from '../InfiniteHierarchySelectionStrategy';

// Synthetic flat data: Human Anatomy
// Levels: Body System -> Region -> Organ -> Part
// Max depth: 3 (4 levels)
const ANATOMY_DATA: FlatHierarchyItem[] = [
  // Root: Nervous System
  { id: 'nervous', data: { name: 'Nervous System', color: '#E1F5FE' }, depth: 0, parents: [] },
  
  // Level 1: Central Nervous System
  { id: 'nervous-cns', data: { name: 'Central Nervous System', color: '#B3E5FC' }, depth: 1, parents: ['nervous'] },
  
  // Level 2: Brain
  { id: 'nervous-cns-brain', data: { name: 'Brain', color: '#81D4FA' }, depth: 2, parents: ['nervous', 'nervous-cns'] },
  
  // Level 3: Cerebrum (Extra level)
  { id: 'nervous-cns-brain-cerebrum', data: { name: 'Cerebrum', color: '#4FC3F7' }, depth: 3, parents: ['nervous', 'nervous-cns', 'nervous-cns-brain'] },
  { id: 'nervous-cns-brain-cerebellum', data: { name: 'Cerebellum', color: '#4FC3F7' }, depth: 3, parents: ['nervous', 'nervous-cns', 'nervous-cns-brain'] },

  // Level 2: Spinal Cord
  { id: 'nervous-cns-spine', data: { name: 'Spinal Cord', color: '#81D4FA' }, depth: 2, parents: ['nervous', 'nervous-cns'] },

  // Root: Circulatory System
  { id: 'circulatory', data: { name: 'Circulatory System', color: '#FFEBEE' }, depth: 0, parents: [] },
  
  // Level 1: Heart
  { id: 'circulatory-heart', data: { name: 'Heart', color: '#FFCDD2' }, depth: 1, parents: ['circulatory'] },
  
  // Level 2: Chambers
  { id: 'circulatory-heart-atria', data: { name: 'Atria', color: '#EF9A9A' }, depth: 2, parents: ['circulatory', 'circulatory-heart'] },
  
  // Level 3: Specific Atria
  { id: 'circulatory-heart-atria-left', data: { name: 'Left Atrium', color: '#E57373' }, depth: 3, parents: ['circulatory', 'circulatory-heart', 'circulatory-heart-atria'] },
  { id: 'circulatory-heart-atria-right', data: { name: 'Right Atrium', color: '#E57373' }, depth: 3, parents: ['circulatory', 'circulatory-heart', 'circulatory-heart-atria'] },

  // Level 2: Valves
  { id: 'circulatory-heart-valves', data: { name: 'Valves', color: '#EF9A9A' }, depth: 2, parents: ['circulatory', 'circulatory-heart'] },
  { id: 'circulatory-heart-valves-mitral', data: { name: 'Mitral Valve', color: '#E57373' }, depth: 3, parents: ['circulatory', 'circulatory-heart', 'circulatory-heart-valves'] },

  // Level 1: Blood Vessels
  { id: 'circulatory-vessels', data: { name: 'Blood Vessels', color: '#FFCDD2' }, depth: 1, parents: ['circulatory'] },
  { id: 'circulatory-vessels-arteries', data: { name: 'Arteries', color: '#EF9A9A' }, depth: 2, parents: ['circulatory', 'circulatory-vessels'] },
  { id: 'circulatory-vessels-arteries-aorta', data: { name: 'Aorta', color: '#E57373' }, depth: 3, parents: ['circulatory', 'circulatory-vessels', 'circulatory-vessels-arteries'] },

  // Root: Respiratory System
  { id: 'respiratory', data: { name: 'Respiratory System', color: '#E8F5E9' }, depth: 0, parents: [] },
  { id: 'respiratory-lungs', data: { name: 'Lungs', color: '#C8E6C9' }, depth: 1, parents: ['respiratory'] },
  { id: 'respiratory-lungs-lobes', data: { name: 'Lobes', color: '#A5D6A7' }, depth: 2, parents: ['respiratory', 'respiratory-lungs'] },
  { id: 'respiratory-lungs-lobes-superior', data: { name: 'Superior Lobe', color: '#81C784' }, depth: 3, parents: ['respiratory', 'respiratory-lungs', 'respiratory-lungs-lobes'] },
];

export const InfiniteHierarchySelectionFlatApp: React.FC = () => {
  const [signal, setSignal] = useState(0);
  const listRef = useRef<TweenListRef>(null);
  const currentPositionRef = useRef(0);
  
  const strategy = useMemo(() => {
    const s = new InfiniteHierarchySelectionStrategy(ANATOMY_DATA, { 
        totalPositions: 50000
    });
    
    s.setOnSelectionChange(() => {
      setSignal(prev => prev + 1);
    });
    
    currentPositionRef.current = s.getInitialPosition();

    return s;
  }, []);

  const handleToggle = async (id: string, itemState: ItemRenderState, isSelected: boolean) => {
    if (itemState.isSticky && isSelected) {
      const viewportSlots = Math.ceil(600 / 40);
      const safePos = strategy.findSafeScrollPosition(id, currentPositionRef.current, viewportSlots);
      
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
        <h2>Infinite Hierarchy Selection (Flat Data)</h2>
        <p>Domain: Human Anatomy (4 Levels Deep)</p>
        <p>Click items to select/deselect. Selected items become sticky.</p>
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
                backgroundColor: data.color || '#fff', 
                borderBottom: '1px solid #eee',
                boxSizing: 'border-box',
                cursor: 'pointer',
                color: data.isSelected ? 'black' : 'black', 
                fontWeight: data.isSelected ? 'bold' : 'normal',
                // Highlight selection with border/background logic if needed, currently bold + sticky shadow
                borderLeft: data.isSelected ? '4px solid red' : 'none',
                boxShadow: itemState.isSticky ? '0 2px 5px rgba(0,0,0,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {data.name} {data.isSelected ? '(Selected)' : ''} {itemState.isSticky ? '(Sticky)' : ''}
              <span style={{ marginLeft: 'auto', marginRight: '10px', fontSize: '12px', opacity: 0.7 }}>
                {data.id}
              </span>
            </div>
          )}
        </TweenList>
      </div>
    </div>
  );
};
