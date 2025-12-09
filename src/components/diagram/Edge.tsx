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

  // Node dimensions (from Node component)
  const nodeWidth = 150;
  const nodeHeight = 80;

  // Calculate border intersection points
  const calculateBorderPoint = (fromX: number, fromY: number, toX: number, toY: number): [number, number] => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    
    if (dx === 0 && dy === 0) return [fromX, fromY];
    
    // Calculate intersection with rectangle borders
    const halfWidth = nodeWidth / 2;
    const halfHeight = nodeHeight / 2;
    
    // Calculate the angle from center to target
    const absAngle = Math.abs(Math.atan2(dy, dx));
    const rectAngle = Math.atan2(halfHeight, halfWidth);
    
    let borderX: number, borderY: number;
    
    // Determine which edge of the rectangle to intersect
    if (absAngle < rectAngle) {
      // Right edge
      borderX = fromX + (dx > 0 ? halfWidth : -halfWidth);
      borderY = fromY + (dy / dx) * (dx > 0 ? halfWidth : -halfWidth);
    } else if (absAngle > Math.PI - rectAngle) {
      // Left edge
      borderX = fromX + (dx > 0 ? halfWidth : -halfWidth);
      borderY = fromY + (dy / dx) * (dx > 0 ? halfWidth : -halfWidth);
    } else {
      // Top or bottom edge
      borderY = fromY + (dy > 0 ? halfHeight : -halfHeight);
      borderX = fromX + (dx / dy) * (dy > 0 ? halfHeight : -halfHeight);
    }
    
    return [borderX, borderY];
  };

  const fromCenter: [number, number] = [fromNode.x, -fromNode.y];
  const toCenter: [number, number] = [toNode.x, -toNode.y];
  
  const [startX, startY] = calculateBorderPoint(fromCenter[0], fromCenter[1], toCenter[0], toCenter[1]);
  const [endX, endY] = calculateBorderPoint(toCenter[0], toCenter[1], fromCenter[0], fromCenter[1]);
  
  const startPoint: [number, number, number] = [startX, startY, 1];
  const endPoint: [number, number, number] = [endX, endY, 1];

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
