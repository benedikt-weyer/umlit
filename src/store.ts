import { create } from 'zustand';
import { parseDiagram } from './parser';
import type { Diagram } from './types';
import { autoLayoutNodes, updateCodeWithPositions } from './utils/autoLayout';

interface AppState {
  code: string;
  diagram: Diagram;
  setCode: (code: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  autoLayout: () => void;
}

const DEFAULT_CODE = `[uml2.5-component] {
  [NodeA] User
  [NodeB] Service {
    [NodeB1] Handler
    [NodeB2] Logic
    port [p1] on [NodeB] left : API
    NodeB1 -> NodeB2
  }
  [NodeC] Database

  NodeA -())- NodeB
  NodeB.p1 ->delegate-> NodeB1
  NodeB -(()- NodeC
}`.trim();

// Initialize with auto-layout applied
const initializeDiagram = () => {
  const initialDiagram = parseDiagram(DEFAULT_CODE);
  const layoutedNodes = autoLayoutNodes(initialDiagram.nodes);
  const layoutedCode = updateCodeWithPositions(DEFAULT_CODE, layoutedNodes);
  const layoutedDiagram = parseDiagram(layoutedCode);
  
  return {
    code: layoutedCode,
    diagram: layoutedDiagram
  };
};

const initialState = initializeDiagram();

export const useStore = create<AppState>((set) => ({
  code: initialState.code,
  diagram: initialState.diagram,
  setCode: (code) =>
    set(() => {
      const diagram = parseDiagram(code);
      return { code, diagram };
    }),
  updateNodePosition: (id, x, y) =>
    set((state) => {
      const movedNode = state.diagram.nodes.find(n => n.id === id);
      if (!movedNode) return state;
      
      // Calculate delta
      const deltaX = x - movedNode.x;
      const deltaY = y - movedNode.y;
      
      // Get all descendant nodes recursively
      const getDescendants = (nodeId: string): string[] => {
        const children = state.diagram.nodes.filter(n => n.parentId === nodeId);
        const childIds = children.map(c => c.id);
        const grandchildren = children.flatMap(c => getDescendants(c.id));
        return [...childIds, ...grandchildren];
      };
      
      const descendantIds = getDescendants(id);
      const nodesToUpdate = [id, ...descendantIds];
      
      // Update all nodes (parent and all descendants)
      const newNodes = state.diagram.nodes.map((node) => {
        if (nodesToUpdate.includes(node.id)) {
          const isMainNode = node.id === id;
          return {
            ...node,
            x: isMainNode ? x : node.x + deltaX,
            y: isMainNode ? y : node.y + deltaY
          };
        }
        return node;
      });
      
      // Update code for all moved nodes
      let newCode = state.code;
      const lines = newCode.split('\n');
      const newLines = lines.map(line => {
        const trimmed = line.trim();
        
        // Check each moved node
        for (const nodeId of nodesToUpdate) {
          const nodeRegex = new RegExp(`^\\[${nodeId}\\]`);
          if (nodeRegex.test(trimmed)) {
            const updatedNode = newNodes.find(n => n.id === nodeId);
            if (updatedNode) {
              // Check if it already has coordinates
              if (trimmed.includes('@')) {
                return trimmed.replace(/@\s*-?\d+,\s*-?\d+/, `@ ${updatedNode.x},${updatedNode.y}`);
              } else {
                return `${trimmed} @ ${updatedNode.x},${updatedNode.y}`;
              }
            }
          }
        }
        return line;
      });
      
      newCode = newLines.join('\n');

      return {
        code: newCode,
        diagram: { ...state.diagram, nodes: newNodes, type: state.diagram.type },
      };
    }),
  autoLayout: () =>
    set((state) => {
      // Apply auto-layout algorithm
      const layoutedNodes = autoLayoutNodes(state.diagram.nodes);
      
      // Update code with new positions
      const newCode = updateCodeWithPositions(state.code, layoutedNodes);
      
      return {
        code: newCode,
        diagram: { ...state.diagram, nodes: layoutedNodes },
      };
    }),
}));
