import type { Diagram, Node } from '../types';
import type { RenderStack, RectangleRenderable, TextRenderable, PortRenderable, BookIconRenderable } from '../types/renderables';

// Helper to calculate node dimensions
function getNodeDimensions(node: Node, allNodes: Node[]): { width: number; height: number } {
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
    const childDims = getNodeDimensions(child, allNodes);
    minX = Math.min(minX, child.x - childDims.width / 2);
    maxX = Math.max(maxX, child.x + childDims.width / 2);
    minY = Math.min(minY, child.y - childDims.height / 2);
    maxY = Math.max(maxY, child.y + childDims.height / 2);
  });
  
  const width = Math.max(200, (maxX - minX) + padding * 2);
  const height = Math.max(120, (maxY - minY) + padding * 2 + labelSpace);
  
  return { width, height };
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
    const dims = getNodeDimensions(node, diagram.nodes);
    const hasChildren = node.children && node.children.length > 0;
    
    // Node rectangle
    const rectRenderable: RectangleRenderable = {
      id: `rect-${node.id}`,
      type: 'rectangle',
      zIndex: zIndex++,
      x: node.x,
      y: node.y,
      width: dims.width,
      height: dims.height,
      fillColor: bgColor,
      strokeColor: borderColor,
      transparent: hasChildren,
      opacity: hasChildren ? 0 : 1,
      nodeId: node.id,
      isDraggable: true
    };
    stack.push(rectRenderable);
    
    // Node label
    const labelRenderable: TextRenderable = {
      id: `label-${node.id}`,
      type: 'text',
      zIndex: zIndex++,
      x: node.x,
      y: node.y - dims.height / 2 + 15,
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
        let portX = node.x;
        let portY = node.y;
        const portSize = 8;
        
        switch (port.side) {
          case 'left':
            portX = node.x - dims.width / 2;
            break;
          case 'right':
            portX = node.x + dims.width / 2;
            break;
          case 'top':
            portY = node.y - dims.height / 2;
            break;
          case 'bottom':
            portY = node.y + dims.height / 2;
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
  
  // TODO: Add edge renderables
  
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
      belongsToNode = nodesToUpdate.includes((renderable as RectangleRenderable).nodeId);
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

