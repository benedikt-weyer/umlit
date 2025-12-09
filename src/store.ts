import { create } from 'zustand';
import { parseDiagram } from './parser';
import type { Diagram } from './types';

interface AppState {
  code: string;
  diagram: Diagram;
  setCode: (code: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
}

const DEFAULT_CODE = `[uml2.5-component] {
  [NodeA] User @ 0,0
  [NodeB] Service @ 200,0 {
    [NodeB1] Handler @ 220,20
    [NodeB2] Logic @ 220,80
    port [p1] on [NodeB] left : API
    NodeB1 -> NodeB2
  }
  [NodeC] Database @ 200,200

  NodeA -())- NodeB
  NodeB.p1 ->delegate-> NodeB1
  NodeB -(()- NodeC
}`.trim();

export const useStore = create<AppState>((set) => ({
  code: DEFAULT_CODE,
  diagram: parseDiagram(DEFAULT_CODE),
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
}));
