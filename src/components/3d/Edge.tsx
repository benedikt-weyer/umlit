import React from 'react';
import { Line, Circle } from '@react-three/drei';
import type { Edge as EdgeType } from '../../types';
import { useStore } from '../../store';
import { useTheme } from '../ThemeProvider';

export const Edge: React.FC<EdgeType> = ({ source, target }) => {
  const diagram = useStore((state) => state.diagram);
  const { theme } = useTheme();
  
  const fromNode = diagram.nodes.find(n => n.id === source);
  const toNode = diagram.nodes.find(n => n.id === target);
  
  if (!fromNode || !toNode) return null;

  const lineColor = theme === 'dark' ? '#666666' : '#999999';
  const circleColor = theme === 'dark' ? '#888888' : '#666666';

  const startPoint: [number, number, number] = [fromNode.x, -fromNode.y, 1];
  const endPoint: [number, number, number] = [toNode.x, -toNode.y, 1];

  const dx = endPoint[0] - startPoint[0];
  const dy = endPoint[1] - startPoint[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  
  const circleRadius = 8;
  const offsetX = (dx / length) * circleRadius;
  const offsetY = (dy / length) * circleRadius;
  
  const lineEndPoint: [number, number, number] = [
    endPoint[0] - offsetX,
    endPoint[1] - offsetY,
    1
  ];

  return (
    <group>
      <Line
        points={[startPoint, lineEndPoint]}
        color={lineColor}
        lineWidth={2}
      />
      <Circle
        args={[circleRadius, 32]}
        position={endPoint}
        rotation={[0, 0, 0]}
      >
        <meshBasicMaterial color={circleColor} />
      </Circle>
    </group>
  );
};
