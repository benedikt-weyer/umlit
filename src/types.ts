export interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string; // Interface types: ()--,  --(), (--, --), etc.
}

export interface Diagram {
  nodes: Node[];
  edges: Edge[];
}
