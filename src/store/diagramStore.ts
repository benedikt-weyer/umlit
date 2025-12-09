import { create } from 'zustand';
import { parseToAST } from '../parser/astParser';
import { applyAutoLayout } from '../layout/layoutEngine';
import type { DiagramAST, ASTNode } from '../types/ast';

const DEFAULT_CODE = `[uml2.5-component] {
  [NodeA] User
  [NodeB] Service {
    [NodeB1] Handler
    [NodeB2] Logic
    port [p1] on [NodeB] left : API
    NodeB1 -> NodeB2
  }
  [NodeC] Database

  NodeA -())- NodeB
  NodeB.p1 ->delegate-> NodeB1
  NodeB -(()- NodeC
}`;

interface DiagramStore {
  code: string;
  ast: DiagramAST;
  
  // Actions
  setCode: (code: string) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  runAutoLayout: () => void;
}

// Helper: Find and update node position in AST tree (recursive)
function updateNodePositionInTree(nodes: ASTNode[], nodeId: string, x: number, y: number): { updated: boolean; deltaX: number; deltaY: number } {
  for (const node of nodes) {
    if (node.id === nodeId) {
      const oldX = node.x || 0;
      const oldY = node.y || 0;
      const deltaX = x - oldX;
      const deltaY = y - oldY;
      
      // Move node and all its descendants
      const moveNodeTree = (n: ASTNode, dx: number, dy: number) => {
        n.x = (n.x || 0) + dx;
        n.y = (n.y || 0) + dy;
        n.children.forEach(child => moveNodeTree(child, dx, dy));
      };
      
      moveNodeTree(node, deltaX, deltaY);
      return { updated: true, deltaX, deltaY };
    }
    
    // Search in children
    const result = updateNodePositionInTree(node.children, nodeId, x, y);
    if (result.updated) return result;
  }
  
  return { updated: false, deltaX: 0, deltaY: 0 };
}

// Helper: Serialize AST back to code (with updated positions)
function serializeAST(ast: DiagramAST): string {
  const lines: string[] = [];
  
  lines.push(`[${ast.type}] {`);
  
  // Serialize nodes (recursive)
  const serializeNode = (node: ASTNode, indent: string) => {
    const hasChildren = node.children.length > 0;
    const coords = node.x !== undefined && node.y !== undefined ? ` @ ${Math.round(node.x)},${Math.round(node.y)}` : '';
    
    if (hasChildren) {
      lines.push(`${indent}[${node.id}] ${node.label}${coords} {`);
      
      // Serialize ports
      node.ports.forEach(port => {
        const label = port.label ? ` : ${port.label}` : '';
        lines.push(`${indent}  port [${port.id}] on [${node.id}] ${port.side}${label}`);
      });
      
      // Serialize children
      node.children.forEach(child => serializeNode(child, indent + '  '));
      
      lines.push(`${indent}}`);
    } else {
      lines.push(`${indent}[${node.id}] ${node.label}${coords}`);
      
      // Serialize ports
      node.ports.forEach(port => {
        const label = port.label ? ` : ${port.label}` : '';
        lines.push(`${indent}port [${port.id}] on [${node.id}] ${port.side}${label}`);
      });
    }
  };
  
  ast.rootNodes.forEach(node => serializeNode(node, '  '));
  
  // Serialize edges
  ast.edges.forEach(edge => {
    const source = edge.sourcePortId ? `${edge.sourceNodeId}.${edge.sourcePortId}` : edge.sourceNodeId;
    const target = edge.targetPortId ? `${edge.targetNodeId}.${edge.targetPortId}` : edge.targetNodeId;
    const label = edge.label ? ` : ${edge.label}` : '';
    
    if (edge.isDelegate) {
      lines.push(`  ${source} ->delegate-> ${target}${label}`);
    } else if (edge.edgeType) {
      lines.push(`  ${source} ${edge.edgeType} ${target}${label}`);
    } else {
      lines.push(`  ${source} -> ${target}${label}`);
    }
  });
  
  lines.push('}');
  
  return lines.join('\n');
}

export const useDiagramStore = create<DiagramStore>((set) => {
  // Initialize with auto-layout
  const initialAST = parseToAST(DEFAULT_CODE);
  const layoutedAST = applyAutoLayout(initialAST);
  const initialCode = serializeAST(layoutedAST);
  
  return {
    code: initialCode,
    ast: layoutedAST,
    
    setCode: (code) => {
      const newAST = parseToAST(code);
      set({ code, ast: newAST });
    },
    
    updateNodePosition: (nodeId, x, y) => {
      set((state) => {
        const newAST = JSON.parse(JSON.stringify(state.ast)); // Deep clone
        updateNodePositionInTree(newAST.rootNodes, nodeId, x, y);
        const newCode = serializeAST(newAST);
        return { ast: newAST, code: newCode };
      });
    },
    
    runAutoLayout: () => {
      set((state) => {
        const layoutedAST = applyAutoLayout(state.ast);
        const newCode = serializeAST(layoutedAST);
        return { ast: layoutedAST, code: newCode };
      });
    }
  };
});

