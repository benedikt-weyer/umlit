import type { Diagram, Node, Edge, Port } from '../types';
import { parseToAST } from './astParser';
import type { DiagramAST, ASTNode } from '../types/ast';

export function parseDiagram(code: string): Diagram {
  try {
    const ast = parseToAST(code);
    return convertASTToDiagram(ast);
  } catch (error) {
    console.error("Parsing error:", error);
    // Return empty diagram or basic fallback if needed, but for now throwing or returning empty
    return {
      type: 'uml2.5-component',
      nodes: [],
      edges: [],
      ports: []
    };
  }
}

function convertASTToDiagram(ast: DiagramAST): Diagram {
  const nodes: Node[] = [];
  const ports: Port[] = [];
  
  // Recursively process nodes
  function processNode(astNode: ASTNode, parentId?: string, depth: number = 0): void {
    const node: Node = {
      id: astNode.id,
      label: astNode.label,
      x: astNode.x || 0,
      y: astNode.y || 0,
      width: astNode.width,
      height: astNode.height,
      parentId: parentId,
      depth: depth,
      children: astNode.children.map(c => c.id)
    };
    
    nodes.push(node);
    
    // Process ports
    astNode.ports.forEach(p => {
      ports.push({
        id: p.id,
        nodeId: astNode.id,
        label: p.label,
        side: p.side,
        offset: p.offset
      });
    });
    
    // Process children
    astNode.children.forEach(child => {
      processNode(child, astNode.id, depth + 1);
    });
  }
  
  ast.rootNodes.forEach(node => processNode(node));
  
  // Process edges
  const edges: Edge[] = ast.edges.map(e => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    label: e.label,
    type: e.edgeType,
    isDelegate: e.isDelegate,
    stereotype: e.stereotype,
    sourcePort: e.sourcePortId,
    targetPort: e.targetPortId
  }));

  return {
    type: ast.type,
    nodes,
    edges,
    ports
  };
}
