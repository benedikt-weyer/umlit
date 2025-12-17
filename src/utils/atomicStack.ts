import type { RenderStack, Renderable, RectangleRenderable, TextRenderable, PortRenderable, BookIconRenderable, ConnectorRenderable, InterfaceConnectorRenderable, DelegateConnectorRenderable, SimpleConnectorRenderable } from '../types/renderables';
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

// Helper for symbols
// Symbols are defined growing along positive X from (0,0).
// (0,0) is the connection point (where the line meets the symbol).
const getSymbolLength = (symbol?: string) => {
    if (!symbol) return 0;
    if (symbol === 'ball') return 6; // Center is 6. Back is 0. Distance 6 aligns center.
    if (symbol === 'socket-left') return 10; // 0..10 (Back 0, Open 10)
    if (symbol === 'socket-right') return 10; // 0..10 (Tips 0, Bulge 10)
    if (symbol === 'arrow') return 10;
    return 0;
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
                fill: (conn as InterfaceConnectorRenderable).symbolBgColor || '#fff',
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

function convertInterfaceConnector(conn: InterfaceConnectorRenderable, pointsConfig: {x1: number, y1: number, x2: number, y2: number, ux: number, uy: number, angle: number}): AtomicRenderable[] {
    const children: AtomicRenderable[] = [];
    const { x1, y1, x2, y2, ux, uy, angle } = pointsConfig;
    
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    
    const lenStart = getSymbolLength(conn.startSymbol);
    const lenEnd = getSymbolLength(conn.endSymbol);

    // Left Symbol (Start -> Mid)
    if (conn.startSymbol) {
       const sx = midX - ux * lenStart;
       const sy = midY - uy * lenStart;
       addSymbol(conn, children, conn.startSymbol, sx, sy, angle, 'start');
       
       // Line 1: Start -> Symbol Origin (sx)
       children.push({
          id: `${conn.id}-line-1`,
          type: 'line',
          points: [x1, y1, sx, sy],
          stroke: conn.color,
          strokeWidth: conn.lineWidth
      });
    } else {
       children.push({
          id: `${conn.id}-line-1`,
          type: 'line',
          points: [x1, y1, midX, midY],
          stroke: conn.color,
          strokeWidth: conn.lineWidth
      });
    }
    
    // Right Symbol (End -> Mid)
    if (conn.endSymbol) {
        const sx = midX + ux * lenEnd;
        const sy = midY + uy * lenEnd;
        addSymbol(conn, children, conn.endSymbol, sx, sy, angle + 180, 'end');
        
        // Line 2: Symbol Origin (sx) -> End
        children.push({
            id: `${conn.id}-line-2`,
            type: 'line',
            points: [sx, sy, x2, y2],
            stroke: conn.color,
            strokeWidth: conn.lineWidth
        });
    } else {
        children.push({
            id: `${conn.id}-line-2`,
            type: 'line',
            points: [midX, midY, x2, y2],
            stroke: conn.color,
            strokeWidth: conn.lineWidth
        });
    }
    return children;
}

function convertDelegateConnector(conn: DelegateConnectorRenderable, pointsConfig: {x1: number, y1: number, x2: number, y2: number, ux: number, uy: number, angle: number}): AtomicRenderable[] {
    const children: AtomicRenderable[] = [];
    const { x1, y1, x2, y2, ux, uy, angle } = pointsConfig;

    const lenEnd = getSymbolLength(conn.symbolEnd);
    
    const lineX2 = x2 - ux * lenEnd;
    const lineY2 = y2 - uy * lenEnd;
    
    children.push({
        id: `${conn.id}-line`,
        type: 'line',
        points: [x1, y1, lineX2, lineY2],
        stroke: conn.color,
        strokeWidth: conn.lineWidth,
        dash: [conn.dashSize || 5, conn.dashSize || 5],
        hitStrokeWidth: 10
    });
    
    if (conn.symbolEnd) {
        addSymbol(conn, children, conn.symbolEnd, x2, y2, angle, 'end');
    }
    return children;
}

function convertSimpleConnector(conn: SimpleConnectorRenderable, pointsConfig: {x1: number, y1: number, x2: number, y2: number, ux: number, uy: number, angle: number}): AtomicRenderable[] {
    const children: AtomicRenderable[] = [];
    const { x1, y1, x2, y2, ux, uy, angle } = pointsConfig;

    const lenStart = getSymbolLength(conn.symbolStart);
    const lenEnd = getSymbolLength(conn.symbolEnd);
    
    const lineX1 = x1 + ux * lenStart;
    const lineY1 = y1 + uy * lenStart;
    const lineX2 = x2 - ux * lenEnd;
    const lineY2 = y2 - uy * lenEnd;
    
    children.push({
        id: `${conn.id}-line`,
        type: 'line',
        points: [lineX1, lineY1, lineX2, lineY2],
        stroke: conn.color,
        strokeWidth: conn.lineWidth,
        hitStrokeWidth: 10
    });
    
    if (conn.symbolStart === 'arrow') addSymbol(conn, children, 'arrow', x1, y1, angle + 180, 'start');
    if (conn.symbolEnd === 'arrow') addSymbol(conn, children, 'arrow', x2, y2, angle, 'end');
    
    return children;
}

function convertConnector(conn: ConnectorRenderable): AtomicGroup {
  let children: AtomicRenderable[] = [];
  
  const points = conn.points.flat();
  const [x1, y1, x2, y2] = points;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const len = Math.sqrt(dx*dx + dy*dy);
  const ux = dx / (len || 1); 
  const uy = dy / (len || 1);

  const pointsConfig = { x1, y1, x2, y2, ux, uy, angle };

  if (conn.connectorType === 'interface') {
      children = convertInterfaceConnector(conn, pointsConfig);
  } else if (conn.connectorType === 'delegate') {
      children = convertDelegateConnector(conn, pointsConfig);
  } else {
      children = convertSimpleConnector(conn, pointsConfig);
  }

  // Label (Common)
  if (conn.label) {
      children.push({
          id: `${conn.id}-label`,
          type: 'text',
          x: (x1 + x2)/2,
          y: (y1 + y2)/2,
          text: conn.label,
          fill: conn.labelColor || '#000',
          fontSize: 12,
          align: 'center',
          offset: { x: conn.label.length * 3, y: 15 } 
      });
  }

  return {
    id: conn.id,
    type: 'group',
    children
  };
}
