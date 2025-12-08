import type { Diagram, Node, Edge } from '../types';

export function parseDiagram(code: string): Diagram {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let edgeIdCounter = 0;

  for (const line of lines) {
    // Node definition: [id] label @ x,y or [id] label
    const nodeMatch = line.match(/^\[(\w+)\]\s+(.+?)(?:\s+@\s*(-?\d+),\s*(-?\d+))?$/);
    if (nodeMatch) {
      const id = nodeMatch[1];
      const label = nodeMatch[2];
      const x = nodeMatch[3] ? parseInt(nodeMatch[3], 10) : 0;
      const y = nodeMatch[4] ? parseInt(nodeMatch[4], 10) : 0;
      nodes.push({ id, label, x, y });
      continue;
    }

    // Edge with interface symbols: compact notation like -())- or -(()-
    const interfaceMatch = line.match(/^(\w+)\s+(-(?:\(\)|[()])+-)?\s+(\w+)(?:\s*:\s*(.+))?$/);
    if (interfaceMatch && interfaceMatch[2]) {
      const source = interfaceMatch[1];
      const edgeType = interfaceMatch[2].trim();
      const target = interfaceMatch[3];
      const label = interfaceMatch[4];
      
      edges.push({
        id: `edge-${edgeIdCounter++}`,
        source,
        target,
        label,
        type: edgeType
      });
      continue;
    }

    // Regular edge: source -> target : label or source -> target
    const edgeMatch = line.match(/^(\w+)\s+->\s+(\w+)(?:\s*:\s*(.+))?$/);
    if (edgeMatch) {
      const source = edgeMatch[1];
      const target = edgeMatch[2];
      const label = edgeMatch[3];
      edges.push({
        id: `edge-${edgeIdCounter++}`,
        source,
        target,
        label
      });
    }
  }

  return { nodes, edges };
}
