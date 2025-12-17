import type { Diagram, Node } from '../types';
import type { RenderStack, RectangleRenderable, TextRenderable, PortRenderable, BookIconRenderable, ConnectorRenderable, Renderable, SimpleConnectorRenderable, DelegateConnectorRenderable, InterfaceConnectorRenderable } from '../types/renderables';

// Helper to calculate node dimensions
// Helper to calculate node bounds
function getNodeBounds(node: Node, allNodes: Node[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const hasChildren = node.children && node.children.length > 0;
  
  if (!hasChildren) {
    const width = 150;
    const height = 80;
    return {
        minX: node.x - width / 2,
        maxX: node.x + width / 2,
        minY: node.y - height / 2,
        maxY: node.y + height / 2
    };
  }
  
  const childNodes = allNodes.filter(n => n.parentId === node.id);
  if (childNodes.length === 0) {
    const width = 150;
    const height = 80;
    return {
        minX: node.x - width / 2,
        maxX: node.x + width / 2,
        minY: node.y - height / 2,
        maxY: node.y + height / 2
    };
  }
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  childNodes.forEach(child => {
    const childBounds = getNodeBounds(child, allNodes);
    minX = Math.min(minX, childBounds.minX);
    maxX = Math.max(maxX, childBounds.maxX);
    minY = Math.min(minY, childBounds.minY);
    maxY = Math.max(maxY, childBounds.maxY);
  });
  
  // Add padding for parent
  const sidePadding = 20;
  const labelSpace = 35;
  const verticalPadding = 20;
  
  return {
    minX: minX - sidePadding,
    maxX: maxX + sidePadding,
    minY: minY - verticalPadding - labelSpace, // Extra space for label on top? Or symmetric?
    // Label is usually top centered or middle. If container, label is top.
    // Original logic: height = (maxY - minY) + verticalPadding * 2 + labelSpace
    // Let's create symmetric padding around content, then add label space at top?
    // Let's stick to simple padding expansion for now.
    
    // Actually, we want the rect to enclose children.
    // X: minX - padding, maxX + padding.
    // Y: minY - padding - labelSpace, maxY + padding.
    
    // Wait, previous logic:
    // width = (maxX - minX) + sidePadding * 2
    // height = (maxY - minY) + verticalPadding * 2 + labelSpace
    
    minX: minX - sidePadding,
    maxX: maxX + sidePadding,
    minY: minY - verticalPadding - labelSpace,
    maxY: maxY + verticalPadding
  };
}

// Build render stack from diagram data
export function buildRenderStack(diagram: Diagram, theme: 'light' | 'dark'): RenderStack {
  const stack: RenderStack = [];
  let zIndex = 0;
  
  const bgColor = theme === 'dark' ? '#1f1f1f' : '#ffffff';
  const borderColor = theme === 'dark' ? '#666666' : '#cccccc';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';
  const portColor = theme === 'dark' ? '#4a9eff' : '#0066cc';
  
  // Process nodes (sorted by depth to render parents before children)
  const sortedNodes = [...diagram.nodes].sort((a, b) => (a.depth || 0) - (b.depth || 0));
  
  sortedNodes.forEach(node => {
    const bounds = getNodeBounds(node, diagram.nodes);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    const hasChildren = node.children && node.children.length > 0;
    
    // Node rectangle
    const rectRenderable: RectangleRenderable = {
      id: `rect-${node.id}`,
      type: 'rectangle',
      zIndex: zIndex++,
      x: centerX, // Use calculated center
      y: centerY, // Use calculated center
      width: width,
      height: height,
      fillColor: hasChildren ? 'transparent' : bgColor,
      strokeColor: borderColor,
      transparent: hasChildren,
      opacity: 1,
      nodeId: node.id,
      isDraggable: true
    };
    stack.push(rectRenderable);
    
    // Node label
    const labelRenderable: TextRenderable = {
      id: `label-${node.id}`,
      type: 'text',
      zIndex: zIndex++,
      x: centerX,
      y: centerY - height / 2 + 15,
      content: node.label,
      fontSize: 14,
      color: textColor,
      anchorX: 'center',
      anchorY: 'middle'
    };
    stack.push(labelRenderable);
    
    // Ports (from diagram.ports, not node.ports)
    const nodePorts = diagram.ports.filter(p => p.nodeId === node.id);
    nodePorts.forEach(port => {
        let portX = centerX;
        let portY = centerY;
        const portSize = 8;
        
        switch (port.side) {
          case 'left':
            portX = centerX - width / 2;
            break;
          case 'right':
            portX = centerX + width / 2;
            break;
          case 'top':
            portY = centerY - height / 2;
            break;
          case 'bottom':
            portY = centerY + height / 2;
            break;
        }
        
        const portRenderable: PortRenderable = {
          id: `port-${port.id}`,
          type: 'port',
          zIndex: zIndex++,
          x: portX,
          y: portY,
          size: portSize,
          color: portColor,
          strokeColor: borderColor,
          portId: port.id,
          label: port.label
        };
        stack.push(portRenderable);
      });
    
    // Book icon (only for leaf nodes)
    if (!hasChildren) {
      const bookIconRenderable: BookIconRenderable = {
        id: `book-${node.id}`,
        type: 'book-icon',
        zIndex: zIndex++,
        x: node.x + 57,
        y: node.y,
        color: textColor,
        strokeColor: borderColor
      };
      stack.push(bookIconRenderable);
    }
  });
  
  // Create a map of updated node bounds for edge routing
  const nodeBounds = new Map<string, { x: number, y: number, width: number, height: number }>();
  
  stack.forEach(renderable => {
    if (renderable.type === 'rectangle') {
       const rect = renderable as RectangleRenderable;
       nodeBounds.set(rect.nodeId || rect.id, {
         x: rect.x,
         y: rect.y,
         width: rect.width,
         height: rect.height
       });
    }
  });

  diagram.connectors.forEach((connector, i) => {
    const sourceNode = nodeBounds.get(connector.source);
    const targetNode = nodeBounds.get(connector.target); // or handle .port
    
    // We need to handle port connections too.
    // If connector.sourcePort is set, we need the port position.
    
    // Simple center-to-center for now? user says "connectors so not properly connect anymore to the parent border"
    // This implies border intersection logic is needed.
    
    if (!sourceNode || !targetNode) return;
    
    const sourceX = sourceNode.x;
    const sourceY = sourceNode.y;
    const targetX = targetNode.x;
    const targetY = targetNode.y;
    
    // Calculate intersection with source border
    // Vector from source to target
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    
    // A simple approximation for intersection with AABB is scaling the vector
    // to the edge of the box.
    // Box half sizes
    const sw = sourceNode.width / 2;
    const sh = sourceNode.height / 2;
    
    // Find intersection with source box (ray from center towards target)
    // t_x = sw / abs(dx), t_y = sh / abs(dy)
    // t = min(t_x, t_y)
    let startX = sourceX;
    let startY = sourceY;
    
    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        const tx = sw / (Math.abs(dx) || 0.0001);
        const ty = sh / (Math.abs(dy) || 0.0001);
        const t = Math.min(tx, ty);
        startX += dx * t;
        startY += dy * t;
    }

    // Intersection with target box (ray from target to source)
    const tw = targetNode.width / 2;
    const th = targetNode.height / 2;
    
    const dx2 = sourceX - targetX;
    const dy2 = sourceY - targetY;
    
    let endX = targetX;
    let endY = targetY;
    
    if (Math.abs(dx2) > 0 || Math.abs(dy2) > 0) {
        const tx2 = tw / (Math.abs(dx2) || 0.0001);
        const ty2 = th / (Math.abs(dy2) || 0.0001);
        const t2 = Math.min(tx2, ty2);
        endX += dx2 * t2;
        endY += dy2 * t2;
    }

    // Create base renderable properties
    const baseConn = {
        id: `conn-${connector.id || i}`,
        type: 'connector' as const,
        zIndex: zIndex++, 
        x: 0, 
        y: 0,
        points: [[startX, startY], [endX, endY]] as [number, number][],
        color: borderColor,
        lineWidth: 1,
        label: connector.label,
        labelColor: textColor
    };
    
    // Customize based on connector type
    if (connector.isDelegate || (connector.stereotype === 'delegate')) {
        const delegateConn: DelegateConnectorRenderable = {
            ...baseConn,
            connectorType: 'delegate',
            dashed: true,
            dashSize: 5,
            symbolEnd: 'arrow'
        };
        stack.push(delegateConn);
    } else if (connector.type && (connector.type.includes('(') || connector.type.includes(')'))) {
        // Interface connectors e.g., -())-
        const interfaceConn: InterfaceConnectorRenderable = {
            ...baseConn,
            connectorType: 'interface',
            symbolColor: textColor,
            symbolBgColor: theme === 'dark' ? '#000000' : '#ffffff'
        };

        const type = connector.type;
        
        // Left Symbol
        if (type.startsWith('-()')) {
            interfaceConn.startSymbol = 'ball';
        } else if (type.startsWith('-(')) {
            interfaceConn.startSymbol = 'socket-left'; 
        } else if (type.startsWith('-)')) {
            interfaceConn.startSymbol = 'socket-right';
        }
        
        // Right Symbol
        if (type.endsWith('()-')) {
             interfaceConn.endSymbol = 'ball';
        } else if (type.endsWith(')-')) {
             interfaceConn.endSymbol = 'socket-left'; 
        } else if (type.endsWith('(-')) {
             interfaceConn.endSymbol = 'socket-right';
        }
        
        stack.push(interfaceConn);
    } else {
        // Default Simple Connector
        const simpleConn: SimpleConnectorRenderable = {
            ...baseConn,
            connectorType: 'simple'
        };
        
        if (connector.type && connector.type.includes('>')) {
            simpleConn.symbolEnd = 'arrow';
        }
        
        stack.push(simpleConn);
    }
  });
  
  return stack;
}

// Get renderable at position (for hit testing)
export function getRenderableAt(stack: RenderStack, x: number, y: number): Renderable | null {
  // Iterate in reverse (top to bottom)
  for (let i = stack.length - 1; i >= 0; i--) {
    const renderable = stack[i];
    
    if (renderable.type === 'rectangle') {
      const rect = renderable as RectangleRenderable;
      if (!rect.isDraggable) continue;
      
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      
      if (x >= rect.x - halfWidth && x <= rect.x + halfWidth &&
          y >= rect.y - halfHeight && y <= rect.y + halfHeight) {
        return renderable;
      }
    }
  }
  
  return null;
}

// Update node position in render stack
export function updateNodePositionInStack(
  stack: RenderStack,
  nodeId: string,
  newX: number,
  newY: number,
  allNodes: Node[]
): RenderStack {
  const node = allNodes.find(n => n.id === nodeId);
  if (!node) return stack;
  
  const deltaX = newX - node.x;
  const deltaY = newY - node.y;
  
  // Update all renderables belonging to this node and its children
  const nodesToUpdate = [nodeId];
  const childNodes = allNodes.filter(n => n.parentId === nodeId);
  childNodes.forEach(child => nodesToUpdate.push(child.id));
  
  return stack.map(renderable => {
    // Check if this renderable belongs to a node we're moving
    let belongsToNode = false;
    
    if (renderable.type === 'rectangle') {
      belongsToNode = nodesToUpdate.includes((renderable as RectangleRenderable).nodeId || '');
    } else if (renderable.id.includes('-')) {
      const renderableNodeId = renderable.id.split('-')[1];
      belongsToNode = nodesToUpdate.includes(renderableNodeId);
    }
    
    if (belongsToNode) {
      return {
        ...renderable,
        x: renderable.x + deltaX,
        y: renderable.y + deltaY
      };
    }
    
    return renderable;
  });
}

