import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, MapControls } from '@react-three/drei';
import { useStore } from '../store';
import { Node } from './3d/Node';
import { Edge } from './3d/Edge';

export const Visualizer: React.FC = () => {
  const diagram = useStore((state) => state.diagram);

  return (
    <div className="h-full w-full bg-gray-50">
      <Canvas>
        <OrthographicCamera makeDefault position={[0, 0, 1000]} zoom={1} near={0.1} far={2000} />
        <MapControls enableRotate={false} />
        
        <ambientLight intensity={1} />
        
        <group>
          {diagram.edges.map((edge) => (
            <Edge key={edge.id} {...edge} />
          ))}
          {diagram.nodes.map((node) => (
            <Node key={node.id} {...node} />
          ))}
        </group>
        
        {/* Grid helper for reference */}
        <gridHelper args={[2000, 20]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -1]} />
      </Canvas>
    </div>
  );
};
