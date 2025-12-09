import React from 'react';
import { Line } from '@react-three/drei';
import type { Edge as EdgeType } from '../../types';
import { useStore } from '../../store';
import { useTheme } from '../ThemeContextProvider';
import * as THREE from 'three';

export const DiagramEdge: React.FC<EdgeType> = ({ source, target, type }) => {
  const diagram = useStore((state) => state.diagram);
  const { theme } = useTheme();
  
  const fromNode = diagram.nodes.find(n => n.id === source);
  const toNode = diagram.nodes.find(n => n.id === target);
  
  if (!fromNode || !toNode) return null;

  const lineColor = theme === 'dark' ? '#666666' : '#999999';
  const symbolColor = theme === 'dark' ? '#888888' : '#666666';
  const bgColor = theme === 'dark' ? '#0a0a0a' : '#fafafa';

  const startPoint: [number, number, number] = [fromNode.x, -fromNode.y, 1];
  const endPoint: [number, number, number] = [toNode.x, -toNode.y, 1];

  const symbolRadius = 8;
  const symbolGap = 10; // Gap between symbols
  
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

  // Calculate center position
  const centerX = (startPoint[0] + endPoint[0]) / 2;
  const centerY = (startPoint[1] + endPoint[1]) / 2;

  // Calculate positions for symbols with gap
  const leftSymbolX = centerX - (dx / length) * (symbolRadius + symbolGap / 2);
  const leftSymbolY = centerY - (dy / length) * (symbolRadius + symbolGap / 2);
  const rightSymbolX = centerX + (dx / length) * (symbolRadius + symbolGap / 2);
  const rightSymbolY = centerY + (dy / length) * (symbolRadius + symbolGap / 2);

  const leftSymbolPos: [number, number, number] = [leftSymbolX, leftSymbolY, 1];
  const rightSymbolPos: [number, number, number] = [rightSymbolX, rightSymbolY, 1];

  // Calculate line break points (outside the symbols)
  const lineBreakLeftX = centerX - (dx / length) * (symbolRadius * 2 + symbolGap);
  const lineBreakLeftY = centerY - (dy / length) * (symbolRadius * 2 + symbolGap);
  const lineBreakRightX = centerX + (dx / length) * (symbolRadius * 2 + symbolGap);
  const lineBreakRightY = centerY + (dy / length) * (symbolRadius * 2 + symbolGap);

  const renderSymbol = (pos: [number, number, number], symbolType: 'full' | 'left' | 'right', isLeftSide: boolean) => {
    if (symbolType === 'full') {
      // Full hollow circle
      return (
        <>
          <mesh position={pos}>
            <circleGeometry args={[symbolRadius, 32]} />
            <meshBasicMaterial color={bgColor} />
          </mesh>
          <mesh position={pos}>
            <ringGeometry args={[symbolRadius - 1, symbolRadius, 32]} />
            <meshBasicMaterial color={symbolColor} />
          </mesh>
        </>
      );
    } else {
      // Half circle - should open towards the center
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
        <mesh position={pos} rotation={[0, 0, rotation]}>
          <ringGeometry args={[symbolRadius - 1, symbolRadius, 32, 1, 0, Math.PI]} />
          <meshBasicMaterial color={symbolColor} side={THREE.DoubleSide} />
        </mesh>
      );
    }
  };

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
      {leftSymbol && renderSymbol(leftSymbolPos, leftSymbol, true)}
      
      {/* Render right symbol */}
      {rightSymbol && renderSymbol(rightSymbolPos, rightSymbol, false)}
    </group>
  );
};
