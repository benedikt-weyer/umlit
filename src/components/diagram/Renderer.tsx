import React, { useState, useEffect, useRef } from 'react';
import { Text, Plane } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { RenderStack, Renderable, RectangleRenderable, TextRenderable, PortRenderable, BookIconRenderable } from '../../types/renderables';
import { getRenderableAt } from '../../utils/renderStack';

interface RendererProps {
  renderStack: RenderStack;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
}

export const Renderer: React.FC<RendererProps> = ({ renderStack, onNodeDrag }) => {
  const { gl, camera } = useThree();
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>, renderable: RectangleRenderable) => {
    if (!renderable.isDraggable) return;
    
    e.stopPropagation();
    setDraggingNodeId(renderable.nodeId);
    
    dragOffsetRef.current = {
      x: e.point.x - renderable.x,
      y: -e.point.y - renderable.y
    };
  };

  useEffect(() => {
    if (!draggingNodeId) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
      vector.unproject(camera);

      const newX = Math.round(vector.x - dragOffsetRef.current.x);
      const newY = Math.round(-vector.y - dragOffsetRef.current.y);
      
      onNodeDrag(draggingNodeId, newX, newY);
    };

    const handlePointerUp = () => {
      setDraggingNodeId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingNodeId, gl, camera, onNodeDrag]);

  return (
    <group>
      {renderStack.map((renderable) => {
        switch (renderable.type) {
          case 'rectangle':
            return (
              <RenderRectangle
                key={renderable.id}
                renderable={renderable as RectangleRenderable}
                onPointerDown={handlePointerDown}
              />
            );
          case 'text':
            return <RenderText key={renderable.id} renderable={renderable as TextRenderable} />;
          case 'port':
            return <RenderPort key={renderable.id} renderable={renderable as PortRenderable} />;
          case 'book-icon':
            return <RenderBookIcon key={renderable.id} renderable={renderable as BookIconRenderable} />;
          default:
            return null;
        }
      })}
    </group>
  );
};

// Component for rendering rectangles
const RenderRectangle: React.FC<{
  renderable: RectangleRenderable;
  onPointerDown: (e: ThreeEvent<PointerEvent>, renderable: RectangleRenderable) => void;
}> = ({ renderable, onPointerDown }) => {
  const position: [number, number, number] = [renderable.x, -renderable.y, renderable.zIndex * 0.01];
  
  return (
    <Plane
      position={position}
      args={[renderable.width, renderable.height]}
      onPointerDown={(e) => onPointerDown(e, renderable)}
    >
      <meshBasicMaterial
        color={renderable.fillColor}
        transparent={renderable.transparent}
        opacity={renderable.opacity}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(renderable.width, renderable.height)]} />
        <lineBasicMaterial color={renderable.strokeColor} />
      </lineSegments>
    </Plane>
  );
};

// Component for rendering text
const RenderText: React.FC<{ renderable: TextRenderable }> = ({ renderable }) => {
  const position: [number, number, number] = [renderable.x, -renderable.y, renderable.zIndex * 0.01];
  
  return (
    <Text
      position={position}
      fontSize={renderable.fontSize}
      color={renderable.color}
      anchorX={renderable.anchorX}
      anchorY={renderable.anchorY}
    >
      {renderable.content}
    </Text>
  );
};

// Component for rendering ports
const RenderPort: React.FC<{ renderable: PortRenderable }> = ({ renderable }) => {
  const position: [number, number, number] = [renderable.x, -renderable.y, renderable.zIndex * 0.01];
  
  return (
    <group>
      <Plane position={position} args={[renderable.size, renderable.size]}>
        <meshBasicMaterial color={renderable.color} />
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(renderable.size, renderable.size)]} />
          <lineBasicMaterial color={renderable.strokeColor} />
        </lineSegments>
      </Plane>
      {renderable.label && (
        <Text
          position={[position[0], position[1] + 10, position[2]]}
          fontSize={10}
          color={renderable.strokeColor}
          anchorX="center"
          anchorY="middle"
        >
          {renderable.label}
        </Text>
      )}
    </group>
  );
};

// Component for rendering book icon
const RenderBookIcon: React.FC<{ renderable: BookIconRenderable }> = ({ renderable }) => {
  const position: [number, number, number] = [renderable.x, -renderable.y, renderable.zIndex * 0.01];
  
  return (
    <group>
      {/* Main book cover */}
      <Plane position={position} args={[14, 18]}>
        <meshBasicMaterial color={renderable.color} />
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(14, 18)]} />
          <lineBasicMaterial color={renderable.strokeColor} />
        </lineSegments>
      </Plane>
      
      {/* Binding rectangle 1 (top) */}
      <Plane position={[position[0] - 6.5, position[1] + 5, position[2] + 0.01]} args={[3, 6]}>
        <meshBasicMaterial color={renderable.color} />
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(3, 6)]} />
          <lineBasicMaterial color={renderable.strokeColor} />
        </lineSegments>
      </Plane>
      
      {/* Binding rectangle 2 (bottom) */}
      <Plane position={[position[0] - 6.5, position[1] - 5, position[2] + 0.01]} args={[3, 6]}>
        <meshBasicMaterial color={renderable.color} />
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(3, 6)]} />
          <lineBasicMaterial color={renderable.strokeColor} />
        </lineSegments>
      </Plane>
    </group>
  );
};

