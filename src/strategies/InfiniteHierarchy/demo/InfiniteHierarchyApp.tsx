import React, { useMemo, useState } from 'react';
import { TweenList } from '../../../TweenList';
import { InfiniteHierarchyStrategy, TreeNode } from '../InfiniteHierarchyStrategy';

interface DemoItem extends TreeNode {
  title: string;
  color: string;
  type: 'folder' | 'file';
}

const COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5', 
  '#FF3385', '#D4FF33', '#FF8C33', '#8C33FF', '#33FF8C'
];

function generateTree(depth: number, width: number, parentId = 'Item'): DemoItem[] {
  if (depth === 0) return [];
  
  return Array.from({ length: width }, (_, i) => {
    const id = `${parentId}-${i}`;
    const hasChildren = depth > 1 && Math.random() > 0.3; // 70% chance of children
    const children = hasChildren 
      ? generateTree(depth - 1, width, id) 
      : undefined;

    return {
      id,
      title: id,
      color: COLORS[(id.length + i) % COLORS.length],
      type: hasChildren ? 'folder' : 'file',
      children
    };
  });
}

export const InfiniteHierarchyApp: React.FC = () => {
  const [treeDepth, setTreeDepth] = useState(3);
  const [treeWidth, setTreeWidth] = useState(3);
  
  // Create tree structure
  const items = useMemo(() => generateTree(treeDepth, treeWidth, 'Root'), [treeDepth, treeWidth]);
  
  // Create strategy
  const strategy = useMemo(() => new InfiniteHierarchyStrategy(items), [items]);

  const slotHeight = 60;
  const containerHeight = 600;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Infinite Hierarchy Demo</h1>
      <p>
        Infinite scrolling with hierarchical sticky headers.
        Scroll down to see the list wrap around seamlessly while maintaining correct sticky headers for each section.
      </p>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <label>
          Depth:
          <input 
            type="number" 
            value={treeDepth} 
            onChange={(e) => setTreeDepth(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ marginLeft: '10px', width: '50px' }}
          />
        </label>
        <label>
          Width:
          <input 
            type="number" 
            value={treeWidth} 
            onChange={(e) => setTreeWidth(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ marginLeft: '10px', width: '50px' }}
          />
        </label>
      </div>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        overflow: 'hidden',
        background: '#f9f9f9',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
      }}>
        <TweenList
          strategy={strategy}
          height={600}
          slotHeight={slotHeight}
          scrollClassName="no-scrollbar"
        >
          {(data: any, state) => {
            const depth = data.depth || 0;
            const isFolder = data.type === 'folder';
            
            return (
            <div
              style={{
                height: '100%',
                padding: '4px 8px',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  borderLeft: `4px solid ${data.color}`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: `${depth * 20 + 10}px`, // Indentation
                  paddingRight: '10px',
                  boxShadow: isFolder 
                    ? '0 2px 5px rgba(0,0,0,0.1)' 
                    : '0 1px 2px rgba(0,0,0,0.05)',
                  opacity: state.opacity,
                  transform: `scale(${0.98 + state.opacity * 0.02})`,
                  position: 'relative'
                }}
              >
                <div style={{ marginRight: '10px', fontSize: '1.2em' }}>
                  {isFolder ? '📂' : '📄'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: isFolder ? 'bold' : 'normal', color: '#333' }}>
                    {data.title}
                  </div>
                  <div style={{ fontSize: '0.7em', color: '#999' }}>
                    ID: {data.id} | Depth: {depth} {data.parentId && `| Parent: ${data.parentId}`}
                  </div>
                </div>
                <div style={{ fontSize: '0.7em', fontFamily: 'monospace', color: '#ccc' }}>
                  Idx: {state.index}
                </div>
              </div>
            </div>
          )}}
        </TweenList>
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        <p>Total Items (Flattened): {strategy.getTotalPositions()}</p>
      </div>
    </div>
  );
};
