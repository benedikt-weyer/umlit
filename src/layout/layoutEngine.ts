import type { DiagramAST, ASTNode } from '../types/ast';

// Constants for layout
const CHILD_SPACING = 30;
const LABEL_SPACE = 35;
const SIDE_PADDING = 20;
const VERTICAL_PADDING = 20;

const GRID_HORIZONTAL_SPACING = 200;
const GRID_VERTICAL_SPACING = 150;
const GRID_START_X = 50;
const GRID_START_Y = 50;

// Calculate bounds of a positioned node (recursive)
function calculateNodeBounds(node: ASTNode): { width: number; height: number } {
  if (node.children.length === 0) {
    return { width: 150, height: 80 };
  }
  
  // Get bounding box of all children
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  node.children.forEach(child => {
    const childBounds = calculateNodeBounds(child);
    const childX = child.x || 0;
    const childY = child.y || 0;
    
    minX = Math.min(minX, childX - childBounds.width / 2);
    maxX = Math.max(maxX, childX + childBounds.width / 2);
    minY = Math.min(minY, childY - childBounds.height / 2);
    maxY = Math.max(maxY, childY + childBounds.height / 2);
  });
  
  const width = Math.max(200, (maxX - minX) + SIDE_PADDING * 2);
  const height = Math.max(120, (maxY - minY) + VERTICAL_PADDING * 2 + LABEL_SPACE);
  
  return { width, height };
}

// Layout children within parent (recursive, bottom-up)
function layoutChildren(node: ASTNode, parentX: number = 0, parentY: number = 0): void {
  if (node.children.length === 0) return;
  
  // First, recursively layout all grandchildren
  node.children.forEach(child => {
    layoutChildren(child, 0, 0);
  });
  
  // Now position children in vertical stack
  let currentY = parentY;
  
  node.children.forEach((child, index) => {
    const childBounds = calculateNodeBounds(child);
    
    child.x = parentX;
    child.y = currentY + (index === 0 ? childBounds.height / 2 : 0);
    
    // Layout this child's children relative to its position
    layoutChildren(child, child.x, child.y);
    
    currentY = child.y + childBounds.height / 2 + CHILD_SPACING;
  });
  
  // Now calculate and set this node's size
  const bounds = calculateNodeBounds(node);
  node.width = bounds.width;
  node.height = bounds.height;
}

// Apply auto-layout to entire AST
export function applyAutoLayout(ast: DiagramAST): DiagramAST {
  const newAST = JSON.parse(JSON.stringify(ast)); // Deep clone
  
  if (newAST.rootNodes.length === 0) return newAST;
  
  // Calculate grid layout for roots
  const cols = Math.ceil(Math.sqrt(newAST.rootNodes.length));
  
  newAST.rootNodes.forEach((rootNode, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    // Temp position for laying out children
    const tempX = 0;
    const tempY = 0;
    
    // Layout children first
    layoutChildren(rootNode, tempX, tempY);
    
    // Calculate final bounds
    const bounds = calculateNodeBounds(rootNode);
    rootNode.width = bounds.width;
    rootNode.height = bounds.height;
    
    // Calculate grid position
    const gridX = GRID_START_X + col * (bounds.width + GRID_HORIZONTAL_SPACING);
    const gridY = GRID_START_Y + row * (bounds.height + GRID_VERTICAL_SPACING);
    
    // Calculate delta
    const deltaX = gridX - tempX;
    const deltaY = gridY - tempY;
    
    // Move root and all descendants
    const moveNodeAndDescendants = (node: ASTNode, dx: number, dy: number) => {
      node.x = (node.x || 0) + dx;
      node.y = (node.y || 0) + dy;
      node.children.forEach(child => moveNodeAndDescendants(child, dx, dy));
    };
    
    moveNodeAndDescendants(rootNode, deltaX, deltaY);
  });
  
  return newAST;
}

