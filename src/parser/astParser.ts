import type { DiagramAST, ASTNode, ASTEdge, ASTPort, DiagramType } from '../types/ast';

const MAX_DEPTH = 50;

export function parseToAST(code: string): DiagramAST {
  const trimmedCode = code.trim();
  
  // Detect diagram type from wrapper: [diagram-type] { ... }
  const diagramTypeMatch = trimmedCode.match(/^\[([^\]]+)\]\s*\{([\s\S]*)\}$/);
  
  let diagramType: DiagramType = 'uml2.5-component';
  let content = trimmedCode;
  
  if (diagramTypeMatch) {
    const typeString = diagramTypeMatch[1];
    content = diagramTypeMatch[2];
    
    if (typeString === 'uml2.5-component' || 
        typeString === 'uml2.5-class' || 
        typeString === 'uml2.5-sequence' || 
        typeString === 'uml2.5-activity') {
      diagramType = typeString as DiagramType;
    }
  }
  
  return parseComponentDiagramAST(content, diagramType);
}

function parseComponentDiagramAST(code: string, diagramType: DiagramType): DiagramAST {
  const lines = code.split('\n');
  const rootNodes: ASTNode[] = [];
  const edges: ASTEdge[] = [];
  
  let edgeIdCounter = 0;
  
  // Stack for tracking nested nodes
  const nodeStack: ASTNode[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const currentDepth = nodeStack.length;
    if (currentDepth >= MAX_DEPTH) {
      console.warn(`Max nesting depth (${MAX_DEPTH}) exceeded`);
      continue;
    }
    
    // End nested component: }
    if (line === '}') {
      if (nodeStack.length > 0) {
        nodeStack.pop();
      }
      continue;
    }
    
    // Node with nested children: [id] label @ x,y {
    const nestedNodeMatch = line.match(/^\[(\w+)\]\s+(.+?)(?:\s+@\s*(-?\d+),\s*(-?\d+))?\s*\{$/);
    if (nestedNodeMatch) {
      const id = nestedNodeMatch[1];
      const label = nestedNodeMatch[2];
      const x = nestedNodeMatch[3] ? parseInt(nestedNodeMatch[3], 10) : undefined;
      const y = nestedNodeMatch[4] ? parseInt(nestedNodeMatch[4], 10) : undefined;
      
      const node: ASTNode = {
        id,
        label,
        x,
        y,
        children: [],
        ports: []
      };
      
      // Add to parent or root
      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].children.push(node);
      } else {
        rootNodes.push(node);
      }
      
      nodeStack.push(node);
      continue;
    }
    
    // Simple node: [id] label @ x,y
    const simpleNodeMatch = line.match(/^\[(\w+)\]\s+(.+?)(?:\s+@\s*(-?\d+),\s*(-?\d+))?$/);
    if (simpleNodeMatch) {
      const id = simpleNodeMatch[1];
      const label = simpleNodeMatch[2];
      const x = simpleNodeMatch[3] ? parseInt(simpleNodeMatch[3], 10) : undefined;
      const y = simpleNodeMatch[4] ? parseInt(simpleNodeMatch[4], 10) : undefined;
      
      const node: ASTNode = {
        id,
        label,
        x,
        y,
        children: [],
        ports: []
      };
      
      // Add to parent or root
      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].children.push(node);
      } else {
        rootNodes.push(node);
      }
      continue;
    }
    
    // Port definition: port [portId] on [nodeId] side : label
    const portMatch = line.match(/^port\s+\[(\w+)\]\s+on\s+\[(\w+)\]\s+(left|right|top|bottom)(?:\s*:\s*(.+))?$/);
    if (portMatch) {
      const portId = portMatch[1];
      const nodeId = portMatch[2];
      const side = portMatch[3] as 'left' | 'right' | 'top' | 'bottom';
      const label = portMatch[4];
      
      // Find the node in the tree and add port
      const findAndAddPort = (nodes: ASTNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === nodeId) {
            node.ports.push({ id: portId, label, side });
            return true;
          }
          if (findAndAddPort(node.children)) {
            return true;
          }
        }
        return false;
      };
      
      if (nodeStack.length > 0) {
        findAndAddPort([nodeStack[0]]);
      } else {
        findAndAddPort(rootNodes);
      }
      continue;
    }
    
    // Delegate edge: source ->delegate-> target
    const delegateMatch = line.match(/^([\w.]+)\s+->delegate->\s+([\w.]+)(?:\s*:\s*(.+))?$/);
    if (delegateMatch) {
      const sourceParts = delegateMatch[1].split('.');
      const targetParts = delegateMatch[2].split('.');
      
      edges.push({
        id: `edge-${edgeIdCounter++}`,
        sourceNodeId: sourceParts[0],
        targetNodeId: targetParts[0],
        sourcePortId: sourceParts[1],
        targetPortId: targetParts[1],
        label: delegateMatch[3],
        isDelegate: true,
        stereotype: 'delegate'
      });
      continue;
    }
    
    // Edge with interface symbols: -())- or -(()-
    const interfaceMatch = line.match(/^([\w.]+)\s+(-(?:\(\)|[()])+-)?\s+([\w.]+)(?:\s*:\s*(.+))?$/);
    if (interfaceMatch && interfaceMatch[2]) {
      const sourceParts = interfaceMatch[1].split('.');
      const targetParts = interfaceMatch[3].split('.');
      
      edges.push({
        id: `edge-${edgeIdCounter++}`,
        sourceNodeId: sourceParts[0],
        targetNodeId: targetParts[0],
        sourcePortId: sourceParts[1],
        targetPortId: targetParts[1],
        edgeType: interfaceMatch[2].trim(),
        label: interfaceMatch[4]
      });
      continue;
    }
    
    // Regular edge: source -> target
    const edgeMatch = line.match(/^([\w.]+)\s+->\s+([\w.]+)(?:\s*:\s*(.+))?$/);
    if (edgeMatch) {
      const sourceParts = edgeMatch[1].split('.');
      const targetParts = edgeMatch[2].split('.');
      
      edges.push({
        id: `edge-${edgeIdCounter++}`,
        sourceNodeId: sourceParts[0],
        targetNodeId: targetParts[0],
        sourcePortId: sourceParts[1],
        targetPortId: targetParts[1],
        label: edgeMatch[3]
      });
    }
  }
  
  return {
    type: diagramType,
    rootNodes,
    edges
  };
}

