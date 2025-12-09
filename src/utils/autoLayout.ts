import type { Node } from '../types';

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

// Calculate node dimensions including children
function getNodeBounds(node: Node, allNodes: Node[]): { width: number; height: number } {
  const hasChildren = node.children && node.children.length > 0;
  
  if (!hasChildren) {
    return { width: 150, height: 80 };
  }
  
  const childNodes = allNodes.filter(n => n.parentId === node.id);
  if (childNodes.length === 0) {
    return { width: 150, height: 80 };
  }
  
  const padding = 20;
  const labelSpace = 30;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  childNodes.forEach(child => {
    const childBounds = getNodeBounds(child, allNodes);
    minX = Math.min(minX, child.x - childBounds.width / 2);
    maxX = Math.max(maxX, child.x + childBounds.width / 2);
    minY = Math.min(minY, child.y - childBounds.height / 2);
    maxY = Math.max(maxY, child.y + childBounds.height / 2);
  });
  
  const width = Math.max(200, (maxX - minX) + padding * 2);
  const height = Math.max(120, (maxY - minY) + padding * 2 + labelSpace);
  
  return { width, height };
}

// Layout children within a parent container
function layoutChildrenInParent(parentId: string, parentX: number, parentY: number, nodes: Node[]): Node[] {
  const children = nodes.filter(n => n.parentId === parentId);
  if (children.length === 0) return nodes;
  
  const newNodes = [...nodes];
  const childSpacing = 40;
  const padding = 30;
  
  // Simple vertical layout for children
  let currentY = parentY - 50; // Start near top of parent (below label)
  
  children.forEach((child, index) => {
    const childBounds = getNodeBounds(child, newNodes);
    
    // Position child
    const childX = parentX;
    const childY = currentY + childBounds.height / 2;
    
    const childIndex = newNodes.findIndex(n => n.id === child.id);
    if (childIndex !== -1) {
      newNodes[childIndex] = { ...newNodes[childIndex], x: childX, y: childY };
      
      // Recursively layout grandchildren
      layoutChildrenInParent(child.id, childX, childY, newNodes);
    }
    
    currentY += childBounds.height + childSpacing;
  });
  
  return newNodes;
}

// Simple grid layout for root nodes
export function autoLayoutNodes(nodes: Node[], config: Partial<LayoutConfig> = {}): Node[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let newNodes = [...nodes];
  
  // First, layout children within their parents (bottom-up)
  const layoutAllChildren = (nodeList: Node[]): Node[] => {
    let result = [...nodeList];
    
    // Get all nodes that have children
    const parentsWithChildren = result.filter(n => {
      const hasChildren = n.children && n.children.length > 0;
      const actualChildren = result.filter(c => c.parentId === n.id);
      return hasChildren || actualChildren.length > 0;
    });
    
    // Layout children for each parent
    parentsWithChildren.forEach(parent => {
      result = layoutChildrenInParent(parent.id, parent.x || 0, parent.y || 0, result);
    });
    
    return result;
  };
  
  // Get root nodes (nodes without parents)
  const rootNodes = newNodes.filter(n => !n.parentId);
  
  if (rootNodes.length === 0) return newNodes;
  
  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(rootNodes.length));
  
  // Position root nodes in a grid
  rootNodes.forEach((rootNode, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    const bounds = getNodeBounds(rootNode, newNodes);
    
    const newX = cfg.startX + col * (bounds.width + cfg.horizontalSpacing);
    const newY = cfg.startY + row * (bounds.height + cfg.verticalSpacing);
    
    // Calculate delta for this root node
    const deltaX = newX - (rootNode.x || 0);
    const deltaY = newY - (rootNode.y || 0);
    
    // Update root node position
    const nodeIndex = newNodes.findIndex(n => n.id === rootNode.id);
    if (nodeIndex !== -1) {
      newNodes[nodeIndex] = { ...newNodes[nodeIndex], x: newX, y: newY };
    }
    
    // Layout children relative to parent
    newNodes = layoutChildrenInParent(rootNode.id, newX, newY, newNodes);
  });
  
  return newNodes;
}

// Update code with new positions
export function updateCodeWithPositions(code: string, nodes: Node[]): string {
  let newCode = code;
  const lines = newCode.split('\n');
  
  const newLines = lines.map(line => {
    const trimmed = line.trim();
    
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

