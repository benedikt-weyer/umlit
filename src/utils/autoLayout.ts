import type { Node, Diagram, Port } from '../types';

interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  startX: number;
  startY: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  horizontalSpacing: 300,  // Increased for larger nested components
  verticalSpacing: 250,    // Increased for larger nested components
  startX: 50,
  startY: 50
};

// Calculate node dimensions including children (for rendering)
// Helper to calculate node position bounds (minX, maxX, minY, maxY)
function getNodePositionBounds(node: Node, allNodes: Node[]): { minX: number; maxX: number; minY: number; maxY: number } {
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
    const childBounds = getNodePositionBounds(child, allNodes);
    minX = Math.min(minX, childBounds.minX);
    maxX = Math.max(maxX, childBounds.maxX);
    minY = Math.min(minY, childBounds.minY);
    maxY = Math.max(maxY, childBounds.maxY);
  });
  
  // Add padding for parent
  const sidePadding = 80;
  const labelSpace = 40;
  const verticalPadding = 80;
  
  return {
    minX: minX - sidePadding,
    maxX: maxX + sidePadding,
    minY: minY - verticalPadding - labelSpace,
    maxY: maxY + verticalPadding
  };
}

function getNodeBounds(node: Node, allNodes: Node[]): { width: number; height: number } {
  const hasChildren = node.children && node.children.length > 0;
  
  if (!hasChildren) {
    return { width: 150, height: 80 };
  }
  
  const childNodes = allNodes.filter(n => n.parentId === node.id);
  if (childNodes.length === 0) {
    return { width: 150, height: 80 };
  }
  
  const sidePadding = 80; // More horizontal padding for nested components
  const labelSpace = 40;
  const verticalPadding = 80; // More vertical padding for nested components
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  childNodes.forEach(child => {
    const childBounds = getNodeBounds(child, allNodes);
    minX = Math.min(minX, child.x - childBounds.width / 2);
    maxX = Math.max(maxX, child.x + childBounds.width / 2);
    minY = Math.min(minY, child.y - childBounds.height / 2);
    maxY = Math.max(maxY, child.y + childBounds.height / 2);
  });
  
  const width = Math.max(200, (maxX - minX) + sidePadding * 2);
  const height = Math.max(120, (maxY - minY) + verticalPadding * 2 + labelSpace);
  
  return { width, height };
}

// Layout children within a parent container (bottom-up approach)
function layoutChildrenInParent(parentId: string, parentX: number, parentY: number, nodes: Node[]): Node[] {
  const children = nodes.filter(n => n.parentId === parentId);
  if (children.length === 0) return nodes;
  
  let newNodes = [...nodes];
  const childSpacing = 150; // Generous spacing between child elements
  
  // First, normalize all children to origin (0,0) before layout
  // This ensures we're working with relative positions
  children.forEach(child => {
    const childIndex = newNodes.findIndex(n => n.id === child.id);
    if (childIndex !== -1) {
      const currentChild = newNodes[childIndex];
      const deltaX = 0 - (currentChild.x || 0);
      const deltaY = 0 - (currentChild.y || 0);
      
      // Move child to origin
      newNodes[childIndex] = { ...currentChild, x: 0, y: 0 };
      
      // Move all descendants by the same delta
      const moveDescendants = (nodeId: string) => {
        const descendants = newNodes.filter(n => n.parentId === nodeId);
        descendants.forEach(desc => {
          const descIndex = newNodes.findIndex(n => n.id === desc.id);
          if (descIndex !== -1) {
            newNodes[descIndex] = {
              ...newNodes[descIndex],
              x: newNodes[descIndex].x + deltaX,
              y: newNodes[descIndex].y + deltaY
            };
          }
          moveDescendants(desc.id);
        });
      };
      moveDescendants(child.id);
    }
  });
  
  // Then, recursively layout all grandchildren (bottom-up)
  // Use 0,0 as temp position since we've already normalized positions
  children.forEach(child => {
    newNodes = layoutChildrenInParent(child.id, 0, 0, newNodes);
  });
  
  // Now position children in a vertical stack relative to parent
  let currentY = parentY;
  
  children.forEach((child, index) => {
    // Get updated child reference
    const updatedChild = newNodes.find(n => n.id === child.id);
    if (!updatedChild) return;
    
    // Get bounds after grandchildren have been laid out
    const childBounds = getNodeBounds(updatedChild, newNodes);
    
    const childX = parentX;
    const childY = currentY + (index === 0 ? childBounds.height / 2 : 0);
    
    // Calculate delta from current position to new position
    const deltaX = childX - (updatedChild.x || 0);
    const deltaY = childY - (updatedChild.y || 0);
    
    // Update child position
    const childIndex = newNodes.findIndex(n => n.id === child.id);
    if (childIndex !== -1) {
      newNodes[childIndex] = { ...newNodes[childIndex], x: childX, y: childY };
      
      // Move all descendants by the same delta
      const moveDescendants = (nodeId: string) => {
        const descendants = newNodes.filter(n => n.parentId === nodeId);
        descendants.forEach(desc => {
          const descIndex = newNodes.findIndex(n => n.id === desc.id);
          if (descIndex !== -1) {
            newNodes[descIndex] = {
              ...newNodes[descIndex],
              x: newNodes[descIndex].x + deltaX,
              y: newNodes[descIndex].y + deltaY
            };
          }
          moveDescendants(desc.id);
        });
      };
      moveDescendants(child.id);
    }
    
    // Move to next position
    currentY = childY + childBounds.height / 2 + childSpacing;
  });
  
  return newNodes;
}

// Simple grid layout for root nodes with port-aware positioning
export function autoLayoutNodes(nodes: Node[], diagram?: Diagram, config: Partial<LayoutConfig> = {}): Node[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let newNodes = [...nodes];
  
  // Get root nodes (nodes without parents)
  const rootNodes = newNodes.filter(n => !n.parentId);
  
  if (rootNodes.length === 0) return newNodes;
  
  // Helper to check if node has a parent
  function getNodeParent(nodeId: string, nodes: Node[]): string | undefined {
    const node = nodes.find(n => n.id === nodeId);
    return node?.parentId;
  }
  
  // Build map of port-connected nodes if diagram is provided
  const portConnections = new Map<string, { portNodeId: string, portId: string, port?: Port }>();
  if (diagram) {
    diagram.connectors.forEach(conn => {
      // Check if external node connects to a port
      if (conn.targetPort && !getNodeParent(conn.source, newNodes)) {
        // External source connects to target's port
        portConnections.set(conn.source, {
          portNodeId: conn.target,
          portId: conn.targetPort,
          port: diagram.ports.find(p => p.id === conn.targetPort)
        });
      } else if (conn.sourcePort && !getNodeParent(conn.target, newNodes)) {
        // External target connects to source's port
        portConnections.set(conn.target, {
          portNodeId: conn.source,
          portId: conn.sourcePort,
          port: diagram.ports.find(p => p.id === conn.sourcePort)
        });
      }
    });
  }
  
  // Separate port-connected nodes from grid nodes
  const portConnectedNodes = rootNodes.filter(n => portConnections.has(n.id));
  const gridNodes = rootNodes.filter(n => !portConnections.has(n.id));
  
  // Calculate grid dimensions for non-port-connected nodes
  const cols = Math.ceil(Math.sqrt(gridNodes.length));
  
  // First pass: recursively layout all children bottom-up and calculate bounds
  const gridNodeLayouts: Array<{
    node: Node;
    bounds: { width: number; height: number };
    tempX: number;
    tempY: number;
  }> = [];
  
  gridNodes.forEach((rootNode) => {
    const tempX = 0;  // Use origin as temporary position
    const tempY = 0;
    
    // Set root node position at origin first
    const rootIndex = newNodes.findIndex(n => n.id === rootNode.id);
    if (rootIndex !== -1) {
      newNodes[rootIndex] = { ...newNodes[rootIndex], x: tempX, y: tempY };
    }
    
    // Recursively layout all children from bottom-up (deepest first)
    newNodes = layoutChildrenInParent(rootNode.id, tempX, tempY, newNodes);
    
    // After all children are laid out, calculate the actual bounds
    // Use getNodeBounds which calculates based on positioned children
    const updatedRootNode = newNodes.find(n => n.id === rootNode.id);
    if (!updatedRootNode) {
      gridNodeLayouts.push({ node: rootNode, bounds: { width: 150, height: 80 }, tempX, tempY });
      return;
    }
    
    const bounds = getNodeBounds(updatedRootNode, newNodes);
    
    gridNodeLayouts.push({ node: rootNode, bounds, tempX, tempY });
  });
  
  // Second pass: position grid nodes with proper spacing
  // Calculate cumulative positions to avoid overlap
  // Track Y position for each row
  const rowYPositions = new Map<number, number>();
  const rowMaxHeights = new Map<number, number>();
  
  // Pre-calculate max height for each row
  gridNodeLayouts.forEach((layout, index) => {
    const row = Math.floor(index / cols);
    const currentMax = rowMaxHeights.get(row) || 0;
    rowMaxHeights.set(row, Math.max(currentMax, layout.bounds.height));
  });
  
  // Calculate Y position for each row (center of nodes)
  let cumulativeY = cfg.startY;
  rowMaxHeights.forEach((height, row) => {
    if (row === 0) {
      rowYPositions.set(row, cumulativeY + height / 2);
    } else {
      const prevHeight = rowMaxHeights.get(row - 1) || 0;
      rowYPositions.set(row, cumulativeY + prevHeight / 2 + cfg.verticalSpacing + height / 2);
      cumulativeY += prevHeight + cfg.verticalSpacing;
    }
  });
  
  gridNodeLayouts.forEach((layout, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    // Calculate column position (center of node)
    // For each column: startX + sum of (previous widths + spacing) + current width/2
    let currentX = cfg.startX;
    
    // Add full widths of previous columns plus spacing
    for (let c = 0; c < col; c++) {
      const nodeInCol = gridNodeLayouts[row * cols + c];
      if (nodeInCol) {
        currentX += nodeInCol.bounds.width + cfg.horizontalSpacing;
      }
    }
    
    // Add half width of current node to get its center
    currentX += layout.bounds.width / 2;
    
    const newX = currentX;
    const newY = rowYPositions.get(row) || cfg.startY;
    
    // Calculate delta to move from temp to final position
    const deltaX = newX - layout.tempX;
    const deltaY = newY - layout.tempY;
    
    // Update root node position
    const nodeIndex = newNodes.findIndex(n => n.id === layout.node.id);
    if (nodeIndex !== -1) {
      newNodes[nodeIndex] = { ...newNodes[nodeIndex], x: newX, y: newY };
    }
    
    // Move all descendants by the delta
    const moveAllDescendants = (parentId: string) => {
      const descendants = newNodes.filter(n => n.parentId === parentId);
      descendants.forEach(desc => {
        const descIndex = newNodes.findIndex(n => n.id === desc.id);
        if (descIndex !== -1) {
          newNodes[descIndex] = {
            ...newNodes[descIndex],
            x: newNodes[descIndex].x + deltaX,
            y: newNodes[descIndex].y + deltaY
          };
        }
        moveAllDescendants(desc.id);
      });
    };
    moveAllDescendants(layout.node.id);
  });
  
  // Now position port-connected nodes next to their ports
  portConnectedNodes.forEach((rootNode) => {
    const connection = portConnections.get(rootNode.id);
    if (!connection || !connection.port) return;
    
    // Store temp position at origin
    const tempX = 0;
    const tempY = 0;
    
    // Recursively layout all children from bottom-up first
    newNodes = layoutChildrenInParent(rootNode.id, tempX, tempY, newNodes);
    
    // Find the parent component that owns the port (after grid nodes have been positioned)
    const portParentNode = newNodes.find(n => n.id === connection.portNodeId);
    if (!portParentNode) return;
    
    // Calculate port coordinates based on parent node bounds and port side
    const bounds = getNodePositionBounds(portParentNode, newNodes);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    let portX = centerX;
    let portY = centerY;
    
    switch (connection.port.side) {
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
    
    // Calculate position based on port side
    const spacing = 400; // Distance from port to external node
    let newX = portX;
    let newY = portY;
    
    switch (connection.port.side) {
      case 'left':
        newX = portX - spacing;
        newY = portY;
        break;
      case 'right':
        newX = portX + spacing;
        newY = portY;
        break;
      case 'top':
        newX = portX;
        newY = portY - spacing;
        break;
      case 'bottom':
        newX = portX;
        newY = portY + spacing;
        break;
      default:
        // Default to left
        newX = portX - spacing;
        newY = portY;
    }
    
    // Calculate delta to move from temp to final position
    const deltaX = newX - tempX;
    const deltaY = newY - tempY;
    
    // Update root node position
    const nodeIndex = newNodes.findIndex(n => n.id === rootNode.id);
    if (nodeIndex !== -1) {
      newNodes[nodeIndex] = { ...newNodes[nodeIndex], x: newX, y: newY };
    }
    
    // Move all descendants by the delta
    const moveAllDescendants = (parentId: string) => {
      const descendants = newNodes.filter(n => n.parentId === parentId);
      descendants.forEach(desc => {
        const descIndex = newNodes.findIndex(n => n.id === desc.id);
        if (descIndex !== -1) {
          newNodes[descIndex] = {
            ...newNodes[descIndex],
            x: newNodes[descIndex].x + deltaX,
            y: newNodes[descIndex].y + deltaY
          };
        }
        moveAllDescendants(desc.id);
      });
    };
    moveAllDescendants(rootNode.id);
  });
  
  return newNodes;
}

// Update code with new positions
export function updateCodeWithPositions(code: string, nodes: Node[]): string {
  const newCode = code;
  const lines = newCode.split('\n');
  
  const newLines = lines.map(line => {
    const trimmed = line.trim();
    
    // Skip connector/edge lines (they contain arrows or interface connectors)
    if (trimmed.includes('->') || trimmed.includes('-()') || trimmed.includes('(()-')) {
      return line;
    }
    
    // Check each node
    for (const node of nodes) {
      const nodeRegex = new RegExp(`^\\[${node.id}\\]`);
      if (nodeRegex.test(trimmed)) {
        // Check if it already has coordinates
        if (trimmed.includes('@')) {
          return line.replace(/@\s*-?\d+,\s*-?\d+/, `@ ${Math.round(node.x)},${Math.round(node.y)}`);
        } else {
          // Find the position to insert coordinates (before { or at end)
          if (trimmed.endsWith('{')) {
            return line.replace(/\s*\{$/, ` @ ${Math.round(node.x)},${Math.round(node.y)} {`);
          } else {
            return `${line} @ ${Math.round(node.x)},${Math.round(node.y)}`;
          }
        }
      }
    }
    return line;
  });
  
  return newLines.join('\n');
}

