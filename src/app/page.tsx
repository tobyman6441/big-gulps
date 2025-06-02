'use client';

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import Card from "./components/Card";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import ConnectorLines from "./components/ConnectorLines";

interface CardData {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  assignee?: string;
  children?: CardData[];
}

export default function Home() {
  const [cards, setCards] = useState<CardData[]>([
    {
      id: "1",
      title: "Sample Goal",
      description: "This is a sample goal card. You can expand to see more details.",
      tags: ["Personal", "2024"],
      assignee: "Jamie",
      children: [],
    },
  ]);
  const [expandedColumns, setExpandedColumns] = useState<{ [id: string]: boolean }>({});
  const [subCardOrder, setSubCardOrder] = useState<{ [parentId: string]: string[] }>({});
  const [debugMode, setDebugMode] = useState(false);
  const [columnOrder, setColumnOrder] = useState<{ [colIdx: number]: string[] }>({});
  const [globalSortOrder, setGlobalSortOrder] = useState<{ [colIdx: number]: string[] }>({});
  const [globalSubCardOrder, setGlobalSubCardOrder] = useState<string[]>([]);

  // Track refs for each card
  const cardRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});
  const [cardPositions, setCardPositions] = useState<{ [id: string]: { x: number; y: number; width: number; height: number } }>({});

  const boardRef = useRef<HTMLDivElement | null>(null);
  const [boardRect, setBoardRect] = useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });

  // Track the parent ID of the card being dragged
  const dragParentId = useRef<string | null>(null);

  // Helper to measure positions
  function measurePositions() {
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setBoardRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    const newPositions: { [id: string]: { x: number; y: number; width: number; height: number } } = {};
    Object.entries(cardRefs.current).forEach(([id, ref]) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        newPositions[id] = {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }
    });
    setCardPositions(newPositions);
  }

  // Update card positions and board rect after render and on resize
  useLayoutEffect(() => {
    measurePositions();
    function handleResize() {
      measurePositions();
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [cards, expandedColumns, subCardOrder]);

  // Force measurement after every render
  useEffect(() => {
    setTimeout(measurePositions, 0);
  });

  const addCard = () => {
    const newId = (Date.now() + Math.random()).toString();
    setCards([
      ...cards,
      {
        id: newId,
        title: `New Goal`,
        description: "Describe your goal...",
        tags: [],
        assignee: "",
        children: [],
      },
    ]);
  };

  const addSubCard = (parentId: string) => {
    const newId = (Date.now() + Math.random()).toString();
    const addToTree = (nodes: CardData[]): CardData[] =>
      nodes.map(node =>
        node.id === parentId
          ? {
              ...node,
              children: [
                ...(node.children || []),
                {
                  id: newId,
                  title: `New Sub-Goal`,
                  description: "Describe your sub-goal...",
                  tags: [],
                  assignee: "",
                  children: [],
                },
              ],
            }
          : { ...node, children: node.children ? addToTree(node.children) : node.children }
      );
    setCards(cards => addToTree(cards));
    setExpandedColumns(cols => ({ ...cols, [parentId]: true }));
    setSubCardOrder(prev => {
      const prevOrder = prev[parentId] || [];
      return {
        ...prev,
        [parentId]: [...prevOrder, newId],
      };
    });
    setGlobalSubCardOrder(prev => [...prev, newId]);
  };

  const editCard = (id: string, data: { title: string; description?: string; tags?: string[]; assignee?: string }) => {
    const updateTree = (nodes: CardData[]): CardData[] =>
      nodes.map(node =>
        node.id === id
          ? { ...node, ...data }
          : { ...node, children: node.children ? updateTree(node.children) : [] }
      );
    setCards(cards => updateTree(cards));
  };

  const deleteCard = (id: string) => {
    const removeFromTree = (nodes: CardData[]): CardData[] =>
      nodes
        .filter(node => node.id !== id)
        .map(node => ({
          ...node,
          children: node.children ? removeFromTree(node.children) : [],
        }));
    setCards(cards => removeFromTree(cards));
  };

  function getOrderedChildren(parent: CardData): CardData[] {
    if (!parent.children) return [];
    const order = subCardOrder[parent.id];
    if (!order) return parent.children;
    const idToChild: { [id: string]: CardData } = {};
    parent.children.forEach(child => { idToChild[child.id] = child; });
    const ordered = order.map(id => idToChild[id]).filter(Boolean);
    const missing = parent.children.filter(child => !order.includes(child.id));
    return [...ordered, ...missing];
  }

  function buildColumns(levelCards: CardData[], expandedColumns: { [id: string]: boolean }): CardData[][] {
    const columns: CardData[][] = [];
    columns.push(levelCards);
    let nextLevel: CardData[] = [];
    levelCards.forEach(card => {
      if (expandedColumns[card.id] && card.children && card.children.length > 0) {
        nextLevel.push(...getOrderedChildren(card));
      }
    });
    if (nextLevel.length > 0) {
      // Use globalSubCardOrder for the next level (sub-cards)
      let orderedNextLevel = nextLevel;
      if (globalSubCardOrder.length > 0) {
        const idToCard: { [id: string]: CardData } = {};
        nextLevel.forEach(card => { idToCard[card.id] = card; });
        orderedNextLevel = globalSubCardOrder.map(id => idToCard[id]).filter(Boolean);
        // Add any missing cards (e.g., new ones)
        const missing = nextLevel.filter(card => !globalSubCardOrder.includes(card.id));
        orderedNextLevel = [...orderedNextLevel, ...missing];
      }
      columns.push(orderedNextLevel);
      // Recursively build further columns if needed
      const subColumns = buildColumns(orderedNextLevel, expandedColumns);
      for (let i = 1; i < subColumns.length; i++) {
        if (columns[i + 1]) {
          columns[i + 1] = [...columns[i + 1], ...subColumns[i]];
        } else {
          columns[i + 1] = subColumns[i];
        }
      }
    }
    return columns;
  }

  function removeCardFromTree(nodes: CardData[], cardId: string): [CardData | null, CardData[]] {
    let removed: CardData | null = null;
    const newNodes = nodes
      .map(node => {
        if (node.id === cardId) {
          removed = node;
          return null;
        }
        if (node.children) {
          const [childRemoved, newChildren] = removeCardFromTree(node.children, cardId);
          if (childRemoved) removed = childRemoved;
          return { ...node, children: newChildren };
        }
        return node;
      })
      .filter(Boolean) as CardData[];
    return [removed, newNodes];
  }

  function insertCardToTree(nodes: CardData[], card: CardData, parentId: string | null, index: number): CardData[] {
    if (parentId === null) {
      const newNodes = [...nodes];
      newNodes.splice(index, 0, card);
      return newNodes;
    }
    return nodes.map(node =>
      node.id === parentId
        ? {
            ...node,
            children: node.children
              ? [
                  ...node.children.slice(0, index),
                  card,
                  ...node.children.slice(index),
                ]
              : [card],
          }
        : { ...node, children: node.children ? insertCardToTree(node.children, card, parentId, index) : node.children }
    );
  }

  // Helper to find parent ID of a card
  function findParentId(nodes: CardData[], childId: string, parentId: string | null = null): string | null {
    for (const node of nodes) {
      if (node.id === childId) return parentId;
      if (node.children) {
        const found = findParentId(node.children, childId, node.id);
        if (found) return found;
      }
    }
    return null;
  }

  // Helper to handle drag start
  function onDragStart(start: any) {
    const sourceColIdx = parseInt(start.source.droppableId.replace('column-', ''));
    const sourceIdx = start.source.index;
    const columnsData = buildColumns(cards, expandedColumns);
    const card = columnsData[sourceColIdx][sourceIdx];
    dragParentId.current = findParentId(cards, card.id);
    console.log('Drag start:', { cardId: card.id, parentId: dragParentId.current });
  }

  // Helper to handle drag end
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceColIdx = parseInt(result.source.droppableId.replace('column-', ''));
    const destColIdx = parseInt(result.destination.droppableId.replace('column-', ''));
    const sourceIdx = result.source.index;
    const destIdx = result.destination.index;
    // If dragging within the parent card column (column 0), reorder the top-level cards array
    if (sourceColIdx === 0 && destColIdx === 0) {
      setCards(prevCards => {
        const newCards = [...prevCards];
        const [removed] = newCards.splice(sourceIdx, 1);
        newCards.splice(destIdx, 0, removed);
        return newCards;
      });
      setTimeout(() => {
        measurePositions();
      }, 50);
      return;
    }
    // Allow reordering in any column (sub-cards)
    if (sourceColIdx !== destColIdx) return;
    const columnsData = buildColumns(cards, expandedColumns);
    const subCards = columnsData[sourceColIdx];
    const movedCardId = subCards[sourceIdx].id;
    // Update globalSubCardOrder
    setGlobalSubCardOrder(prev => {
      const order = prev.length ? [...prev] : subCards.map(card => card.id);
      const [removed] = order.splice(sourceIdx, 1);
      order.splice(destIdx, 0, removed);
      return order;
    });
    // Update subCardOrder for the old and new parent
    setSubCardOrder(prev => {
      const newOrder = { ...prev };
      // Find old parent
      const oldParentId = findParentId(cards, movedCardId);
      // Find new parent
      let newParentId = null;
      if (destIdx >= subCards.length) {
        // Dropped at the end: use the parent of the last card, or keep old parent if only one card
        newParentId = subCards.length > 0 ? findParentId(cards, subCards[subCards.length - 1].id) : oldParentId;
      } else {
        newParentId = findParentId(cards, subCards[destIdx].id);
      }
      // Remove from old parent's order
      if (oldParentId && newOrder[oldParentId]) {
        newOrder[oldParentId] = newOrder[oldParentId].filter(id => id !== movedCardId);
      }
      // Insert into new parent's order at the correct position
      if (newParentId) {
        // Get the new parent's sub-card order (excluding the moved card)
        let siblings = (newOrder[newParentId] || []).filter(id => id !== movedCardId);
        // Find the index to insert at, among siblings
        let insertIdx = siblings.length; // default to end
        // Find the sibling in the new parent's order that is at destIdx in the column
        let count = 0;
        for (let i = 0; i < subCards.length; i++) {
          if (findParentId(cards, subCards[i].id) === newParentId) {
            if (i === destIdx) {
              insertIdx = count;
              break;
            }
            count++;
          }
        }
        siblings.splice(insertIdx, 0, movedCardId);
        newOrder[newParentId] = siblings;
      }
      return newOrder;
    });
    setTimeout(() => {
      measurePositions();
    }, 50);
  };

  const columns = buildColumns(cards, expandedColumns);

  // Helper to get anchor points relative to board
  function getAnchor(cardId: string, type: 'source' | 'target') {
    const pos = cardPositions[cardId];
    if (!pos || pos.width === 0 || pos.height === 0) return { x: 0, y: 0 };
    const relX = pos.x - boardRect.x;
    const relY = pos.y - boardRect.y;
    const anchorY = relY + pos.height / 2;
    let anchor;
    if (type === 'source') {
      anchor = { x: relX + pos.width - 12, y: anchorY - 12 };
    } else {
      anchor = { x: relX, y: anchorY - 12 };
    }
    if (debugMode) {
      console.log(`Anchor for card ${cardId} (${type}):`, anchor);
    }
    return anchor;
  }

  // Recursively generate connectors for all parent-child relationships
  function getConnectors(cards: CardData[]): any[] {
    let connectors: any[] = [];
    for (const card of cards) {
      if (card.children && card.children.length > 0) {
        for (const child of card.children) {
          const source = getAnchor(card.id, 'source');
          const target = getAnchor(child.id, 'target');
          // Only draw if both anchors are valid (not at 0,0)
          if ((source.x !== 0 || source.y !== 0) && (target.x !== 0 || target.y !== 0)) {
            const dx = target.x - source.x;
            const path = `M${source.x},${source.y} C${source.x + dx/2},${source.y} ${target.x - dx/2},${target.y} ${target.x},${target.y}`;
            connectors.push({
              id: `${card.id}->${child.id}`,
              sourceAnchor: { ...source, id: `${card.id}-source`, cardId: card.id, type: 'source' },
              targetAnchor: { ...target, id: `${child.id}-target`, cardId: child.id, type: 'target' },
              path,
            });
          }
          if (child.children && child.children.length > 0) {
            connectors = connectors.concat(getConnectors([child]));
          }
        }
      }
    }
    return connectors;
  }

  const connectors = getConnectors(cards);

  // Debug: Log positions before rendering connectors
  if (debugMode) {
    console.log('cardPositions', cardPositions);
    console.log('boardRect', boardRect);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-0 flex flex-col items-stretch w-full h-screen overflow-hidden">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white px-8 pt-8">Goal Board</h1>
      <button
        className="mb-2 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition ml-8"
        onClick={() => setDebugMode(d => !d)}
        style={{ alignSelf: 'flex-start' }}
      >
        {debugMode ? 'Disable Debug' : 'Enable Debug'}
      </button>
      <button
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition ml-8"
        onClick={addCard}
        style={{ alignSelf: 'flex-start' }}
      >
        + Add Card
      </button>
      <div
        className="flex-1 overflow-auto relative"
        style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
      >
        <div
          ref={boardRef}
          className="flex flex-row gap-8 items-start w-fit min-h-[400px] px-8 pb-8"
          style={{ minWidth: '100%', position: 'relative' }}
        >
          <ConnectorLines connectors={connectors} boardRect={boardRect} debug={debugMode} />
          {columns.map((col, colIdx) => {
            return (
              <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart} key={colIdx}>
                <Droppable droppableId={`column-${colIdx}`}>
                  {(provided) => (
                    <div
                      className="flex flex-col gap-4 min-w-[300px] relative"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {col.map((card, idx) => {
                        return (
                          <div key={card.id}>
                            <Draggable draggableId={card.id} index={idx} key={card.id}>
                              {(provided, snapshot) => (
                                <div
                                  ref={el => {
                                    provided.innerRef(el);
                                    cardRefs.current[card.id] = el;
                                  }}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.7 : 1,
                                  }}
                                >
                                  <Card
                                    cardId={card.id}
                                    title={card.title}
                                    description={card.description}
                                    tags={card.tags}
                                    assignee={card.assignee}
                                    onEdit={data => editCard(card.id, data)}
                                    onDelete={() => deleteCard(card.id)}
                                    debug={debugMode}
                                  />
                                  <div className="flex gap-2 mt-1 mb-2">
                                    <button
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                      onClick={() => addSubCard(card.id)}
                                    >
                                      + Add Sub-Card
                                    </button>
                                    {card.children && card.children.length > 0 && (
                                      <button
                                        className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200"
                                        onClick={() => {
                                          setExpandedColumns(cols => ({
                                            ...cols,
                                            [card.id]: !cols[card.id],
                                          }));
                                        }}
                                      >
                                        {expandedColumns[card.id] ? 'Hide Sub-Cards' : 'View Sub-Cards'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          </div>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            );
          })}
        </div>
      </div>
    </div>
  );
}
