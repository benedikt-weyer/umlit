// Renderable types - draw instructions with absolute positioning
export type RenderableType = 
  | 'rectangle'
  | 'text'
  | 'port'
  | 'edge'
  | 'book-icon';

export interface BaseRenderable {
  id: string;
  type: RenderableType;
  zIndex: number; // For layering
  x: number; // Absolute world position
  y: number; // Absolute world position
}

export interface RectangleRenderable extends BaseRenderable {
  type: 'rectangle';
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  transparent: boolean;
  opacity: number;
  nodeId: string; // Reference to the node this belongs to
  isDraggable: boolean;
}

export interface TextRenderable extends BaseRenderable {
  type: 'text';
  content: string;
  fontSize: number;
  color: string;
  anchorX: 'left' | 'center' | 'right';
  anchorY: 'top' | 'middle' | 'bottom';
}

export interface PortRenderable extends BaseRenderable {
  type: 'port';
  size: number;
  color: string;
  strokeColor: string;
  portId: string;
  label?: string;
}

export interface EdgeRenderable extends BaseRenderable {
  type: 'edge';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
  edgeType?: string; // Interface symbols
  isDelegate?: boolean;
  stereotype?: string;
  dashed?: boolean;
}

export interface BookIconRenderable extends BaseRenderable {
  type: 'book-icon';
  color: string;
  strokeColor: string;
}

export type Renderable = 
  | RectangleRenderable
  | TextRenderable
  | PortRenderable
  | EdgeRenderable
  | BookIconRenderable;

export type RenderStack = Renderable[];

