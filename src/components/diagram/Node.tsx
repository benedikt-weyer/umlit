import React, { useState, useEffect, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Text, Plane } from '@react-three/drei';
import { useStore } from '../../store';
import { useTheme } from '../ThemeContextProvider';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Node as NodeType } from '../../types';

// Helper function to recursively calculate node width
function getNodeWidth(nodeId: string, allNodes: NodeType[]): number {
  const node = allNodes.find(n => n.id === nodeId);
  if (!node) return 150;
  
  const hasChildren = node.children && node.children.length > 0;
  if (!hasChildren) return 150;
  
  const childNodes = allNodes.filter(n => n.parentId === nodeId);
  if (childNodes.length === 0) return 150;
  
  const sidePadding = 20;
  let minX = Infinity, maxX = -Infinity;
  
  childNodes.forEach(child => {
    const childWidth = getNodeWidth(child.id, allNodes);
    minX = Math.min(minX, child.x - childWidth / 2);
    maxX = Math.max(maxX, child.x + childWidth / 2);
  });
  
  return Math.max(200, (maxX - minX) + sidePadding * 2);
}

// Helper function to recursively calculate node height
function getNodeHeight(nodeId: string, allNodes: NodeType[]): number {
  const node = allNodes.find(n => n.id === nodeId);
  if (!node) return 80;
  
  const hasChildren = node.children && node.children.length > 0;
  if (!hasChildren) return 80;
  
  const childNodes = allNodes.filter(n => n.parentId === nodeId);
  if (childNodes.length === 0) return 80;
  
  const verticalPadding = 20;
  const labelSpace = 35;
  let minY = Infinity, maxY = -Infinity;
  
  childNodes.forEach(child => {
    const childHeight = getNodeHeight(child.id, allNodes);
    minY = Math.min(minY, child.y - childHeight / 2);
    maxY = Math.max(maxY, child.y + childHeight / 2);
  });
  
  return Math.max(120, (maxY - minY) + verticalPadding * 2 + labelSpace);
}

interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
  parentId?: string;
  depth?: number;
  children?: string[];
}

export const Node: React.FC<NodeProps> = ({ id, label, x, y, parentId, depth = 0, children = [] }) => {
  const updateNodePosition = useStore((state) => state.updateNodePosition);
  const diagram = useStore((state) => state.diagram);
  const { theme } = useTheme();
  const { gl, camera } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const bgColor = theme === 'dark' ? '#1f1f1f' : '#ffffff';
  const borderColor = theme === 'dark' ? '#666666' : '#cccccc';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';
  const portColor = theme === 'dark' ? '#4a9eff' : '#0066cc';

  // Get child nodes if this is a container
  const hasChildren = children && children.length > 0;
  const childNodes = hasChildren ? diagram.nodes.filter(n => n.parentId === id) : [];
  
  // Calculate dynamic size based on children positions
  let nodeWidth = 150;
  let nodeHeight = 80;
  
  if (hasChildren && childNodes.length > 0) {
    const sidePadding = 20;
    const labelSpace = 35;
    const verticalPadding = 20;
    
    // Calculate bounds of all children
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    childNodes.forEach(child => {
      const childHasChildren = child.children && child.children.length > 0;
      const childWidth = childHasChildren ? getNodeWidth(child.id, diagram.nodes) : 150;
      const childHeight = childHasChildren ? getNodeHeight(child.id, diagram.nodes) : 80;
      
      minX = Math.min(minX, child.x - childWidth / 2);
      maxX = Math.max(maxX, child.x + childWidth / 2);
      minY = Math.min(minY, child.y - childHeight / 2);
      maxY = Math.max(maxY, child.y + childHeight / 2);
    });
    
    // Calculate container size with padding
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    nodeWidth = Math.max(200, contentWidth + sidePadding * 2);
    nodeHeight = Math.max(120, contentHeight + verticalPadding * 2 + labelSpace);
  }

  // Get parent node if exists
  const parentNode = parentId ? diagram.nodes.find(n => n.id === parentId) : null;

  const position: [number, number, number] = [x, -y, depth * 0.1];

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

      let newX = Math.round(vector.x - dragOffsetRef.current.x);
      let newY = Math.round(-vector.y - dragOffsetRef.current.y);
      
      // If this node has a parent, constrain movement within parent bounds
      if (parentNode) {
        const parentWidth = getNodeWidth(parentNode.id, diagram.nodes);
        const parentHeight = getNodeHeight(parentNode.id, diagram.nodes);
        
        const padding = 10;
        const labelSpace = 30;
        
        const minX = parentNode.x - parentWidth / 2 + nodeWidth / 2 + padding;
        const maxX = parentNode.x + parentWidth / 2 - nodeWidth / 2 - padding;
        const minY = parentNode.y - parentHeight / 2 + nodeHeight / 2 + labelSpace;
        const maxY = parentNode.y + parentHeight / 2 - nodeHeight / 2 - padding;
        
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      }
      
      // Update this node's position
      // Children don't need their positions updated - they follow through the transform hierarchy
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
  }, [isDragging, id, updateNodePosition, gl, camera, parentNode, hasChildren, diagram.nodes, nodeWidth, nodeHeight]);

  // Get ports for this node
  const nodePorts = diagram.ports.filter(p => p.nodeId === id);

  return (
    <group position={position}>
      {/* Main node rectangle */}
      <Plane
        args={[nodeWidth, nodeHeight]}
        onPointerDown={handlePointerDown}
      >
        {/* Transparent interior for containers, solid for leaf nodes */}
        <meshBasicMaterial 
          color={bgColor} 
          transparent={hasChildren}
          opacity={hasChildren ? 0 : 1}
        />
        <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(nodeWidth, nodeHeight)]} />
            <lineBasicMaterial color={borderColor} />
        </lineSegments>
      </Plane>
      
      {/* Node label at the top */}
      <Text
        position={[0, nodeHeight / 2 - 15, 0.1]}
        fontSize={14}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      
      {/* Render ports */}
      {nodePorts.map((port) => {
        let portX = 0, portY = 0;
        const portSize = 8;
        
        switch (port.side) {
          case 'left':
            portX = -nodeWidth / 2;
            portY = 0;
            break;
          case 'right':
            portX = nodeWidth / 2;
            portY = 0;
            break;
          case 'top':
            portX = 0;
            portY = nodeHeight / 2;
            break;
          case 'bottom':
            portX = 0;
            portY = -nodeHeight / 2;
            break;
        }
        
        return (
          <group key={port.id}>
            {/* Port square */}
            <Plane position={[portX, portY, 0.2]} args={[portSize, portSize]}>
              <meshBasicMaterial color={portColor} />
              <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(portSize, portSize)]} />
                <lineBasicMaterial color={borderColor} />
              </lineSegments>
            </Plane>
            {/* Port label */}
            {port.label && (
              <Text
                position={[portX + (port.side === 'left' ? -15 : port.side === 'right' ? 15 : 0), 
                          portY + (port.side === 'top' ? 10 : port.side === 'bottom' ? -10 : 0), 0.2]}
                fontSize={10}
                color={textColor}
                anchorX={port.side === 'left' ? 'right' : port.side === 'right' ? 'left' : 'center'}
                anchorY="middle"
              >
                {port.label}
              </Text>
            )}
          </group>
        );
      })}
      
      {/* Render child nodes if this is a container */}
      {childNodes.map((childNode) => (
        <Node
          key={childNode.id}
          id={childNode.id}
          label={childNode.label}
          x={childNode.x - x} // Relative position
          y={childNode.y - y} // Relative position
          parentId={childNode.parentId}
          depth={childNode.depth}
          children={childNode.children}
        />
      ))}
      
      {/* Book icon - only show if not a container */}
      {!hasChildren && (
        <>
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
        </>
      )}
    </group>
  );
};

