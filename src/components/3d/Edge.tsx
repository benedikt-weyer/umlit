import React from 'react';
import { Line, Circle } from '@react-three/drei';
import { useStore } from '../../store';
import * as THREE from 'three';

interface EdgeProps {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export const Edge: React.FC<EdgeProps> = ({ source, target, label }) => {
  const nodes = useStore((state) => state.diagram.nodes);
  
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode || !targetNode) return null;

  const start = new THREE.Vector3(sourceNode.x, -sourceNode.y, 0);
  const end = new THREE.Vector3(targetNode.x, -targetNode.y, 0);

  // Lollipop visual: Line + Circle at the end
  // We want the line to stop at the edge of the node, but for simplicity let's draw center to center first
  // Or maybe just draw to the edge.
  
  // Simple implementation: Line from center to center
  const points = [start, end];

  return (
    <group>
      <Line
        points={points}
        color="black"
        lineWidth={2}
      />
      {/* Lollipop Circle at the target */}
      <group position={end}>
        <Circle args={[5, 32]}>
            <meshBasicMaterial color="white" />
        </Circle>
        <lineSegments>
            <edgesGeometry args={[new THREE.CircleGeometry(5, 32)]} />
            <lineBasicMaterial color="black" />
        </lineSegments>
      </group>
      {label && (
        <group position={start.clone().lerp(end, 0.5)}>
             {/* Label background */}
             {/* <Plane args={[label.length * 10, 20]}>
                 <meshBasicMaterial color="white" />
             </Plane> */}
             {/* Text is tricky in 2D without billboard if we rotate, but here it's flat */}
             {/* We can use HTML overlay or just Text */}
        </group>
      )}
    </group>
  );
};
