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

export type ConnectorRenderable = 
  | SimpleConnectorRenderable 
  | DelegateConnectorRenderable 
  | InterfaceConnectorRenderable;

export interface BaseConnectorRenderable extends BaseRenderable {
  type: 'connector';
  points: [number, number][]; // Start and End points usually
  color: string;
  lineWidth: number;
  label?: string;
  labelColor?: string;
}

export interface SimpleConnectorRenderable extends BaseConnectorRenderable {
  connectorType: 'simple';
  symbolStart?: 'arrow' | 'none'; // Standard arrows
  symbolEnd?: 'arrow' | 'none';
}

export interface DelegateConnectorRenderable extends BaseConnectorRenderable {
  connectorType: 'delegate';
  dashed: boolean;
  dashSize?: number;
  symbolEnd?: 'arrow';
}

export interface InterfaceConnectorRenderable extends BaseConnectorRenderable {
  connectorType: 'interface';
  // "Ball" is provider, "Socket" is requirer
  providerSymbol?: 'ball';
  requirerSymbol?: 'socket'; 
  // We need to know which end has which.
  // Actually, let's keep it abstract:
  // e.g. "symbolStart" and "symbolEnd" but typed?
  // Or better:
  startSymbol?: 'ball' | 'socket-left' | 'socket-right'; 
  endSymbol?: 'ball' | 'socket-left' | 'socket-right';
  symbolColor?: string;
  symbolBgColor?: string;
}

export type Renderable = 
  | RectangleRenderable
  | TextRenderable
  | PortRenderable
  | BookIconRenderable
  | ConnectorRenderable;

export type RenderStack = Renderable[];
