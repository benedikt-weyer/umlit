import type { Node, Diagram, Port } from '../types';

interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  startX: number;
  startY: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  horizontalSpacing: 200,
  verticalSpacing: 150,
  startX: 50,
  startY: 50
};

// Simple: calculate bounding box from child positions
function getBoundingBox(childNodes: Node[], allNodes: Node[]): { width: number; height: number; minY: number; maxY: number } {
  if (childNodes.length === 0) {
    return { width: 150, height: 80, minY: 0, maxY: 0 };
  }
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  childNodes.forEach(child => {
    const childBounds = getNodeBounds(child, allNodes);
    minX = Math.min(minX, child.x - childBounds.width / 2);
    maxX = Math.max(maxX, child.x + childBounds.width / 2);
    minY = Math.min(minY, child.y - childBounds.height / 2);
    maxY = Math.max(maxY, child.y + childBounds.height / 2);
  });
  
  const sidePadding = 50; // Increased horizontal padding
  const labelSpace = 35;
  const verticalPadding = 50; // Increased vertical padding
  
  const width = Math.max(200, (maxX - minX) + sidePadding * 2);
  const height = Math.max(120, (maxY - minY) + verticalPadding * 2 + labelSpace);
  
  return { width, height, minY, maxY };
}

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
  const sidePadding = 50;
  const labelSpace = 35;
  const verticalPadding = 50;
  
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
  
  const sidePadding = 50; // Increased horizontal padding
  const labelSpace = 35;
  const verticalPadding = 50; // Increased vertical padding
  
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

// Layout children within a parent container
function layoutChildrenInParent(parentId: string, parentX: number, parentY: number, nodes: Node[]): Node[] {
  const children = nodes.filter(n => n.parentId === parentId);
  if (children.length === 0) return nodes;
  
  let newNodes = [...nodes];
  const childSpacing = 120; // Generous spacing between child elements
  
  // Just position children in a simple stack - parent will size around them
  let currentY = parentY;
  
  children.forEach((child, index) => {
    const childBounds = getNodeBounds(newNodes.find(n => n.id === child.id) || child, newNodes);
    
    const childX = parentX;
    const childY = currentY + (index === 0 ? childBounds.height / 2 : 0);
    
    // Update child position
    const childIndex = newNodes.findIndex(n => n.id === child.id);
    if (childIndex !== -1) {
      const deltaX = childX - (newNodes[childIndex].x || 0);
      const deltaY = childY - (newNodes[childIndex].y || 0);
      
      newNodes[childIndex] = { ...newNodes[childIndex], x: childX, y: childY };
      
      // Recursively layout and move descendants
      newNodes = layoutChildrenInParent(child.id, childX, childY, newNodes);
      
      // Move all descendants by delta
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
  
  // Helper to check if node has a parent
  function getNodeParent(nodeId: string, nodes: Node[]): string | undefined {
    const node = nodes.find(n => n.id === nodeId);
    return node?.parentId;
  }
  
  // Separate port-connected nodes from grid nodes
  const portConnectedNodes = rootNodes.filter(n => portConnections.has(n.id));
  const gridNodes = rootNodes.filter(n => !portConnections.has(n.id));
  
  // Calculate grid dimensions for non-port-connected nodes
  const cols = Math.ceil(Math.sqrt(gridNodes.length));
  
  // Position grid nodes first
  gridNodes.forEach((rootNode, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    // Calculate initial position for root
    const tempX = rootNode.x || 0;
    const tempY = rootNode.y || 0;
    
    // Layout children first at temp position
    newNodes = layoutChildrenInParent(rootNode.id, tempX, tempY, newNodes);
    
    // Now get actual bounds from child positions
    const children = newNodes.filter(n => n.parentId === rootNode.id);
    const bounds = children.length > 0 ? getBoundingBox(children, newNodes) : { width: 150, height: 80 };
    
    // Calculate final grid position
    const newX = cfg.startX + col * (bounds.width + cfg.horizontalSpacing);
    const newY = cfg.startY + row * (bounds.height + cfg.verticalSpacing);
    
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
  
  // Now position port-connected nodes next to their ports
  portConnectedNodes.forEach((rootNode) => {
    const connection = portConnections.get(rootNode.id);
    if (!connection || !connection.port) return;
    
    // Find the parent component that owns the port
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
    
    // Store temp position
    const tempX = rootNode.x || 0;
    const tempY = rootNode.y || 0;
    
    // Layout children first at temp position
    newNodes = layoutChildrenInParent(rootNode.id, tempX, tempY, newNodes);
    
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

