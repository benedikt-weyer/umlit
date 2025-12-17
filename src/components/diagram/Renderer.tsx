import React, { useState } from 'react';
import { Text, Rect, Group, Line, Arc, Circle } from 'react-konva';
import type { AtomicRenderStack, AtomicRenderable, AtomicGroup, AtomicRect, AtomicText, AtomicLine, AtomicArc, AtomicCircle } from '../../types/atomic';

interface RendererProps {
  atomicRenderStack: AtomicRenderStack;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
}

export const Renderer: React.FC<RendererProps> = ({ atomicRenderStack, onNodeDrag }) => {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const renderAtomic = (item: AtomicRenderable) => {
    switch (item.type) {
      case 'group':
        const group = item as AtomicGroup;
        return (
           <Group 
              key={group.id} 
              x={group.x} 
              y={group.y} 
              rotation={group.rotation}
              opacity={group.opacity}
              scale={group.scale}
              draggable={group.draggable}
              onDragStart={() => {
                  if (group.draggable && group.nodeId) {
                      setDraggingNodeId(group.nodeId);
                  }
              }}
              onDragMove={(e) => {
                  if (group.draggable && group.nodeId && draggingNodeId === group.nodeId) {
                      // Konva gives absolute position of the group
                      // We need to pass center? 
                      // Wait, we need to map back to node coordinates.
                      // The group x/y IS the position we want to update usually?
                      // If the group represents a node, yes.
                      const newX = Math.round(e.target.x());
                      const newY = Math.round(e.target.y());
                      onNodeDrag(group.nodeId, newX, newY);
                  }
              }}
              onDragEnd={() => setDraggingNodeId(null)}
           >
             {group.children.map(child => renderAtomic(child))}
           </Group>
        );
      case 'rect':
        const rect = item as AtomicRect;
        return (
          <Rect
            key={rect.id}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill={rect.fill}
            stroke={rect.stroke}
            strokeWidth={rect.strokeWidth}
            cornerRadius={rect.cornerRadius}
            opacity={rect.opacity}
            draggable={rect.draggable}
            onDragStart={() => {
                if (rect.draggable && rect.nodeId) {
                    setDraggingNodeId(rect.nodeId);
                }
            }}
            onDragMove={(e) => {
                if (rect.draggable && rect.nodeId && draggingNodeId === rect.nodeId) {
                    // Rect x/y is Top-Left in Atomic Stack (converted in atomicStack.ts)
                    // Node position is usually Center in store?
                    // Let's check atomicStack.ts: 
                    // x: rect.x - rect.width / 2
                    // Meaning the atomic rect x is Top-Left.
                    // e.target.x() is the new Top-Left.
                    // We need to send Center back to store?
                    // Yes, store expects center.
                    const newX = Math.round(e.target.x() + rect.width / 2);
                    const newY = Math.round(e.target.y() + rect.height / 2);
                    onNodeDrag(rect.nodeId, newX, newY);
                }
            }}
            onDragEnd={() => setDraggingNodeId(null)}
          />
        );
      case 'text':
        const text = item as AtomicText;
        return (
          <Text
            key={text.id}
            x={text.x}
            y={text.y}
            text={text.text}
            fontSize={text.fontSize}
            fontFamily={text.fontFamily}
            fill={text.fill}
            width={text.width}
            align={text.align}
            offsetX={text.offset?.x}
            offsetY={text.offset?.y}
            opacity={text.opacity}
          />
        );
      case 'line':
        const line = item as AtomicLine;
        return (
          <Line
            key={line.id}
            points={line.points}
            stroke={line.stroke}
            strokeWidth={line.strokeWidth}
            dash={line.dash}
            closed={line.closed}
            fill={line.fill}
            hitStrokeWidth={line.hitStrokeWidth}
            opacity={line.opacity}
          />
        );
      case 'arc':
        const arc = item as AtomicArc;
        return (
          <Arc
            key={arc.id}
            x={arc.x}
            y={arc.y}
            innerRadius={arc.innerRadius}
            outerRadius={arc.outerRadius}
            angle={arc.angle}
            rotation={arc.rotation}
            fill={arc.fill}
            stroke={arc.stroke}
            strokeWidth={arc.strokeWidth}
            opacity={arc.opacity}
          />
        );
      case 'circle':
        const circle = item as AtomicCircle;
        return (
          <Circle
            key={circle.id}
            x={circle.x}
            y={circle.y}
            radius={circle.radius}
            fill={circle.fill}
            stroke={circle.stroke}
            strokeWidth={circle.strokeWidth}
            opacity={circle.opacity}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Group>
      {atomicRenderStack.map(renderAtomic)}
    </Group>
  );
};
