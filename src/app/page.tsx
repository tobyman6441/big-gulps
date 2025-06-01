'use client';

import { useState } from "react";
import Card from "./components/Card";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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
      const subColumns = buildColumns(nextLevel, expandedColumns);
      for (let i = 0; i < subColumns.length; i++) {
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

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceColIdx = parseInt(result.source.droppableId.replace('column-', ''));
    const destColIdx = parseInt(result.destination.droppableId.replace('column-', ''));
    const sourceIdx = result.source.index;
    const destIdx = result.destination.index;
    const columnsData = buildColumns(cards, expandedColumns);
    const card = columnsData[sourceColIdx][sourceIdx];
    const [removedCard, treeWithout] = removeCardFromTree(cards, card.id);
    if (!removedCard) return;
    let parentId: string | null = null;
    let insertIndex = destIdx;
    let oldParentId: string | null = null;
    if (sourceColIdx > 0) {
      const prevCol = columnsData[sourceColIdx - 1];
      let parentCard = prevCol[prevCol.length - 1];
      if (sourceIdx < prevCol.length) {
        parentCard = prevCol[sourceIdx];
      }
      oldParentId = parentCard ? parentCard.id : null;
    }
    if (destColIdx > 0) {
      const prevCol = columnsData[destColIdx - 1];
      let parentCard = prevCol[prevCol.length - 1];
      if (destIdx < prevCol.length) {
        parentCard = prevCol[destIdx];
      }
      parentId = parentCard ? parentCard.id : null;
      insertIndex = destIdx;
      if (parentCard && parentCard.children) {
        insertIndex = Math.min(destIdx, parentCard.children.length);
      } else {
        insertIndex = 0;
      }
      setSubCardOrder(prev => {
        let newOrder = { ...prev };
        if (oldParentId && oldParentId !== parentId) {
          if (newOrder[oldParentId]) {
            newOrder[oldParentId] = newOrder[oldParentId].filter(id => id !== card.id);
          }
        }
        const currentOrder = newOrder[parentId!] || (parentCard.children ? parentCard.children.map(c => c.id) : []);
        const filtered = currentOrder.filter(id => id !== card.id);
        filtered.splice(insertIndex, 0, card.id);
        newOrder[parentId!] = filtered;
        return newOrder;
      });
    }
    const newTree = insertCardToTree(treeWithout, removedCard, parentId, insertIndex);
    setCards(newTree);
  };

  const columns = buildColumns(cards, expandedColumns);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-0 flex flex-col items-stretch w-full h-screen overflow-hidden">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white px-8 pt-8">Goal Board</h1>
      <button
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition ml-8"
        onClick={addCard}
        style={{ alignSelf: 'flex-start' }}
      >
        + Add Card
      </button>
      <div
        className="flex-1 overflow-auto"
        style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="flex flex-row gap-8 items-start w-fit min-h-[400px] px-8 pb-8"
          style={{ minWidth: '100%' }}
        >
          {columns.map((col, colIdx) => {
            return (
              <DragDropContext onDragEnd={onDragEnd} key={colIdx}>
                <Droppable droppableId={`column-${colIdx}`}>
                  {(provided) => (
                    <div
                      className="flex flex-col gap-4 min-w-[300px] relative"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {col.map((card, idx) => {
                        return (
                          <div
                            key={card.id}
                          >
                            <Draggable draggableId={card.id} index={idx} key={card.id}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.7 : 1,
                                  }}
                                >
                                  <Card
                                    title={card.title}
                                    description={card.description}
                                    tags={card.tags}
                                    assignee={card.assignee}
                                    onEdit={data => editCard(card.id, data)}
                                    onDelete={() => deleteCard(card.id)}
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
