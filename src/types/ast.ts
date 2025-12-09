// Abstract Syntax Tree - Tree representation of diagram objects
// This is the intermediate representation between parsing and rendering

export type DiagramType = 
  | 'uml2.5-component'
  | 'uml2.5-class'
  | 'uml2.5-sequence'
  | 'uml2.5-activity';

export interface ASTPort {
  id: string;
  label?: string;
  side: 'left' | 'right' | 'top' | 'bottom';
  offset?: number;
}

export interface ASTNode {
  id: string;
  label: string;
  x?: number; // Optional: may be set by layout or user
  y?: number; // Optional: may be set by layout or user
  width?: number; // Computed by layout
  height?: number; // Computed by layout
  children: ASTNode[]; // Tree structure - children nested here
  ports: ASTPort[];
}

export interface ASTEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePortId?: string;
  targetPortId?: string;
  label?: string;
  edgeType?: string; // e.g., "-())-" for ball-and-socket
  isDelegate?: boolean;
  stereotype?: string; // e.g., "delegate"
}

export interface DiagramAST {
  type: DiagramType;
  rootNodes: ASTNode[]; // Top-level nodes only
  edges: ASTEdge[]; // All edges (flat list)
}

