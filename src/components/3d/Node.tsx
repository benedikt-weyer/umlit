import React, { useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Text, Plane } from '@react-three/drei';
import { useStore } from '../../store';
import { useTheme } from '../ThemeProvider';
import * as THREE from 'three';

interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
}

export const Node: React.FC<NodeProps> = ({ id, label, x, y }) => {
  const updateNodePosition = useStore((state) => state.updateNodePosition);
  const { theme } = useTheme();
  const [isDragging, setIsDragging] = useState(false);

  const bgColor = theme === 'dark' ? '#1f1f1f' : '#ffffff';
  const borderColor = theme === 'dark' ? '#666666' : '#cccccc';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';
  const iconBg = theme === 'dark' ? '#333333' : '#dddddd';

  const position: [number, number, number] = [x, -y, 0];

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDragging(true);
    // @ts-ignore
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDragging(false);
    // @ts-ignore
    e.target.releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isDragging) {
      e.stopPropagation();
      const newX = Math.round(e.point.x);
      const newY = Math.round(-e.point.y);
      updateNodePosition(id, newX, newY);
    }
  };

  return (
    <group position={position}>
      <Plane
        args={[150, 80]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <meshBasicMaterial color={bgColor} />
        <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(150, 80)]} />
            <lineBasicMaterial color={borderColor} />
        </lineSegments>
      </Plane>
      <Text
        position={[0, 0, 0.1]}
        fontSize={16}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      <Plane position={[-50, 0, 0.1]} args={[20, 20]}>
        <meshBasicMaterial color={iconBg} />
        <lineSegments>
           <edgesGeometry args={[new THREE.PlaneGeometry(20, 20)]} />
           <lineBasicMaterial color={borderColor} />
        </lineSegments>
      </Plane>
    </group>
  );
};
