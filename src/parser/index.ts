import type { Diagram, Node, Edge, Port, DiagramType } from '../types';

const MAX_DEPTH = 50;

export function parseDiagram(code: string): Diagram {
  const trimmedCode = code.trim();
  
  // Detect diagram type from wrapper: [diagram-type] { ... }
  const diagramTypeMatch = trimmedCode.match(/^\[([^\]]+)\]\s*\{([\s\S]*)\}$/);
  
  let diagramType: DiagramType = 'uml2.5-component'; // Default
  let content = trimmedCode;
  
  if (diagramTypeMatch) {
    const typeString = diagramTypeMatch[1];
    content = diagramTypeMatch[2];
    
    // Validate and set diagram type
    if (typeString === 'uml2.5-component' || 
        typeString === 'uml2.5-class' || 
        typeString === 'uml2.5-sequence' || 
        typeString === 'uml2.5-activity') {
      diagramType = typeString as DiagramType;
    } else {
      console.warn(`Unknown diagram type: ${typeString}, defaulting to uml2.5-component`);
    }
  }
  
  // Parse based on diagram type
  switch (diagramType) {
    case 'uml2.5-component':
      return parseComponentDiagram(content, diagramType);
    case 'uml2.5-class':
    case 'uml2.5-sequence':
    case 'uml2.5-activity':
      // TODO: Implement other diagram parsers
      console.warn(`${diagramType} not yet implemented, using component diagram parser`);
      return parseComponentDiagram(content, diagramType);
    default:
      return parseComponentDiagram(content, diagramType);
  }
}

function parseComponentDiagram(code: string, diagramType: DiagramType): Diagram {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const ports: Port[] = [];

  let edgeIdCounter = 0;
  let portIdCounter = 0;
  const nodeStack: { id: string; depth: number }[] = []; // Track nesting

  for (const line of lines) {
    // Start nested component: [id] label @ x,y {
    const nestedStartMatch = line.match(/^\[(\w+)\]\s+(.+?)(?:\s+@\s*(-?\d+),\s*(-?\d+))?\s*\{$/);
    if (nestedStartMatch) {
      const id = nestedStartMatch[1];
      const label = nestedStartMatch[2];
      const x = nestedStartMatch[3] ? parseInt(nestedStartMatch[3], 10) : 0;
      const y = nestedStartMatch[4] ? parseInt(nestedStartMatch[4], 10) : 0;
      const depth = nodeStack.length;
      
      if (depth >= MAX_DEPTH) {
        console.warn(`Max nesting depth (${MAX_DEPTH}) exceeded, skipping node ${id}`);
        continue;
      }
      
      const parentId = nodeStack.length > 0 ? nodeStack[nodeStack.length - 1].id : undefined;
      
      nodes.push({ 
        id, 
        label, 
        x, 
        y, 
        depth,
        parentId,
        children: []
      });
      
      // Add to parent's children list
      if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent && parent.children) {
          parent.children.push(id);
        }
      }
      
      nodeStack.push({ id, depth });
      continue;
    }

    // End nested component: }
    if (line === '}') {
      if (nodeStack.length > 0) {
        nodeStack.pop();
      }
      continue;
    }

    // Port definition: port [portId] on [nodeId] [side] : label
    const portMatch = line.match(/^port\s+\[(\w+)\]\s+on\s+\[(\w+)\]\s+(left|right|top|bottom)(?:\s*:\s*(.+))?$/);
    if (portMatch) {
      const portId = portMatch[1];
      const nodeId = portMatch[2];
      const side = portMatch[3] as 'left' | 'right' | 'top' | 'bottom';
      const label = portMatch[4];
      
      ports.push({
        id: portId,
        nodeId,
        side,
        label
      });
      continue;
    }

    // Node definition: [id] label @ x,y or [id] label
    const nodeMatch = line.match(/^\[(\w+)\]\s+(.+?)(?:\s+@\s*(-?\d+),\s*(-?\d+))?$/);
    if (nodeMatch) {
      const id = nodeMatch[1];
      const label = nodeMatch[2];
      const x = nodeMatch[3] ? parseInt(nodeMatch[3], 10) : 0;
      const y = nodeMatch[4] ? parseInt(nodeMatch[4], 10) : 0;
      const depth = nodeStack.length;
      const parentId = nodeStack.length > 0 ? nodeStack[nodeStack.length - 1].id : undefined;
      
      nodes.push({ 
        id, 
        label, 
        x, 
        y, 
        depth,
        parentId
      });
      
      // Add to parent's children list
      if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent && parent.children) {
          parent.children.push(id);
        }
      }
      continue;
    }

    // Delegate edge: source ->delegate-> target or source.portId ->delegate-> target.portId
    const delegateMatch = line.match(/^([\w.]+)\s+->delegate->\s+([\w.]+)(?:\s*:\s*(.+))?$/);
    if (delegateMatch) {
      const sourceParts = delegateMatch[1].split('.');
      const targetParts = delegateMatch[2].split('.');
      const source = sourceParts[0];
      const sourcePort = sourceParts[1];
      const target = targetParts[0];
      const targetPort = targetParts[1];
      const label = delegateMatch[3];
      
      edges.push({
        id: `edge-${edgeIdCounter++}`,
        source,
        target,
        label,
        isDelegate: true,
        stereotype: 'delegate',
        sourcePort,
        targetPort
      });
      continue;
    }

    // Edge with interface symbols: compact notation like -())- or -(()-
    const interfaceMatch = line.match(/^([\w.]+)\s+(-(?:\(\)|[()])+-)?\s+([\w.]+)(?:\s*:\s*(.+))?$/);
    if (interfaceMatch && interfaceMatch[2]) {
      const sourceParts = interfaceMatch[1].split('.');
      const source = sourceParts[0];
      const sourcePort = sourceParts[1];
      const edgeType = interfaceMatch[2].trim();
      const targetParts = interfaceMatch[3].split('.');
      const target = targetParts[0];
      const targetPort = targetParts[1];
      const label = interfaceMatch[4];
      
      edges.push({
        id: `edge-${edgeIdCounter++}`,
        source,
        target,
        label,
        type: edgeType,
        sourcePort,
        targetPort
      });
      continue;
    }

    // Regular edge: source -> target : label or source -> target
    const edgeMatch = line.match(/^([\w.]+)\s+->\s+([\w.]+)(?:\s*:\s*(.+))?$/);
    if (edgeMatch) {
      const sourceParts = edgeMatch[1].split('.');
      const source = sourceParts[0];
      const sourcePort = sourceParts[1];
      const targetParts = edgeMatch[2].split('.');
      const target = targetParts[0];
      const targetPort = targetParts[1];
      const label = edgeMatch[3];
      
      edges.push({
        id: `edge-${edgeIdCounter++}`,
        source,
        target,
        label,
        sourcePort,
        targetPort
      });
    }
  }

  return { type: diagramType, nodes, edges, ports };
}
