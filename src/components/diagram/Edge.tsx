import React from 'react';
import { Line, Text } from '@react-three/drei';
import type { Edge as EdgeType } from '../../types';
import { useStore } from '../../store';
import { useTheme } from '../ThemeContextProvider';
import * as THREE from 'three';

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
    // Use port position
    [startX, startY] = getPortPosition(sourcePort, fromNode);
  } else {
    // Use border intersection
    const targetPos = targetPort ? getPortPosition(targetPort, toNode) : [toNode.x, toNode.y];
    [startX, startY] = calculateBorderPoint(fromNode, targetPos[0], targetPos[1]);
  }
  
  if (targetPort) {
    // Use port position
    [endX, endY] = getPortPosition(targetPort, toNode);
  } else {
    // Use border intersection
    const sourcePos = sourcePort ? getPortPosition(sourcePort, fromNode) : [fromNode.x, fromNode.y];
    [endX, endY] = calculateBorderPoint(toNode, sourcePos[0], sourcePos[1]);
  }
  
  const startPoint: [number, number, number] = [startX, -startY, 1];
  const endPoint: [number, number, number] = [endX, -endY, 1];

  const ballRadius = 12; // Full circle (ball)
  const socketRadius = 16; // Half circle (socket) - bigger than ball
  
  const dx = endPoint[0] - startPoint[0];
  const dy = endPoint[1] - startPoint[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Parse compact notation like -())- or -(()-
  let leftSymbol: 'full' | 'left' | 'right' | null = null;
  let rightSymbol: 'full' | 'left' | 'right' | null = null;

  if (type && type.includes('(') && type.includes(')')) {
    const symbolMatch = type.match(/-([()]+)-/);
    if (symbolMatch) {
      const symbols = symbolMatch[1];
      
      // Check if starts with ()
      if (symbols.startsWith('()')) {
        leftSymbol = 'full';
        // Remaining after ()
        const rest = symbols.substring(2);
        if (rest === ')') rightSymbol = 'left';
        else if (rest === '(') rightSymbol = 'right';
        else if (rest === '()') rightSymbol = 'full';
      } 
      // Check if starts with single paren
      else if (symbols.startsWith(')')) {
        leftSymbol = 'left';
        // Check what comes after
        const rest = symbols.substring(1);
        if (rest === ')') rightSymbol = 'left';
        else if (rest === '(') rightSymbol = 'right';
        else if (rest === '()') rightSymbol = 'full';
      }
      else if (symbols.startsWith('(')) {
        leftSymbol = 'right';
        // Check what comes after
        const rest = symbols.substring(1);
        if (rest === ')') rightSymbol = 'left';
        else if (rest === '(') rightSymbol = 'right';  
        else if (rest === '()') rightSymbol = 'full';
      }
    }
  }

  // Calculate center position - both symbols share the same center
  const centerX = (startPoint[0] + endPoint[0]) / 2;
  const centerY = (startPoint[1] + endPoint[1]) / 2;

  // Both symbols at the same position (same center point)
  const symbolPos: [number, number, number] = [centerX, centerY, 1];

  // Calculate line break points based on the larger socket radius
  const lineBreakLeftX = centerX - (dx / length) * socketRadius;
  const lineBreakLeftY = centerY - (dy / length) * socketRadius;
  const lineBreakRightX = centerX + (dx / length) * socketRadius;
  const lineBreakRightY = centerY + (dy / length) * socketRadius;

  const renderSymbol = (symbolType: 'full' | 'left' | 'right', isLeftSide: boolean) => {
    if (symbolType === 'full') {
      // Full hollow circle (ball)
      return (
        <>
          <mesh position={symbolPos}>
            <circleGeometry args={[ballRadius, 32]} />
            <meshBasicMaterial color={bgColor} />
          </mesh>
          <mesh position={symbolPos}>
            <ringGeometry args={[ballRadius - 1, ballRadius, 32]} />
            <meshBasicMaterial color={symbolColor} />
          </mesh>
        </>
      );
    } else {
      // Half circle (socket) - bigger than ball
      // ringGeometry at 0 rotation opens to the right (⊂)
      // We need to rotate based on line angle and which side we're on
      
      let rotation = angle;
      
      if (isLeftSide) {
        // Left side symbol should open to the right (⊂ direction)
        rotation = angle + Math.PI / 2;
        if (symbolType === 'left') {
          // This is ) which naturally opens left, flip it
          rotation += Math.PI;
        }
      } else {
        // Right side symbol should open to the left (⊃ direction)
        rotation = angle - Math.PI / 2;
        if (symbolType === 'right') {
          // This is ( which naturally opens right, flip it
          rotation += Math.PI;
        }
      }
      
      return (
        <mesh position={symbolPos} rotation={[0, 0, rotation]}>
          <ringGeometry args={[socketRadius - 1, socketRadius, 32, 1, 0, Math.PI]} />
          <meshBasicMaterial color={symbolColor} side={THREE.DoubleSide} />
        </mesh>
      );
    }
  };

  // For delegate arrows, render dashed line
  if (isDelegate) {
    // Create dashed line material
    const dashedMaterial = new THREE.LineDashedMaterial({
      color: lineColor,
      dashSize: 5,
      gapSize: 3,
      linewidth: 2
    });

    const centerX = (startPoint[0] + endPoint[0]) / 2;
    const centerY = (startPoint[1] + endPoint[1]) / 2;

    return (
      <group>
        {/* Dashed line for delegate arrow */}
        <Line
          points={[startPoint, endPoint]}
          color={lineColor}
          lineWidth={2}
          dashed
          dashScale={1}
          dashSize={5}
          gapSize={3}
        />
        
        {/* <<delegate>> stereotype label */}
        {stereotype && (
          <Text
            position={[centerX, centerY + 10, 1.5]}
            fontSize={10}
            color={textColor}
            anchorX="center"
            anchorY="middle"
          >
            {`<<${stereotype}>>`}
          </Text>
        )}
        
        {/* Arrow head at target */}
        <mesh position={endPoint} rotation={[0, 0, angle]}>
          <coneGeometry args={[3, 8, 3]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      </group>
    );
  }

  // Regular edges with interface symbols
  return (
    <group>
      {/* Line segment from start to left symbol */}
      <Line
        points={[startPoint, [lineBreakLeftX, lineBreakLeftY, 1]]}
        color={lineColor}
        lineWidth={2}
      />
      
      {/* Line segment from right symbol to end */}
      <Line
        points={[[lineBreakRightX, lineBreakRightY, 1], endPoint]}
        color={lineColor}
        lineWidth={2}
      />
      
      {/* Render left symbol */}
      {leftSymbol && renderSymbol(leftSymbol, true)}
      
      {/* Render right symbol */}
      {rightSymbol && renderSymbol(rightSymbol, false)}
    </group>
  );
};
