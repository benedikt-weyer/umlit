import type { DiagramAST, ASTNode, ASTEdge } from '../types/ast';
import type { RenderStack, RectangleRenderable, TextRenderable, PortRenderable, BookIconRenderable } from '../types/renderables';

// Flatten AST tree into absolute-positioned renderables
export function buildRenderStackFromAST(ast: DiagramAST, theme: 'light' | 'dark'): RenderStack {
  const stack: RenderStack = [];
  let zIndex = 0;
  
  const bgColor = theme === 'dark' ? '#1f1f1f' : '#ffffff';
  const borderColor = theme === 'dark' ? '#666666' : '#cccccc';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';
  const portColor = theme === 'dark' ? '#4a9eff' : '#0066cc';
  
  // Recursively process nodes (depth-first)
  const processNode = (node: ASTNode, absoluteX: number, absoluteY: number) => {
    const hasChildren = node.children.length > 0;
    const width = node.width || 150;
    const height = node.height || 80;
    
    // Node rectangle
    const rectRenderable: RectangleRenderable = {
      id: `rect-${node.id}`,
      type: 'rectangle',
      zIndex: zIndex++,
      x: absoluteX,
      y: absoluteY,
      width,
      height,
      fillColor: bgColor,
      strokeColor: borderColor,
      transparent: hasChildren,
      opacity: hasChildren ? 0 : 1,
      nodeId: node.id,
      isDraggable: true
    };
    stack.push(rectRenderable);
    
    // Node label (at top of rectangle)
    const labelRenderable: TextRenderable = {
      id: `label-${node.id}`,
      type: 'text',
      zIndex: zIndex++,
      x: absoluteX,
      y: absoluteY - height / 2 + 15,
      content: node.label,
      fontSize: 14,
      color: textColor,
      anchorX: 'center',
      anchorY: 'middle'
    };
    stack.push(labelRenderable);
    
    // Ports
    node.ports.forEach(port => {
      let portX = absoluteX;
      let portY = absoluteY;
      const portSize = 8;
      
      switch (port.side) {
        case 'left':
          portX = absoluteX - width / 2;
          break;
        case 'right':
          portX = absoluteX + width / 2;
          break;
        case 'top':
          portY = absoluteY - height / 2;
          break;
        case 'bottom':
          portY = absoluteY + height / 2;
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
        x: absoluteX + 57,
        y: absoluteY,
        color: textColor,
        strokeColor: borderColor
      };
      stack.push(bookIconRenderable);
    }
    
    // Process children (with absolute positions)
    node.children.forEach(child => {
      const childAbsoluteX = absoluteX + (child.x || 0);
      const childAbsoluteY = absoluteY + (child.y || 0);
      processNode(child, childAbsoluteX, childAbsoluteY);
    });
  };
  
  // Process all root nodes
  ast.rootNodes.forEach(rootNode => {
    processNode(rootNode, rootNode.x || 0, rootNode.y || 0);
  });
  
  // TODO: Add edge renderables
  
  return stack;
}

// Find node in AST by ID (recursive search)
export function findNodeInAST(ast: DiagramAST, nodeId: string): ASTNode | null {
  const search = (nodes: ASTNode[]): ASTNode | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      const found = search(node.children);
      if (found) return found;
    }
    return null;
  };
  
  return search(ast.rootNodes);
}

