export type DiagramType = 
  | 'uml2.5-component'
  | 'uml2.5-class'
  | 'uml2.5-sequence'
  | 'uml2.5-activity';

export interface Port {
  id: string;
  nodeId: string; // The node this port belongs to
  label?: string;
  side: 'left' | 'right' | 'top' | 'bottom'; // Which side of the node
  offset?: number; // Position offset along the side
}

export interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  parentId?: string; // ID of parent component if nested
  depth?: number; // Nesting depth (0 = root, max 50)
  children?: string[]; // IDs of child nodes
  ports?: Port[]; // Ports for communication
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string; // Interface types: ()--,  --(), (--, --), etc.
  isDelegate?: boolean; // True for delegate arrows (dashed)
  stereotype?: string; // e.g., "delegate" for <<delegate>>
  sourcePort?: string; // Port ID if connecting through a port
  targetPort?: string; // Port ID if connecting through a port
}

export interface Diagram {
  type: DiagramType;
  nodes: Node[];
  edges: Edge[];
  ports: Port[];
}
