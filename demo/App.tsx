import React, { useMemo, useState } from 'react';
import { TweenList } from '../src/TweenList';
import { InfiniteLoopStrategy } from '../src/strategies/InfiniteLoopStrategy';

interface DemoItem {
  id: string;
  title: string;
  color: string;
  height: number;
}

const COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5', 
  '#FF3385', '#D4FF33', '#FF8C33', '#8C33FF', '#33FF8C'
];

function generateItems(count: number): DemoItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    title: `Item ${i + 1}`,
    color: COLORS[i % COLORS.length],
    height: 50 + (i % 3) * 20, // Varying logical height (visual only, slot is fixed)
  }));
}

const App: React.FC = () => {
  const [itemCount, setItemCount] = useState(20);
  const items = useMemo(() => generateItems(itemCount), [itemCount]);
  
  // Re-create strategy when items change
  const strategy = useMemo(() => new InfiniteLoopStrategy(items), [items]);

  const slotHeight = 80;
  const containerHeight = 600;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Tween List Demo</h1>
      <p>
        Infinite loop scrolling with smooth interpolation and positioning.
        Notice items fading in/out at the edges and maintaining position relative to the document.
      </p>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label>
          Item Count:
          <input 
            type="number" 
            value={itemCount} 
            onChange={(e) => setItemCount(Math.max(1, parseInt(e.target.value) || 0))}
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </label>
        <button onClick={() => setItemCount(prev => prev + 5)}>Add 5</button>
        <button onClick={() => setItemCount(prev => Math.max(1, prev - 5))}>Remove 5</button>
      </div>

      <div style={{ 
        border: '2px solid #ccc', 
        borderRadius: '8px', 
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
      }}>
        <TweenList
          strategy={strategy}
          height={containerHeight}
          slotHeight={slotHeight}
          overscan={2}
          className="no-scrollbar"
        >
          {(data, state) => (
            <div
              style={{
                height: '100%',
                padding: '10px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                // Add a transition for opacity to smooth out fade in/out even more if desired
                // But container handles opacity via state
                transition: 'transform 0.1s linear', // Optional: smooth out RAF jitter if any
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: data.color,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  color: 'white',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  opacity: state.opacity, // Use passed opacity for fade effect
                  transform: `scale(${0.9 + state.opacity * 0.1})`, // Subtle scale effect
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.2em' }}>{data.title}</div>
                  <div style={{ fontSize: '0.8em', opacity: 0.8 }}>ID: {data.id}</div>
                </div>
                <div style={{ fontSize: '0.8em', fontFamily: 'monospace' }}>
                  Offset: {state.offset.toFixed(2)}
                  <br/>
                  Slot: {state.index ?? 'N/A'}
                </div>
              </div>
            </div>
          )}
        </TweenList>
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        <p>Debug Info:</p>
        <ul>
          <li>Total Items: {items.length}</li>
          <li>Slot Height: {slotHeight}px</li>
          <li>Container Height: {containerHeight}px</li>
          <li>Strategy: InfiniteLoopStrategy</li>
        </ul>
      </div>
    </div>
  );
};

export default App;
