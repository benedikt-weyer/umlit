import React, { useState, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { useStore } from '../store';
import { DiagramNode } from './DiagramNode';
import { DiagramEdge } from './DiagramEdge';
import { useTheme } from './ThemeContextProvider';
import * as THREE from 'three';

// Background plane component for camera panning
const BackgroundPlane: React.FC = () => {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cameraStartRef = useRef({ x: 0, y: 0 });
  const orthoCamera = camera as THREE.OrthographicCamera;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDragging(true);
    const rect = gl.domElement.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    cameraStartRef.current = {
      x: orthoCamera.position.x,
      y: orthoCamera.position.y,
    };
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const deltaX = (e.clientX - rect.left - dragStartRef.current.x);
      const deltaY = (e.clientY - rect.top - dragStartRef.current.y);
      
      // Convert screen delta to world delta based on camera zoom
      const worldDeltaX = (deltaX / rect.width) * (orthoCamera.right - orthoCamera.left) / orthoCamera.zoom;
      const worldDeltaY = -(deltaY / rect.height) * (orthoCamera.top - orthoCamera.bottom) / orthoCamera.zoom;
      
      orthoCamera.position.x = cameraStartRef.current.x - worldDeltaX;
      orthoCamera.position.y = cameraStartRef.current.y - worldDeltaY;
      orthoCamera.updateProjectionMatrix();
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
  }, [isDragging, orthoCamera, gl]);

  return (
    <mesh 
      position={[0, 0, -100]} 
      onPointerDown={handlePointerDown}
    >
      <planeGeometry args={[100000, 100000]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
};

export const DiagramVisualizer: React.FC = () => {
  const diagram = useStore((state) => state.diagram);
  const { theme } = useTheme();

  return (
    <div className="h-full w-full bg-background relative">
      <Canvas>
        <color attach="background" args={[theme === 'dark' ? '#0a0a0a' : '#fafafa']} />
        <OrthographicCamera makeDefault position={[0, 0, 1000]} zoom={1} near={0.1} far={2000} />
        
        <ambientLight intensity={1} />
        
        <BackgroundPlane />
        
        <group>
          {diagram.edges.map((edge) => (
            <DiagramEdge key={edge.id} {...edge} />
          ))}
          {diagram.nodes.map((node) => (
            <DiagramNode key={node.id} {...node} />
          ))}
        </group>
        
        {/* Grid helper for reference */}
        <gridHelper 
          args={[2000, 20, theme === 'dark' ? '#333333' : '#e5e5e5', theme === 'dark' ? '#1a1a1a' : '#f5f5f5']} 
          rotation={[Math.PI / 2, 0, 0]} 
          position={[0, 0, -1]} 
        />
        <ExportHandler />
      </Canvas>
    </div>
  );
};

// Helper component to access Three.js context
import { generateSVG, downloadStringAsFile } from '../utils/export';

const ExportHandler = () => {
  const { gl, scene, camera } = useThree();
  const diagram = useStore((state) => state.diagram);

  React.useEffect(() => {
    const handlePng = () => {
      // Render once to ensure fresh state
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'diagram.png';
      a.click();
    };

    const handleSvg = () => {
      const svgContent = generateSVG(diagram);
      downloadStringAsFile(svgContent, 'diagram.svg', 'image/svg+xml');
    };

    window.addEventListener('export-png', handlePng);
    window.addEventListener('export-svg', handleSvg);

    return () => {
      window.removeEventListener('export-png', handlePng);
      window.removeEventListener('export-svg', handleSvg);
    };
  }, [gl, scene, camera, diagram]);

  return null;
};
