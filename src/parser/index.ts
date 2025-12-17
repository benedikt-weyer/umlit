import type { Diagram, Node, Connector, Port } from '../types';
import { parseToAST } from './astParser';
import type { DiagramAST, ASTNode } from '../types/ast';

import { type Token } from './lexer';

export type ParseResult = {
  diagram: Diagram;
  ast?: DiagramAST;
  tokens?: Token[];
  error?: Error | unknown;
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
  
  // Helper function to find parent of a node
  function getParentId(nodeId: string): string | undefined {
    const node = nodes.find(n => n.id === nodeId);
    return node?.parentId;
  }
  
  // Helper to find AST node by ID (recursive)
  function findASTNode(nodeId: string, searchNodes: ASTNode[] = ast.rootNodes): ASTNode | undefined {
    for (const node of searchNodes) {
      if (node.id === nodeId) return node;
      const found = findASTNode(nodeId, node.children);
      if (found) return found;
    }
    return undefined;
  }
  
  
  // Helper to check if node is at same level (same parent)
  function areSameLevel(nodeId1: string, nodeId2: string): boolean {
    return getParentId(nodeId1) === getParentId(nodeId2);
  }
  
  // Process connectors and generate delegates
  const connectors: Connector[] = [];
  const processedConnectors = new Map<string, typeof ast.connectors[0]>();
  
  ast.connectors.forEach(c => {
    // Store connector by name or id for port reference lookup
    if (c.name) {
      processedConnectors.set(c.name, c);
    }
    
    // Check if cross-level connection
    if (!areSameLevel(c.sourceNodeId, c.targetNodeId)) {
      // Find which node is inside a parent
      const sourceParent = getParentId(c.sourceNodeId);
      const targetParent = getParentId(c.targetNodeId);
      
      // Determine interface direction from connector type
      // -())- means source provides (ball), target requires (socket)
      // -(()- means source requires (socket), target provides (ball)
      const isSourceProvider = c.edgeType?.includes('())');
      
      if (sourceParent && !targetParent) {
        // Source is inside a parent, target is outside
        // Need to create: delegate inside parent (with ball/socket at port), port on parent, full connector outside
        
        // Find port by connector reference (from 'port [p1] with [Connection1]')
        // or by explicit port ID, or create new one
        let port: Port | undefined;
        if (c.name) {
          // Look for port with matching connectorRef
          const astNode = findASTNode(sourceParent);
          const portWithRef = astNode?.ports.find(p => p.connectorRef === c.name);
          if (portWithRef) {
            port = ports.find(p => p.id === portWithRef.id && p.nodeId === sourceParent);
          }
        }
        
        if (!port) {
          const portId = c.sourcePortId || `port-${c.id}`;
          port = ports.find(p => p.id === portId && p.nodeId === sourceParent);
        }
        
        if (!port) {
          const portId = c.sourcePortId || `port-${c.id}`;
          port = {
            id: portId,
            nodeId: sourceParent,
            label: c.label,
            side: 'right', // Default, should be determined by layout
            offset: 0
          };
          ports.push(port);
        }
        
        const portId = port.id;
        
        // Create interface connector inside parent: port → child (renderer will add delegate arrow)
        // Internal symbol is OPPOSITE of external: if external provides, internal requires (socket)
        connectors.push({
          id: `${c.id}-interface`,
          source: sourceParent,
          target: c.sourceNodeId,
          sourcePort: portId,
          type: isSourceProvider ? '-((' : '-())',  // REVERSED: external ball → internal socket, external socket → internal ball
          label: undefined,
          isDelegate: false,
          stereotype: undefined,
          isAutoGenerated: true,
          isCrossLevel: true // Mark for delegate rendering
        } as Connector);
        
        // Create cross-level interface connector (renderer will add full lollipop + delegate)
        connectors.push({
          id: c.id,
          source: c.targetNodeId,
          target: sourceParent,
          targetPort: portId,
          label: c.label,
          type: c.edgeType, // Keep original interface type
          isCrossLevel: true,
          isDelegate: false,
          stereotype: c.stereotype
        });
        
      } else if (targetParent && !sourceParent) {
        // Target is inside a parent, source is outside
        
        // Find port by connector reference (from 'port [p1] with [Connection1]')
        // or by explicit port ID, or create new one
        let port: Port | undefined;
        if (c.name) {
          // Look for port with matching connectorRef
          const astNode = findASTNode(targetParent);
          const portWithRef = astNode?.ports.find(p => p.connectorRef === c.name);
          if (portWithRef) {
            port = ports.find(p => p.id === portWithRef.id && p.nodeId === targetParent);
          }
        }
        
        if (!port) {
          const portId = c.targetPortId || `port-${c.id}`;
          port = ports.find(p => p.id === portId && p.nodeId === targetParent);
        }
        
        if (!port) {
          const portId = c.targetPortId || `port-${c.id}`;
          port = {
            id: portId,
            nodeId: targetParent,
            label: c.label,
            side: 'left', // Default
            offset: 0
          };
          ports.push(port);
        }
        
        const portId = port.id;
        
        // Create cross-level interface connector (renderer will add full lollipop + delegate)
        connectors.push({
          id: c.id,
          source: c.sourceNodeId,
          target: targetParent,
          targetPort: portId,
          label: c.label,
          type: c.edgeType, // Keep original interface type
          isCrossLevel: true,
          isDelegate: false,
          stereotype: c.stereotype
        });
        
        // Create interface connector inside parent (renderer will add delegate arrow)
        // Internal symbol is OPPOSITE of external: if external provides, internal requires (socket)
        connectors.push({
          id: `${c.id}-interface`,
          source: targetParent,
          target: c.targetNodeId,
          sourcePort: portId,
          type: isSourceProvider ? '-((' : '-())',  // REVERSED: external ball → internal socket, external socket → internal ball
          label: undefined,
          isDelegate: false,
          stereotype: undefined,
          isAutoGenerated: true,
          isCrossLevel: true // Mark for delegate rendering
        } as Connector);
        
      } else if (sourceParent && targetParent && sourceParent !== targetParent) {
        // Both inside different parents - need two delegates and external connection
        // This is more complex, for now just create basic connection
        connectors.push({
          id: c.id,
          source: c.sourceNodeId,
          target: c.targetNodeId,
          label: c.label,
          type: c.edgeType,
          isDelegate: c.isDelegate,
          stereotype: c.stereotype,
          sourcePort: c.sourcePortId,
          targetPort: c.targetPortId
        });
      }
      
    } else {
      // Same level connection - just add as is
      connectors.push({
        id: c.id,
        source: c.sourceNodeId,
        target: c.targetNodeId,
        label: c.label,
        type: c.edgeType,
        isDelegate: c.isDelegate,
        stereotype: c.stereotype,
        sourcePort: c.sourcePortId,
        targetPort: c.targetPortId
      });
    }
  });

  return {
    type: ast.type,
    nodes,
    connectors,
    ports
  };
}
