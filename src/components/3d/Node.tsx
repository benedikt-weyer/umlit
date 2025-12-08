import React, { useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Text, Plane } from '@react-three/drei';
import { useStore } from '../../store';
import * as THREE from 'three';

interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
}

export const Node: React.FC<NodeProps> = ({ id, label, x, y, color = '#ffffff' }) => {
  const updateNodePosition = useStore((state) => state.updateNodePosition);
  const [isDragging, setIsDragging] = useState(false);

  // In 2D view (Orthographic), we can map directly.
  // Let's assume 1 unit = 1 pixel for simplicity in the store, 
  // but in Three.js we might want to scale it.
  // Or we just set the camera zoom such that 1 unit = 1 pixel.
  // For now, let's keep the position as is.
  // Y is inverted in 3D (up is positive), but in screen coords Y is down.
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
      
      // For Orthographic camera looking down Z:
      // e.point.x and e.point.y are the world coordinates.
      // We can just use them directly.
      
      const newX = Math.round(e.point.x);
      const newY = Math.round(-e.point.y); // Invert Y back
      
      updateNodePosition(id, newX, newY);
    }
  };

  return (
    <group position={position}>
      <Plane
        args={[150, 80]} // Width, Height
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <meshBasicMaterial color={color} />
        {/* Border */}
        <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(150, 80)]} />
            <lineBasicMaterial color="black" />
        </lineSegments>
      </Plane>
      <Text
        position={[0, 0, 0.1]}
        fontSize={16}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      {/* Icon placeholder (box) */}
       <Plane position={[-50, 0, 0.1]} args={[20, 20]}>
         <meshBasicMaterial color="#ddd" />
         <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(20, 20)]} />
            <lineBasicMaterial color="#666" />
         </lineSegments>
       </Plane>
    </group>
  );
};
