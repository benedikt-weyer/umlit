import React, { useState } from 'react';
import { Text, Rect, Group } from 'react-konva';
import type { RenderStack, RectangleRenderable, TextRenderable, PortRenderable, BookIconRenderable } from '../../types/renderables';

interface RendererProps {
  renderStack: RenderStack;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
}

export const Renderer: React.FC<RendererProps> = ({ renderStack, onNodeDrag }) => {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  return (
    <Group>
      {renderStack.map((renderable) => {
        switch (renderable.type) {
          case 'rectangle':
            return (
              <RenderRectangle
                key={renderable.id}
                renderable={renderable as RectangleRenderable}
                onNodeDrag={onNodeDrag}
                draggingNodeId={draggingNodeId}
                setDraggingNodeId={setDraggingNodeId}
              />
            );
          case 'text':
            return <RenderText key={renderable.id} renderable={renderable as TextRenderable} />;
          case 'port':
            return <RenderPort key={renderable.id} renderable={renderable as PortRenderable} />;
          case 'book-icon':
            return <RenderBookIcon key={renderable.id} renderable={renderable as BookIconRenderable} />;
          default:
            return null;
        }
      })}
    </Group>
  );
};

// Component for rendering rectangles
const RenderRectangle: React.FC<{
  renderable: RectangleRenderable;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
  draggingNodeId: string | null;
  setDraggingNodeId: (id: string | null) => void;
}> = ({ renderable, onNodeDrag, draggingNodeId, setDraggingNodeId }) => {
  return (
    <Rect
      x={renderable.x - renderable.width / 2}
      y={renderable.y - renderable.height / 2}
      width={renderable.width}
      height={renderable.height}
      fill={renderable.fillColor}
      stroke={renderable.strokeColor}
      strokeWidth={1}
      opacity={renderable.opacity}
      draggable={renderable.isDraggable}
      onDragStart={() => {
        if (renderable.isDraggable) {
          setDraggingNodeId(renderable.nodeId || '');
        }
      }}
      onDragMove={(e) => {
        if (renderable.isDraggable && draggingNodeId === renderable.nodeId) {
          const newX = Math.round(e.target.x() + renderable.width / 2);
          const newY = Math.round(e.target.y() + renderable.height / 2);
          onNodeDrag(renderable.nodeId || '', newX, newY);
        }
      }}
      onDragEnd={() => {
        setDraggingNodeId(null);
      }}
    />
  );
};

// Component for rendering text
const RenderText: React.FC<{ renderable: TextRenderable }> = ({ renderable }) => {
  // Konva Text uses offsetX/offsetY differently than Three.js
  // For center alignment, we need to set width and use offsetX
  let width: number | undefined = undefined;
  let offsetX = 0;
  let offsetY = 0;

  // Handle horizontal alignment
  if (renderable.anchorX === 'center') {
    // Estimate text width (rough approximation)
    width = renderable.content.length * renderable.fontSize * 0.6;
    offsetX = width / 2;
  } else if (renderable.anchorX === 'right') {
    width = renderable.content.length * renderable.fontSize * 0.6;
    offsetX = width;
  }

  // Handle vertical alignment
  if (renderable.anchorY === 'middle') {
    offsetY = renderable.fontSize / 2;
  } else if (renderable.anchorY === 'bottom') {
    offsetY = renderable.fontSize;
  }

  return (
    <Text
      x={renderable.x}
      y={renderable.y}
      text={renderable.content}
      fontSize={renderable.fontSize}
      fill={renderable.color}
      width={width}
      offsetX={offsetX}
      offsetY={offsetY}
    />
  );
};

// Component for rendering ports
const RenderPort: React.FC<{ renderable: PortRenderable }> = ({ renderable }) => {
  return (
    <Group>
      <Rect
        x={renderable.x - renderable.size / 2}
        y={renderable.y - renderable.size / 2}
        width={renderable.size}
        height={renderable.size}
        fill={renderable.color}
        stroke={renderable.strokeColor}
        strokeWidth={1}
      />
      {renderable.label && (
        <Text
          x={renderable.x}
          y={renderable.y + renderable.size / 2 + 4}
          text={renderable.label}
          fontSize={10}
          fill={renderable.strokeColor}
          align="center"
          offsetX={0}
        />
      )}
    </Group>
  );
};

// Component for rendering book icon
const RenderBookIcon: React.FC<{ renderable: BookIconRenderable }> = ({ renderable }) => {
  return (
    <Group>
      {/* Main book cover */}
      <Rect
        x={renderable.x - 7}
        y={renderable.y - 9}
        width={14}
        height={18}
        fill={renderable.color}
        stroke={renderable.strokeColor}
        strokeWidth={1}
      />
      
      {/* Binding rectangle 1 (top) */}
      <Rect
        x={renderable.x - 7 - 3}
        y={renderable.y - 9 + 3}
        width={3}
        height={6}
        fill={renderable.color}
        stroke={renderable.strokeColor}
        strokeWidth={1}
      />
      
      {/* Binding rectangle 2 (bottom) */}
      <Rect
        x={renderable.x - 7 - 3}
        y={renderable.y - 9 + 12}
        width={3}
        height={6}
        fill={renderable.color}
        stroke={renderable.strokeColor}
        strokeWidth={1}
      />
    </Group>
  );
};
