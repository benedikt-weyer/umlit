export type AtomicRenderableType = 'group' | 'rect' | 'text' | 'line' | 'arc' | 'circle';

export interface AtomicBase {
  id: string;
  type: AtomicRenderableType;
  x?: number;
  y?: number;
  rotation?: number;
  opacity?: number;
  scale?: { x: number; y: number };
}

export interface AtomicRect extends AtomicBase {
  type: 'rect';
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  draggable?: boolean;
  nodeId?: string; // For interaction mapping
}

export interface AtomicText extends AtomicBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily?: string;
  fill: string;
  width?: number; // For wrapping or alignment
  align?: string;
  offset?: { x: number; y: number };
}

export interface AtomicLine extends AtomicBase {
  type: 'line';
  points: number[];
  stroke: string;
  strokeWidth: number;
  dash?: number[];
  closed?: boolean;
  fill?: string; // For closed shapes like arrowheads
  hitStrokeWidth?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface AtomicArc extends AtomicBase {
  type: 'arc';
  innerRadius: number;
  outerRadius: number;
  angle: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface AtomicGroup extends AtomicBase {
  type: 'group';
  children: AtomicRenderable[];
  draggable?: boolean; // If group is draggable
  onDragStart?: (nodeId: string) => void; // Function ref/identifier? Actually we just need metadata to know it's interactive
  nodeId?: string; // For event handling identification
}


export interface AtomicCircle extends AtomicBase {
  type: 'circle';
  radius: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type AtomicRenderable = AtomicRect | AtomicText | AtomicLine | AtomicArc | AtomicCircle | AtomicGroup;

export type AtomicRenderStack = AtomicRenderable[];
