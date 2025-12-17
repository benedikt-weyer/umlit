import type { Diagram, Node, Connector, Port } from '../types';
import { parseToAST } from './astParser';
import type { DiagramAST, ASTNode } from '../types/ast';

import { type Token } from './lexer';

export type ParseResult = {
  diagram: Diagram;
  ast?: DiagramAST;
  tokens?: Token[];
  error?: Error | any;
};

export function parseDiagram(code: string): ParseResult {
  try {
    const ast = parseToAST(code);
    return { 
      diagram: convertASTToDiagram(ast), // ast matches DiagramAST interface? parseToAST returns generic ParsedCst?
                                         // ParsedCst in astParser was internal interface.
                                         // But parseToAST body returns { ... } which should match DiagramAST.
                                         // Let's ensure DiagramAST in types/ast.ts is correct.
      ast,
      tokens: ast.tokens
    };
  } catch (error) {
    console.error("Parsing error:", error);
    return {
      diagram: {
        type: 'uml2.5-component',
        nodes: [],
        connectors: [],
        ports: []
      },
      error
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
  
  // Process connectors
  const connectors: Connector[] = ast.connectors.map(c => ({
    id: c.id,
    source: c.sourceNodeId,
    target: c.targetNodeId,
    label: c.label,
    type: c.edgeType,
    isDelegate: c.isDelegate,
    stereotype: c.stereotype,
    sourcePort: c.sourcePortId,
    targetPort: c.targetPortId
  }));

  return {
    type: ast.type,
    nodes,
    connectors,
    ports
  };
}
