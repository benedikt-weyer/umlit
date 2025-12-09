import React, { useState, useEffect, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Text, Plane } from '@react-three/drei';
import { useStore } from '../../store';
import { useTheme } from '../ThemeContextProvider';
import { useThree } from '@react-three/fiber';
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
  const { gl, camera } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const bgColor = theme === 'dark' ? '#1f1f1f' : '#ffffff';
  const borderColor = theme === 'dark' ? '#666666' : '#cccccc';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';

  const position: [number, number, number] = [x, -y, 0];

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    // Calculate offset between click point and node center
    dragOffsetRef.current = {
      x: e.point.x - x,
      y: -e.point.y - y
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
      vector.unproject(camera);

      const newX = Math.round(vector.x - dragOffsetRef.current.x);
      const newY = Math.round(-vector.y - dragOffsetRef.current.y);
      
      updateNodePosition(id, newX, newY);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, id, updateNodePosition, gl, camera]);

  return (
    <group position={position}>
      <Plane
        args={[150, 80]}
        onPointerDown={handlePointerDown}
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
      {/* Book icon - 3 rectangles */}
      {/* Main book cover */}
      <Plane position={[57, 0, 0.2]} args={[14, 18]}>
        <meshBasicMaterial color={textColor} />
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(14, 18)]} />
          <lineBasicMaterial color={borderColor} />
        </lineSegments>
      </Plane>
      
      {/* Binding rectangle 1 (top) - on the left edge of book */}
      <Plane position={[50.5, 5, 0.3]} args={[3, 6]}>
        <meshBasicMaterial color={textColor} />
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(3, 6)]} />
          <lineBasicMaterial color={borderColor} />
        </lineSegments>
      </Plane>
      
      {/* Binding rectangle 2 (bottom) - on the left edge of book */}
      <Plane position={[50.5, -5, 0.3]} args={[3, 6]}>
        <meshBasicMaterial color={textColor} />
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(3, 6)]} />
          <lineBasicMaterial color={borderColor} />
        </lineSegments>
      </Plane>
    </group>
  );
};

