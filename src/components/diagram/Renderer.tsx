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
          case 'connector':
             // @ts-ignore
            return <RenderConnector key={renderable.id} renderable={renderable as any} />;
          default:
            return null;
        }
      })}
    </Group>
  );
};

// Component for rendering connectors
import { Line, Arc } from 'react-konva';
const RenderConnector: React.FC<{ renderable: any }> = ({ renderable }) => {
    // Flatten points [[x1,y1], [x2,y2]] -> [x1,y1, x2,y2]
    const points = renderable.points.flat();
    const [x1, y1, x2, y2] = points;
    
    // Calculate angle for symbols
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    const renderSymbol = (symbol: string | undefined, x: number, y: number, rotation: number) => {
        if (!symbol) return null;
        
        switch (symbol) {
            case 'arrow':
                return (
                    <Line
                        points={[-10, -5, 0, 0, -10, 5]}
                        stroke={renderable.color}
                        strokeWidth={renderable.lineWidth}
                        fill={renderable.color}
                        closed
                        x={x}
                        y={y}
                        rotation={rotation}
                    />
                );
            case 'ball':
                return (
                    <Group x={x} y={y} rotation={rotation}>
                        <Line points={[0, 0, -8, 0]} stroke={renderable.color} strokeWidth={renderable.lineWidth} />
                        <Arc
                            innerRadius={0}
                            outerRadius={6}
                            angle={360}
                            fill={renderable.symbolBgColor || '#fff'}
                            stroke={renderable.color}
                            strokeWidth={renderable.lineWidth}
                            x={-14}
                        />
                    </Group>
                );
            case 'socket-left':
                 return (
                    <Group x={x} y={y} rotation={rotation}>
                        <Line points={[0, 0, -5, 0]} stroke={renderable.color} strokeWidth={renderable.lineWidth} />
                        <Arc
                            innerRadius={0}
                            outerRadius={8}
                            angle={180}
                            rotation={90}
                            stroke={renderable.color}
                            strokeWidth={renderable.lineWidth}
                            x={-5}
                        />
                    </Group>
                 );
             case 'socket-right': // Actually socket facing the other way?
                 return (
                    <Group x={x} y={y} rotation={rotation}>
                        <Line points={[0, 0, -5, 0]} stroke={renderable.color} strokeWidth={renderable.lineWidth} />
                        <Arc
                            innerRadius={0}
                            outerRadius={8}
                            angle={180}
                            rotation={-90}
                            stroke={renderable.color}
                            strokeWidth={renderable.lineWidth}
                            x={-5}
                        />
                    </Group>
                 );
            default:
                return null;
        }
    };
    
    // Calculate line adjustments
    let startOffset = 0;
    let endOffset = 0;

    if (renderable.symbolLeft === 'ball') startOffset = 20; // Stem 8 + Center 6 + Radius 6
    if (renderable.symbolRight === 'ball') endOffset = 20;
    
    if (renderable.symbolLeft && renderable.symbolLeft.startsWith('socket')) startOffset = 13; // Stem 5 + Radius 8
    if (renderable.symbolRight && renderable.symbolRight.startsWith('socket')) endOffset = 13;
    
    // Adjust points
    // P_new = P_old + dir * offset
    const len = Math.sqrt(dx*dx + dy*dy);
    const ux = dx / len; // Unit vector
    const uy = dy / len;
    
    const lineX1 = x1 + ux * startOffset;
    const lineY1 = y1 + uy * startOffset;
    const lineX2 = x2 - ux * endOffset;
    const lineY2 = y2 - uy * endOffset;

    return (
        <Group>
             {/* Main connector line */}
            <Line
                points={[lineX1, lineY1, lineX2, lineY2]}
                stroke={renderable.color}
                strokeWidth={renderable.lineWidth}
                dash={renderable.dashed ? [renderable.dashSize || 5, renderable.dashSize || 5] : undefined}
                hitStrokeWidth={10} 
            />
            
            {/* Start Symbol - Rendered at original X1, Y1 */}
            {renderable.symbolLeft && renderSymbol(renderable.symbolLeft, x1, y1, angle + 180)}
            
            {/* End Symbol - Rendered at original X2, Y2 */}
            {renderable.symbolRight && renderSymbol(renderable.symbolRight, x2, y2, angle)}
            
            {renderable.label && (
                <Text 
                    x={(x1 + x2)/2}
                    y={(y1 + y2)/2}
                    text={renderable.label}
                    fill={renderable.labelColor}
                    fontSize={12}
                    align="center"
                    offsetY={15}
                    offsetX={renderable.label.length * 3} 
                />
            )}
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
