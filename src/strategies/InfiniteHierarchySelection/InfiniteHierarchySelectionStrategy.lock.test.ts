import { describe, it, expect } from 'vitest';
import { InfiniteHierarchySelectionStrategy, TreeNode } from './InfiniteHierarchySelectionStrategy';

describe('InfiniteHierarchySelectionStrategy Lock Tests', () => {
  const data: TreeNode[] = [
    {
      id: 'root',
      children: [
        {
          id: 'child1',
          children: [
            { id: 'grandchild1' },
            { id: 'grandchild2' },
          ],
        },
        {
          id: 'child2',
          children: [
            { id: 'grandchild3' },
          ],
        },
      ],
    },
    {
        id: 'root2',
        children: [{ id: 'child3' }]
    }
  ];

  const strategy = InfiniteHierarchySelectionStrategy.fromTree(data);

  // Select some items to test sticky selection logic
  strategy.select('child1');
  strategy.select('grandchild3');

  const lockData = {
  "0": [
    {
      "id": "grandchild3__-3",
      "offset": 0,
      "index": -3
    },
    {
      "id": "root__0",
      "offset": 1,
      "index": 0
    },
    {
      "id": "child1__1",
      "offset": 2,
      "index": 1
    },
    {
      "id": "grandchild2__3",
      "offset": 3,
      "index": 3
    },
    {
      "id": "child2__4",
      "offset": 4,
      "index": 4
    }
  ],
  "1": [
    {
      "id": "root__0",
      "offset": 0,
      "index": 0
    },
    {
      "id": "child1__1",
      "offset": 1,
      "index": 1
    },
    {
      "id": "grandchild2__3",
      "offset": 2,
      "index": 3
    },
    {
      "id": "child2__4",
      "offset": 3,
      "index": 4
    },
    {
      "id": "grandchild3__5",
      "offset": 4,
      "index": 5
    }
  ],
  "2": [
    {
      "id": "root__0",
      "offset": 0,
      "index": 0
    },
    {
      "id": "child1__1",
      "offset": 1,
      "index": 1
    },
    {
      "id": "child2__4",
      "offset": 2,
      "index": 4
    },
    {
      "id": "grandchild3__5",
      "offset": 3,
      "index": 5
    },
    {
      "id": "root2__6",
      "offset": 4,
      "index": 6
    }
  ],
  "3": [
    {
      "id": "root__0",
      "offset": 0,
      "index": 0
    },
    {
      "id": "child1__1",
      "offset": 1,
      "index": 1
    },
    {
      "id": "child2__4",
      "offset": 2,
      "index": 4
    },
    {
      "id": "grandchild3__5",
      "offset": 3,
      "index": 5
    },
    {
      "id": "root2__6",
      "offset": 4,
      "index": 6
    }
  ],
  "4": [
    {
      "id": "root__0",
      "offset": 0,
      "index": 0
    },
    {
      "id": "child1__1",
      "offset": 1,
      "index": 1
    },
    {
      "id": "grandchild3__5",
      "offset": 2,
      "index": 5
    },
    {
      "id": "root2__6",
      "offset": 3,
      "index": 6
    },
    {
      "id": "root__8",
      "offset": 4,
      "index": 8
    }
  ],
  "5": [
    {
      "id": "root__0",
      "offset": 0,
      "index": 0
    },
    {
      "id": "grandchild3__5",
      "offset": 1,
      "index": 5
    },
    {
      "id": "root2__6",
      "offset": 2,
      "index": 6
    },
    {
      "id": "root__8",
      "offset": 3,
      "index": 8
    },
    {
      "id": "child1__9",
      "offset": 4,
      "index": 9
    }
  ],
  "6": [
    {
      "id": "grandchild3__5",
      "offset": 0,
      "index": 5
    },
    {
      "id": "root2__6",
      "offset": 1,
      "index": 6
    },
    {
      "id": "root__8",
      "offset": 2,
      "index": 8
    },
    {
      "id": "child1__9",
      "offset": 3,
      "index": 9
    },
    {
      "id": "grandchild1__10",
      "offset": 4,
      "index": 10
    }
  ],
  "7": [
    {
      "id": "grandchild3__5",
      "offset": 0,
      "index": 5
    },
    {
      "id": "root__8",
      "offset": 1,
      "index": 8
    },
    {
      "id": "child1__9",
      "offset": 2,
      "index": 9
    },
    {
      "id": "grandchild1__10",
      "offset": 3,
      "index": 10
    },
    {
      "id": "grandchild2__11",
      "offset": 4,
      "index": 11
    }
  ],
  "8": [
    {
      "id": "grandchild3__5",
      "offset": 0,
      "index": 5
    },
    {
      "id": "root__8",
      "offset": 1,
      "index": 8
    },
    {
      "id": "child1__9",
      "offset": 2,
      "index": 9
    },
    {
      "id": "grandchild2__11",
      "offset": 3,
      "index": 11
    },
    {
      "id": "child2__12",
      "offset": 4,
      "index": 12
    }
  ],
  "9": [
    {
      "id": "root__8",
      "offset": 0,
      "index": 8
    },
    {
      "id": "child1__9",
      "offset": 1,
      "index": 9
    },
    {
      "id": "grandchild2__11",
      "offset": 2,
      "index": 11
    },
    {
      "id": "child2__12",
      "offset": 3,
      "index": 12
    },
    {
      "id": "grandchild3__13",
      "offset": 4,
      "index": 13
    }
  ],
  "10": [
    {
      "id": "root__8",
      "offset": 0,
      "index": 8
    },
    {
      "id": "child1__9",
      "offset": 1,
      "index": 9
    },
    {
      "id": "child2__12",
      "offset": 2,
      "index": 12
    },
    {
      "id": "grandchild3__13",
      "offset": 3,
      "index": 13
    },
    {
      "id": "root2__14",
      "offset": 4,
      "index": 14
    }
  ],
  "11": [
    {
      "id": "root__8",
      "offset": 0,
      "index": 8
    },
    {
      "id": "child1__9",
      "offset": 1,
      "index": 9
    },
    {
      "id": "child2__12",
      "offset": 2,
      "index": 12
    },
    {
      "id": "grandchild3__13",
      "offset": 3,
      "index": 13
    },
    {
      "id": "root2__14",
      "offset": 4,
      "index": 14
    }
  ],
  "12": [
    {
      "id": "root__8",
      "offset": 0,
      "index": 8
    },
    {
      "id": "child1__9",
      "offset": 1,
      "index": 9
    },
    {
      "id": "grandchild3__13",
      "offset": 2,
      "index": 13
    },
    {
      "id": "root2__14",
      "offset": 3,
      "index": 14
    },
    {
      "id": "root__16",
      "offset": 4,
      "index": 16
    }
  ],
  "13": [
    {
      "id": "root__8",
      "offset": 0,
      "index": 8
    },
    {
      "id": "grandchild3__13",
      "offset": 1,
      "index": 13
    },
    {
      "id": "root2__14",
      "offset": 2,
      "index": 14
    },
    {
      "id": "root__16",
      "offset": 3,
      "index": 16
    },
    {
      "id": "child1__17",
      "offset": 4,
      "index": 17
    }
  ],
  "14": [
    {
      "id": "grandchild3__13",
      "offset": 0,
      "index": 13
    },
    {
      "id": "root2__14",
      "offset": 1,
      "index": 14
    },
    {
      "id": "root__16",
      "offset": 2,
      "index": 16
    },
    {
      "id": "child1__17",
      "offset": 3,
      "index": 17
    },
    {
      "id": "grandchild1__18",
      "offset": 4,
      "index": 18
    }
  ],
  "15": [
    {
      "id": "grandchild3__13",
      "offset": 0,
      "index": 13
    },
    {
      "id": "root__16",
      "offset": 1,
      "index": 16
    },
    {
      "id": "child1__17",
      "offset": 2,
      "index": 17
    },
    {
      "id": "grandchild1__18",
      "offset": 3,
      "index": 18
    },
    {
      "id": "grandchild2__19",
      "offset": 4,
      "index": 19
    }
  ],
  "16": [
    {
      "id": "grandchild3__13",
      "offset": 0,
      "index": 13
    },
    {
      "id": "root__16",
      "offset": 1,
      "index": 16
    },
    {
      "id": "child1__17",
      "offset": 2,
      "index": 17
    },
    {
      "id": "grandchild2__19",
      "offset": 3,
      "index": 19
    },
    {
      "id": "child2__20",
      "offset": 4,
      "index": 20
    }
  ]
  };

  it('matches locked behavior', () => {
    for (const [posStr, expectedItems] of Object.entries(lockData)) {
        const pos = parseInt(posStr, 10);
        const items = strategy.getItemsAtPosition(pos, 5);
        const itemsSimple = items.map(item => ({
            id: item.id,
            offset: item.offset,
            index: item.index
        }));
        expect(itemsSimple).toEqual(expectedItems);
    }
  });
});
