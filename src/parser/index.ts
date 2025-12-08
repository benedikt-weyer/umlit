import type { Diagram, Node, Edge } from '../types';

export function parseDiagram(input: string): Diagram {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const lines = input.split('\n');

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) return;

    // Node definition: [id] label
    // Or just: id
    // With optional position: [id] label @ x,y
    const nodeMatch = trimmed.match(/^\[(\w+)\]\s*(.*?)(?:\s*@\s*(-?\d+),(-?\d+))?$/);
    if (nodeMatch) {
      const [, id, label, x, y] = nodeMatch;
      nodes.push({
        id,
        label: label || id,
        x: x ? parseInt(x, 10) : 0,
        y: y ? parseInt(y, 10) : 0,
      });
      return;
    }

    // Edge definition: id1 -> id2 : label
    const edgeMatch = trimmed.match(/^(\w+)\s*->\s*(\w+)(?:\s*:\s*(.*))?$/);
    if (edgeMatch) {
      const [, source, target, label] = edgeMatch;
      edges.push({
        id: `${source}-${target}`,
        source,
        target,
        label: label || '',
      });
      return;
    }
  });

  return { nodes, edges };
}
