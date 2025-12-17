import type { RenderStack, Renderable, RectangleRenderable, TextRenderable, PortRenderable, BookIconRenderable, ConnectorRenderable, LineConnectorRenderable, BallConnectorRenderable, SocketConnectorRenderable } from '../types/renderables';
import type { AtomicRenderStack, AtomicRenderable, AtomicGroup, AtomicRect, AtomicText, AtomicLine, AtomicArc } from '../types/atomic';

export function flattenToAtomicStack(stack: RenderStack): AtomicRenderStack {
  return stack.map(convertRenderable);
}

function convertRenderable(renderable: Renderable): AtomicRenderable {
  switch (renderable.type) {
    case 'rectangle':
      return convertRectangle(renderable as RectangleRenderable);
    case 'text':
      return convertText(renderable as TextRenderable);
    case 'port':
      return convertPort(renderable as PortRenderable);
    case 'book-icon':
      return convertBookIcon(renderable as BookIconRenderable);
    case 'connector':
      return convertConnector(renderable as ConnectorRenderable);
    default:
      // Fallback for unknown types if any, effectively "empty" or handle error
      // Ideally type system prevents this
      return { id: 'unknown', type: 'group', children: [] }; 
  }
}

function convertRectangle(rect: RectangleRenderable): AtomicRect {
  // Center to Top-Left conversion for Konva Rect? 
  // Renderer.tsx used: x={renderable.x - renderable.width / 2}
  // So AtomicRect x/y should probably be top-left to match standard Konva Rect behavior, 
  // OR we keep center and apply offset in Renderer?
  // Let's standardise on Top-Left for AtomicRect to make it "atomic" and dumb.
  
  return {
    id: rect.id,
    type: 'rect',
    x: rect.x - rect.width / 2,
    y: rect.y - rect.height / 2,
    width: rect.width,
    height: rect.height,
    fill: rect.fillColor,
    stroke: rect.strokeColor,
    strokeWidth: 1,
    opacity: rect.opacity,
    draggable: rect.isDraggable,
    nodeId: rect.nodeId
  };
}

function convertText(text: TextRenderable): AtomicText {
  // Keep original logic for alignment estimation from Renderer.tsx
  let width: number | undefined = undefined;
  let offsetX = 0;
  let offsetY = 0;

  if (text.anchorX === 'center') {
    width = text.content.length * text.fontSize * 0.6;
    offsetX = width / 2;
  } else if (text.anchorX === 'right') {
    width = text.content.length * text.fontSize * 0.6;
    offsetX = width;
  }

  if (text.anchorY === 'middle') {
    offsetY = text.fontSize / 2;
  } else if (text.anchorY === 'bottom') {
    offsetY = text.fontSize;
  }

  return {
    id: text.id,
    type: 'text',
    x: text.x,
    y: text.y,
    text: text.content,
    fontSize: text.fontSize,
    fill: text.color,
    width,
    offset: { x: offsetX, y: offsetY }
  };
}

function convertPort(port: PortRenderable): AtomicGroup {
  // Group of Rect + Optional Text
  const children: AtomicRenderable[] = [];

  const rect: AtomicRect = {
    id: `${port.id}-rect`,
    type: 'rect',
    x: port.x - port.size / 2,
    y: port.y - port.size / 2,
    width: port.size,
    height: port.size,
    fill: port.color,
    stroke: port.strokeColor,
    strokeWidth: 1
  };
  children.push(rect);

  if (port.label) {
    const text: AtomicText = {
      id: `${port.id}-label`,
      type: 'text',
      x: port.x,
      y: port.y + port.size / 2 + 4,
      text: port.label,
      fontSize: 10,
      fill: port.strokeColor,
      align: 'center',
      offset: { x: 0, y: 0 } 
    };
    children.push(text);
  }

  return {
    id: port.id,
    type: 'group',
    children
  };
}

function convertBookIcon(icon: BookIconRenderable): AtomicGroup {
  const children: AtomicRenderable[] = [];

  // Main book cover
  children.push({
    id: `${icon.id}-cover`,
    type: 'rect',
    x: icon.x - 7,
    y: icon.y - 9,
    width: 14,
    height: 18,
    fill: icon.color,
    stroke: icon.strokeColor,
    strokeWidth: 1
  });

  // Binding 1
  children.push({
    id: `${icon.id}-bind1`,
    type: 'rect',
    x: icon.x - 7 - 3,
    y: icon.y - 9 + 3,
    width: 3,
    height: 6,
    fill: icon.color,
    stroke: icon.strokeColor,
    strokeWidth: 1
  });

  // Binding 2
  children.push({
    id: `${icon.id}-bind2`,
    type: 'rect',
    x: icon.x - 7 - 3,
    y: icon.y - 9 + 12,
    width: 3,
    height: 6,
    fill: icon.color,
    stroke: icon.strokeColor,
    strokeWidth: 1
  });

  return {
    id: icon.id,
    type: 'group',
    children
  };
}

// Helper for arrow symbol length (only arrows are used now)
const getArrowLength = (): number => {
    return 10;
};

const addSymbol = (conn: ConnectorRenderable, children: AtomicRenderable[], symbol: string, x: number, y: number, rotation: number, suffix: string) => {
    const groupId = `${conn.id}-${suffix}`;
    const groupChildren: AtomicRenderable[] = [];

    switch (symbol) {
        case 'arrow': // Standard arrow
            groupChildren.push({
                id: `${groupId}-arrow`,
                type: 'line',
                points: [0, 0, -10, -5, -10, 5],
                stroke: conn.color,
                strokeWidth: conn.lineWidth,
                fill: conn.color,
                closed: true,
                offsetX: -10 // Shift so tip is at 0
            });
            break;
        case 'ball':
            // Circle: Center at 6, Radius 6. (Touches 0).
            groupChildren.push({
                id: `${groupId}-circle`,
                type: 'circle',
                x: 6,
                y: 0,
                radius: 6,
                fill: '#fff',
                stroke: conn.color,
                strokeWidth: conn.lineWidth
            });
            break;
        case 'socket-left': // '-(', Opens Right
            // Arc: Center at 10, Radius 10.
            // Bulge Left (at 0), Open Right (at 10).
            groupChildren.push({
                id: `${groupId}-arc`,
                type: 'arc',
                x: 10,
                y: 0,
                innerRadius: 10,
                outerRadius: 10,
                rotation: 90, 
                angle: 180,
                stroke: conn.color,
                strokeWidth: conn.lineWidth
            });
            break;
         case 'socket-right': // '-)', Opens Left
             // Arc: Center at 10, Radius 10.
             // Bulge Right (at 0? No, Bulge relative to center).
             // Back (Left side) at 0? 
             // socket-right = )
             // Back is Vertical line? No. )
             // Left side is Tips.
             // Right side is Bulge.
             // If connection point is 0. Tips at 0. Bulge at 10.
             // Center at 0. Radius 10. Rotation -90.
             groupChildren.push({
                id: `${groupId}-arc`,
                type: 'arc',
                x: 0,
                y: 0,
                innerRadius: 10,
                outerRadius: 10,
                rotation: -90, 
                angle: 180,
                stroke: conn.color,
                strokeWidth: conn.lineWidth
             });
             break;
    }
    
    if (groupChildren.length > 0) {
      children.push({
          id: groupId,
          type: 'group',
          x,
          y,
          rotation,
          children: groupChildren
      });
    }
};

// Old connector conversion functions removed - now using simple chained connectors

function convertConnector(conn: ConnectorRenderable): AtomicGroup {
  const children: AtomicRenderable[] = [];
  
  if (conn.connectorType === 'line') {
      // Line connector - simple line with optional arrow and label
      const lineConn = conn as LineConnectorRenderable;
      const points = lineConn.points.flat();
      const [x1, y1, x2, y2] = points;
      
      const dx = x2 - x1;
      const dy = y2 - y1;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      // Draw the line
      children.push({
          id: `${conn.id}-line`,
          type: 'line',
          points: [x1, y1, x2, y2],
          stroke: conn.color,
          strokeWidth: conn.lineWidth,
          dash: lineConn.dashed ? [lineConn.dashSize || 5, lineConn.dashSize || 5] : undefined,
          hitStrokeWidth: 10
      });
      
      // Add arrow at start if needed
      if (lineConn.arrowStart) {
          addSymbol(lineConn as any, children, 'arrow', x1, y1, angle + 180, 'start');
      }
      
      // Add arrow at end if needed
      if (lineConn.arrowEnd) {
          addSymbol(lineConn as any, children, 'arrow', x2, y2, angle, 'end');
      }
      
      // Add label if present
      if (lineConn.label) {
          children.push({
              id: `${conn.id}-label`,
              type: 'text',
              x: (x1 + x2) / 2,
              y: (y1 + y2) / 2,
              text: lineConn.label,
              fill: lineConn.labelColor || '#000',
              fontSize: 12,
              align: 'center',
              offset: { x: 0, y: 0 }
          });
      }
  } else if (conn.connectorType === 'ball') {
      // Ball connector - just draw a ball symbol
      const ballConn = conn as BallConnectorRenderable;
      children.push({
          id: `${conn.id}-circle`,
          type: 'circle',
          x: ballConn.x,
          y: ballConn.y,
          radius: ballConn.radius,
          fill: ballConn.fillColor,
          stroke: conn.color,
          strokeWidth: conn.lineWidth
      });
  } else if (conn.connectorType === 'socket') {
      // Socket connector - draw a socket (arc)
      const socketConn = conn as SocketConnectorRenderable;
      children.push({
          id: `${conn.id}-arc`,
          type: 'arc',
          x: socketConn.x,
          y: socketConn.y,
          innerRadius: socketConn.radius,
          outerRadius: socketConn.radius,
          rotation: socketConn.angle + (socketConn.direction === 'left' ? 90 : -90),
          angle: 180,
          stroke: conn.color,
          strokeWidth: conn.lineWidth
      });
  }

  return {
    id: conn.id,
    type: 'group',
    children
  };
}
