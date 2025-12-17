import type { Diagram, Node, Connector } from '../types';
import type { RenderStack, RectangleRenderable, TextRenderable, PortRenderable, BookIconRenderable, Renderable, LineConnectorRenderable } from '../types/renderables';

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
  const sidePadding = 150; // Increased horizontal padding around children
  const labelSpace = 35;
  const verticalPadding = 150; // Increased vertical padding around children
  
  return {
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
  const borderColor = theme === 'dark' ? '#ffffff' : '#000000'; // White in dark mode, black in light mode
  const bookBorderColor = theme === 'dark' ? '#666666' : '#cccccc'; // Subtle gray for book icons
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';
  const portColor = bgColor; // Ports use same color as normal components
  
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
        const portSize = 16; // Larger port size
        
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
        strokeColor: bookBorderColor // Use subtle border for book icons
      };
      stack.push(bookIconRenderable);
    }
  });
  
  // Create a map of updated node/port bounds for edge routing
  const elementBounds = new Map<string, { x: number, y: number, width: number, height: number }>();
  
  stack.forEach(renderable => {
    if (renderable.type === 'rectangle') {
       const rect = renderable as RectangleRenderable;
       elementBounds.set(rect.nodeId || rect.id, {
         x: rect.x,
         y: rect.y,
         width: rect.width,
         height: rect.height
       });
    } else if (renderable.type === 'port') {
        const port = renderable as PortRenderable;
        elementBounds.set(port.portId, {
            x: port.x,
            y: port.y,
            width: port.size,
            height: port.size
        });
    }
  });

  // Helper function to process a single connector
  const processConnector = (connector: Connector, index: number) => {
    // Determine lookup keys: use port ID if available, otherwise node ID
    const sourceKey = connector.sourcePort || connector.source;
    const targetKey = connector.targetPort || connector.target;
    
    const source = elementBounds.get(sourceKey);
    const target = elementBounds.get(targetKey);
    
    if (!source || !target) return;
    
    const sourceX = source.x;
    const sourceY = source.y;
    const targetX = target.x;
    const targetY = target.y;
    
    // Calculate intersection with source border
    // Vector from source to target
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    
    // A simple approximation for intersection with AABB is scaling the vector
    // to the edge of the box.
    // Box half sizes
    const sw = source.width / 2;
    const sh = source.height / 2;
    
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
    const tw = target.width / 2;
    const th = target.height / 2;
    
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
        id: `conn-${connector.id || index}`,
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
    
    // Build chained simple connectors based on type
    const type = connector.type || '';
    const hasInterfaceSymbols = type.includes('(') || type.includes(')');
    const isDelegate = connector.isDelegate || (connector.stereotype === 'delegate');
    const isCrossLevel = connector.isCrossLevel || false;
    
    // Calculate midpoint and direction
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    
    if (hasInterfaceSymbols) {
        // Interface connectors ALWAYS show both socket and ball at the SAME center point:
        // Render as TWO separate connectors, each with line to/from midpoint + symbol
        // -())- : ball connector + socket connector (both at midpoint)
        // -(()- : socket connector + ball connector (both at midpoint)
        
        const ballRadius = 6;
        const socketRadius = 9; // Larger to wrap around the ball
        
        // Calculate line endpoints to stop at symbol rim
        const cosAngle = Math.cos(angle * Math.PI / 180);
        const sinAngle = Math.sin(angle * Math.PI / 180);
        
        // Check if this should render as full lollipop or single symbol
        // External cross-level: Full lollipop (both socket and ball)
        // Internal cross-level: Single symbol + delegate (rendered separately)
        // Socket pattern: -( NOT followed by )
        // Ball pattern: ()
        const socketPattern = /-\((?!\))/;
        const hasSocket = socketPattern.test(type);
        const hasBall = type.includes('()');
        
        // Internal connectors are auto-generated and have single symbol type like ())-
        const isInternalDelegate = isCrossLevel && connector.isAutoGenerated;
        // External connectors should render as full lollipop
        const isFullLollipop = (isCrossLevel && !isInternalDelegate) || (hasSocket && hasBall);
        
        // Determine order: check if socket comes before ball in the string
        const socketIndex = type.indexOf('-(');
        const ballIndex = type.indexOf('()');
        
        if (isFullLollipop && socketIndex >= 0 && socketIndex < ballIndex) {
            // -(()- : Socket opens right, ball on left side
            
            // Ball connector: line from start to midpoint, ball at end
            stack.push({
                id: `${baseConn.id}-ball-line`,
                type: 'connector',
                zIndex: baseConn.zIndex,
                x: 0, y: 0,
                connectorType: 'line',
                points: [[startX, startY], [midX - ballRadius * cosAngle, midY - ballRadius * sinAngle]],
                color: baseConn.color,
                lineWidth: baseConn.lineWidth
            });
            
            stack.push({
                id: `${baseConn.id}-ball`,
                type: 'connector',
                zIndex: baseConn.zIndex + 1,
                x: midX, y: midY,
                connectorType: 'ball',
                radius: ballRadius,
                color: baseConn.color,
                lineWidth: baseConn.lineWidth,
                fillColor: theme === 'dark' ? '#000000' : '#ffffff'
            });
            
            // Socket connector: line from socket rim to end, socket at start
            stack.push({
                id: `${baseConn.id}-socket-line`,
                type: 'connector',
                zIndex: baseConn.zIndex,
                x: 0, y: 0,
                connectorType: 'line',
                points: [[midX + socketRadius * cosAngle, midY + socketRadius * sinAngle], [endX, endY]],
                color: baseConn.color,
                lineWidth: baseConn.lineWidth
            });
            
            stack.push({
                id: `${baseConn.id}-socket`,
                type: 'connector',
                zIndex: baseConn.zIndex + 1,
                x: midX, y: midY,
                connectorType: 'socket',
                radius: socketRadius,
                angle: angle,
                direction: 'right',
                color: baseConn.color,
                lineWidth: baseConn.lineWidth
            });
            
            // Add label if present (for -(()- connector)
            if (baseConn.label) {
                stack.push({
                    id: `${baseConn.id}-label`,
                    type: 'connector',
                    zIndex: baseConn.zIndex + 2,
                    x: 0, y: 0,
                    connectorType: 'line',
                    points: [[midX, midY], [midX, midY]], // Zero-length line just for the label
                    color: baseConn.color,
                    lineWidth: 0, // Invisible line
                    label: baseConn.label,
                    labelColor: textColor
                });
            }
        } else if (isFullLollipop) {
            // -())- : Ball on left, socket opens left
            
            // Socket connector: line from start to socket rim, socket at end
            stack.push({
                id: `${baseConn.id}-socket-line`,
                type: 'connector',
                zIndex: baseConn.zIndex,
                x: 0, y: 0,
                connectorType: 'line',
                points: [[startX, startY], [midX - socketRadius * cosAngle, midY - socketRadius * sinAngle]],
                color: baseConn.color,
                lineWidth: baseConn.lineWidth
            });
            
            stack.push({
                id: `${baseConn.id}-socket`,
                type: 'connector',
                zIndex: baseConn.zIndex + 1,
                x: midX, y: midY,
                connectorType: 'socket',
                radius: socketRadius,
                angle: angle,
                direction: 'left',
                color: baseConn.color,
                lineWidth: baseConn.lineWidth
            });
            
            // Ball connector: line from ball rim to end, ball at start
            stack.push({
                id: `${baseConn.id}-ball-line`,
                type: 'connector',
                zIndex: baseConn.zIndex,
                x: 0, y: 0,
                connectorType: 'line',
                points: [[midX + ballRadius * cosAngle, midY + ballRadius * sinAngle], [endX, endY]],
                color: baseConn.color,
                lineWidth: baseConn.lineWidth
            });
            
            stack.push({
                id: `${baseConn.id}-ball`,
                type: 'connector',
                zIndex: baseConn.zIndex + 1,
                x: midX, y: midY,
                connectorType: 'ball',
                radius: ballRadius,
                color: baseConn.color,
                lineWidth: baseConn.lineWidth,
                fillColor: theme === 'dark' ? '#000000' : '#ffffff'
            });
            
            // Add label if present (for -())- connector)
            if (baseConn.label) {
                stack.push({
                    id: `${baseConn.id}-label`,
                    type: 'connector',
                    zIndex: baseConn.zIndex + 2,
                    x: 0, y: 0,
                    connectorType: 'line',
                    points: [[midX, midY], [midX, midY]], // Zero-length line just for the label
                    color: baseConn.color,
                    lineWidth: 0, // Invisible line
                    label: baseConn.label,
                    labelColor: textColor
                });
            }
        } else {
            // Single symbol connector (ball OR socket, not both)
            // For internal delegates: symbol should be near child (3/4 from start, which is 1/4 from end/child)
            // For regular: symbol at midpoint
            const symbolPosition = isInternalDelegate ? 0.75 : 0.5;
            const symbolX = startX + (endX - startX) * symbolPosition;
            const symbolY = startY + (endY - startY) * symbolPosition;
            
            // Determine which symbol we have
            let symbol: 'ball' | 'socket' | null = null;
            let symbolDir: 'left' | 'right' = 'left';
            
            if (hasBall) {
                symbol = 'ball';
            } else if (hasSocket) {
                symbol = 'socket';
                // Determine direction based on position in string
                if (type.startsWith('-(')) {
                    symbolDir = 'right'; // Opens to the right
                } else {
                    symbolDir = 'left'; // Opens to the left
                }
            }
            
            if (symbol) {
                const symbolRadius = symbol === 'ball' ? ballRadius : socketRadius;
                
                // Line from start to symbol
                stack.push({
                    id: `${baseConn.id}-line1`,
                    type: 'connector',
                    zIndex: baseConn.zIndex,
                    x: 0, y: 0,
                    connectorType: 'line',
                    points: [[startX, startY], [symbolX - symbolRadius * cosAngle, symbolY - symbolRadius * sinAngle]],
                    color: baseConn.color,
                    lineWidth: baseConn.lineWidth
                });
                
                // Symbol
                if (symbol === 'ball') {
                    stack.push({
                        id: `${baseConn.id}-ball`,
                        type: 'connector',
                        zIndex: baseConn.zIndex + 1,
                        x: symbolX, y: symbolY,
                        connectorType: 'ball',
                        radius: ballRadius,
                        color: baseConn.color,
                        lineWidth: baseConn.lineWidth,
                        fillColor: theme === 'dark' ? '#000000' : '#ffffff'
                    });
                } else {
                    stack.push({
                        id: `${baseConn.id}-socket`,
                        type: 'connector',
                        zIndex: baseConn.zIndex + 1,
                        x: symbolX, y: symbolY,
                        connectorType: 'socket',
                        radius: socketRadius,
                        angle: angle,
                        direction: symbolDir,
                        color: baseConn.color,
                        lineWidth: baseConn.lineWidth
                    });
                }
                
                // Line from symbol to end (child)
                stack.push({
                    id: `${baseConn.id}-line2`,
                    type: 'connector',
                    zIndex: baseConn.zIndex,
                    x: 0, y: 0,
                    connectorType: 'line',
                    points: [[symbolX + symbolRadius * cosAngle, symbolY + symbolRadius * sinAngle], [endX, endY]],
                    color: baseConn.color,
                    lineWidth: baseConn.lineWidth
                });
                
                // Add label if present (for single symbol connectors)
                if (baseConn.label) {
                    stack.push({
                        id: `${baseConn.id}-label`,
                        type: 'connector',
                        zIndex: baseConn.zIndex + 2,
                        x: 0, y: 0,
                        connectorType: 'line',
                        points: [[symbolX, symbolY], [symbolX, symbolY]], // Zero-length line just for the label
                        color: baseConn.color,
                        lineWidth: 0, // Invisible line
                        label: baseConn.label,
                        labelColor: textColor
                    });
                }
            }
        }
    } else {
        // Simple line connector (possibly with arrow and/or label)
        let finalLabel = baseConn.label || '';
        if (isDelegate && !finalLabel.includes('<<delegate>>')) {
            finalLabel = finalLabel ? `<<delegate>> ${finalLabel}` : '<<delegate>>';
        }
        
        const lineConn: LineConnectorRenderable = {
            ...baseConn,
            connectorType: 'line',
            dashed: false, // Delegates are NOT dashed
            arrowEnd: isDelegate || type.includes('>'), // Delegates always have arrows
            label: finalLabel || undefined,
            labelColor: textColor
        };
        stack.push(lineConn);
    }
    
    // For INTERNAL cross-level interface connectors, add delegate arrow
    if (isCrossLevel && hasInterfaceSymbols && !isDelegate && connector.isAutoGenerated) {
        // Delegate arrow direction depends on interface type:
        // - Ball (provides): FROM child TO port (ball → port)
        // - Socket (requires): FROM port TO socket (port → socket)
        const ballRadius = 6;
        const socketRadius = 9;
        const hasBall = type.includes('()');
        const symbolRadius = hasBall ? ballRadius : socketRadius;
        
        const cosAngle = Math.cos(angle * Math.PI / 180);
        const sinAngle = Math.sin(angle * Math.PI / 180);
        
        // Symbol is at 3/4 position for internal delegates (near child end)
        const symbolPosition = 0.75;
        const symbolX = startX + (endX - startX) * symbolPosition;
        const symbolY = startY + (endY - startY) * symbolPosition;
        
        // Position before symbol (no gap) - delegate arrow ends at symbol edge
        const beforeSymbolX = symbolX - symbolRadius * cosAngle;
        const beforeSymbolY = symbolY - symbolRadius * sinAngle;
        
        // Delegate arrow direction depends on interface type:
        // - Socket at child (requires): delegate FROM socket TO port
        // - Ball at child (provides): delegate FROM port TO ball
        let delegateStart: [number, number];
        let delegateEnd: [number, number];
        
        if (hasBall) {
            // Ball at child (provides): delegate FROM port TO ball
            delegateStart = [startX, startY];
            delegateEnd = [beforeSymbolX, beforeSymbolY];
        } else {
            // Socket at child (requires): delegate FROM socket TO port
            delegateStart = [beforeSymbolX, beforeSymbolY];
            delegateEnd = [startX, startY];
        }
        
        // Delegate arrow with <<delegate>> label
        stack.push({
            ...baseConn,
            id: `${baseConn.id}-auto-delegate`,
            connectorType: 'line',
            points: [delegateStart, delegateEnd],
            dashed: false,
            arrowEnd: true,
            label: '<<delegate>>',
            labelColor: textColor,
            zIndex: baseConn.zIndex + 2
        });
    }
  };
  
  // Process all connectors
  diagram.connectors.forEach((connector, i) => processConnector(connector, i));
  
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

