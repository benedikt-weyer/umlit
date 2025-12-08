import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, MapControls } from '@react-three/drei';
import { useStore } from '../store';
import { Node } from './3d/Node';
import { Edge } from './3d/Edge';

export const Visualizer: React.FC = () => {
  const diagram = useStore((state) => state.diagram);

  return (
    <div className="h-full w-full bg-gray-50 relative">
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
        <ExportHandler />
      </Canvas>
    </div>
  );
};

// Helper component to access Three.js context
import { useThree } from '@react-three/fiber';
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
