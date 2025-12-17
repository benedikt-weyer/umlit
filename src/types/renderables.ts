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

// Simple connector types that can be chained
export type ConnectorRenderable = 
  | LineConnectorRenderable 
  | BallConnectorRenderable 
  | SocketConnectorRenderable;

export interface BaseConnectorRenderable extends BaseRenderable {
  type: 'connector';
  color: string;
  lineWidth: number;
}

// Simple line connector - can be solid or dashed, with optional arrow and label
export interface LineConnectorRenderable extends BaseConnectorRenderable {
  connectorType: 'line';
  points: [number, number][]; // Start and End points
  dashed?: boolean;
  dashSize?: number;
  arrowEnd?: boolean; // Arrow at end point
  arrowStart?: boolean; // Arrow at start point
  label?: string;
  labelColor?: string;
}

// Ball symbol connector (provider interface)
export interface BallConnectorRenderable extends BaseConnectorRenderable {
  connectorType: 'ball';
  x: number;
  y: number;
  radius: number;
  fillColor: string;
}

// Socket symbol connector (requirer interface)
export interface SocketConnectorRenderable extends BaseConnectorRenderable {
  connectorType: 'socket';
  x: number;
  y: number;
  radius: number;
  angle: number; // Rotation angle for the socket opening
  direction: 'left' | 'right'; // Which way the socket opens
}

export type Renderable = 
  | RectangleRenderable
  | TextRenderable
  | PortRenderable
  | BookIconRenderable
  | ConnectorRenderable;

export type RenderStack = Renderable[];
