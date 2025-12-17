import React from 'react';
import { Line, Circle, Ring, Arc, Text, Arrow, Group } from 'react-konva';
import type { Edge as EdgeType } from '../../types';
import { useStore } from '../../store';
import { useTheme } from '../ThemeContextProvider';

export const Edge: React.FC<EdgeType> = ({ source, target, type, isDelegate, stereotype, sourcePort, targetPort }) => {
  const diagram = useStore((state) => state.diagram);
  const { theme } = useTheme();
  
  const fromNode = diagram.nodes.find(n => n.id === source);
  const toNode = diagram.nodes.find(n => n.id === target);
  
  if (!fromNode || !toNode) return null;

  const lineColor = theme === 'dark' ? '#666666' : '#999999';
  const symbolColor = theme === 'dark' ? '#888888' : '#666666';
  const bgColor = theme === 'dark' ? '#0a0a0a' : '#fafafa';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';

  // Helper to get node dimensions
  const getNodeDimensions = (node: typeof fromNode): { width: number; height: number } => {
    const hasChildren = node.children && node.children.length > 0;
    if (!hasChildren) return { width: 150, height: 80 };
    
    // Calculate dynamic size for containers
    const childNodes = diagram.nodes.filter(n => n.parentId === node.id);
    if (childNodes.length === 0) return { width: 150, height: 80 };
    
    const sidePadding = 20;
    const labelSpace = 35;
    const verticalPadding = 20;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    childNodes.forEach(child => {
      const childDims = getNodeDimensions(child);
      minX = Math.min(minX, child.x - childDims.width / 2);
      maxX = Math.max(maxX, child.x + childDims.width / 2);
      minY = Math.min(minY, child.y - childDims.height / 2);
      maxY = Math.max(maxY, child.y + childDims.height / 2);
    });
    
    const width = Math.max(200, (maxX - minX) + sidePadding * 2);
    const height = Math.max(120, (maxY - minY) + verticalPadding * 2 + labelSpace);
    
    return { width, height };
  };

  // Helper to calculate port position
  const getPortPosition = (portId: string, node: typeof fromNode): [number, number] => {
    const port = diagram.ports.find(p => p.id === portId);
    if (!port) return [node.x, node.y];
    
    const dims = getNodeDimensions(node);
    let portX = node.x;
    let portY = node.y;
    
    switch (port.side) {
      case 'left':
        portX = node.x - dims.width / 2;
        break;
      case 'right':
        portX = node.x + dims.width / 2;
        break;
      case 'top':
        portY = node.y - dims.height / 2;
        break;
      case 'bottom':
        portY = node.y + dims.height / 2;
        break;
    }
    
    return [portX, portY];
  };

  // Calculate border intersection points (when no port is specified)
  const calculateBorderPoint = (node: typeof fromNode, toX: number, toY: number): [number, number] => {
    const dims = getNodeDimensions(node);
    const fromX = node.x;
    const fromY = node.y;
    
    const dx = toX - fromX;
    const dy = toY - fromY;
    
    if (dx === 0 && dy === 0) return [fromX, fromY];
    
    const halfWidth = dims.width / 2;
    const halfHeight = dims.height / 2;
    
    const absAngle = Math.abs(Math.atan2(dy, dx));
    const rectAngle = Math.atan2(halfHeight, halfWidth);
    
    let borderX: number, borderY: number;
    
    if (absAngle < rectAngle) {
      borderX = fromX + (dx > 0 ? halfWidth : -halfWidth);
      borderY = fromY + (dy / dx) * (dx > 0 ? halfWidth : -halfWidth);
    } else if (absAngle > Math.PI - rectAngle) {
      borderX = fromX + (dx > 0 ? halfWidth : -halfWidth);
      borderY = fromY + (dy / dx) * (dx > 0 ? halfWidth : -halfWidth);
    } else {
      borderY = fromY + (dy > 0 ? halfHeight : -halfHeight);
      borderX = fromX + (dx / dy) * (dy > 0 ? halfHeight : -halfHeight);
    }
    
    return [borderX, borderY];
  };

  // Determine start and end points
  let startX: number, startY: number;
  let endX: number, endY: number;
  
  if (sourcePort) {
    [startX, startY] = getPortPosition(sourcePort, fromNode);
  } else {
    const targetPos = targetPort ? getPortPosition(targetPort, toNode) : [toNode.x, toNode.y];
    [startX, startY] = calculateBorderPoint(fromNode, targetPos[0], targetPos[1]);
  }
  
  if (targetPort) {
    [endX, endY] = getPortPosition(targetPort, toNode);
  } else {
    const sourcePos = sourcePort ? getPortPosition(sourcePort, fromNode) : [fromNode.x, fromNode.y];
    [endX, endY] = calculateBorderPoint(toNode, sourcePos[0], sourcePos[1]);
  }

  const ballRadius = 12;
  const socketRadius = 16;
  
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Parse compact notation like -())- or -(()-
  let leftSymbol: 'full' | 'left' | 'right' | null = null;
  let rightSymbol: 'full' | 'left' | 'right' | null = null;

  if (type && type.includes('(') && type.includes(')')) {
    const symbolMatch = type.match(/-([()]+)-/);
    if (symbolMatch) {
      const symbols = symbolMatch[1];
      
      if (symbols.startsWith('()')) {
        leftSymbol = 'full';
        const rest = symbols.substring(2);
        if (rest === ')') rightSymbol = 'left';
        else if (rest === '(') rightSymbol = 'right';
        else if (rest === '()') rightSymbol = 'full';
      } 
      else if (symbols.startsWith(')')) {
        leftSymbol = 'left';
        const rest = symbols.substring(1);
        if (rest === ')') rightSymbol = 'left';
        else if (rest === '(') rightSymbol = 'right';
        else if (rest === '()') rightSymbol = 'full';
      }
      else if (symbols.startsWith('(')) {
        leftSymbol = 'right';
        const rest = symbols.substring(1);
        if (rest === ')') rightSymbol = 'left';
        else if (rest === '(') rightSymbol = 'right';  
        else if (rest === '()') rightSymbol = 'full';
      }
    }
  }

  // Calculate center position
  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;

  // Calculate line break points
  const lineBreakLeftX = centerX - (dx / length) * socketRadius;
  const lineBreakLeftY = centerY - (dy / length) * socketRadius;
  const lineBreakRightX = centerX + (dx / length) * socketRadius;
  const lineBreakRightY = centerY + (dy / length) * socketRadius;

  const renderSymbol = (symbolType: 'full' | 'left' | 'right', isLeftSide: boolean) => {
    if (symbolType === 'full') {
      // Full hollow circle (ball)
      return (
        <Group key={`symbol-${isLeftSide ? 'left' : 'right'}`}>
          <Circle
            x={centerX}
            y={centerY}
            radius={ballRadius}
            fill={bgColor}
          />
          <Ring
            x={centerX}
            y={centerY}
            innerRadius={ballRadius - 1}
            outerRadius={ballRadius}
            fill={symbolColor}
          />
        </Group>
      );
    } else {
      // Half circle (socket)
      let rotation = (angle * 180) / Math.PI;
      
      if (isLeftSide) {
        rotation = rotation + 90;
        if (symbolType === 'left') {
          rotation += 180;
        }
      } else {
        rotation = rotation - 90;
        if (symbolType === 'right') {
          rotation += 180;
        }
      }
      
      return (
        <Arc
          key={`symbol-${isLeftSide ? 'left' : 'right'}`}
          x={centerX}
          y={centerY}
          innerRadius={socketRadius - 1}
          outerRadius={socketRadius}
          angle={180}
          rotation={rotation}
          fill={symbolColor}
        />
      );
    }
  };

  // For delegate arrows
  if (isDelegate) {
    return (
      <Group>
        {/* Dashed line */}
        <Line
          points={[startX, startY, endX, endY]}
          stroke={lineColor}
          strokeWidth={2}
          dash={[5, 3]}
        />
        
        {/* Stereotype label */}
        {stereotype && (
          <Text
            x={centerX}
            y={centerY - 10}
            text={`<<${stereotype}>>`}
            fontSize={10}
            fill={textColor}
            width={100}
            align="center"
            offsetX={50}
          />
        )}
        
        {/* Arrow head */}
        <Arrow
          points={[endX - Math.cos(angle) * 10, endY - Math.sin(angle) * 10, endX, endY]}
          pointerLength={8}
          pointerWidth={8}
          fill={lineColor}
          stroke={lineColor}
          strokeWidth={2}
        />
      </Group>
    );
  }

  // Regular edges with interface symbols
  return (
    <Group>
      {/* Line segment from start to left symbol */}
      <Line
        points={[startX, startY, lineBreakLeftX, lineBreakLeftY]}
        stroke={lineColor}
        strokeWidth={2}
      />
      
      {/* Line segment from right symbol to end */}
      <Line
        points={[lineBreakRightX, lineBreakRightY, endX, endY]}
        stroke={lineColor}
        strokeWidth={2}
      />
      
      {/* Render symbols */}
      {leftSymbol && renderSymbol(leftSymbol, true)}
      {rightSymbol && renderSymbol(rightSymbol, false)}
    </Group>
  );
};
