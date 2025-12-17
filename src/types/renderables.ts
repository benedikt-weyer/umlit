// Flat, absolute-positioned draw instructions
// These are NOT tree objects - they are simple draw commands

export type RenderableType = 'rectangle' | 'text' | 'port' | 'book-icon' | 'connector';

interface BaseRenderable {
  id: string;
  type: RenderableType;
  zIndex: number;
  x: number; // Absolute position
  y: number; // Absolute position
}

export interface RectangleRenderable extends BaseRenderable {
  type: 'rectangle';
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  transparent?: boolean;
  opacity?: number;
  nodeId?: string; // For drag handling
  isDraggable?: boolean;
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
  portId: string; // For edge connections
  label?: string;
}

export interface BookIconRenderable extends BaseRenderable {
  type: 'book-icon';
  color: string;
  strokeColor: string;
}

export interface ConnectorRenderable extends BaseRenderable {
  type: 'connector';
  points: [number, number][];
  color: string;
  lineWidth: number;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
  symbolLeft?: 'ball' | 'socket-left' | 'socket-right' | 'arrow';
  symbolRight?: 'ball' | 'socket-left' | 'socket-right' | 'arrow';
  symbolColor?: string;
  symbolBgColor?: string;
  label?: string;
  labelColor?: string;
}

export type Renderable = 
  | RectangleRenderable
  | TextRenderable
  | PortRenderable
  | BookIconRenderable
  | ConnectorRenderable;

export type RenderStack = Renderable[];
