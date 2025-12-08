import { create } from 'zustand';
import { parseDiagram } from './parser';
import type { Diagram } from './types';

interface AppState {
  code: string;
  diagram: Diagram;
  setCode: (code: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
}

const DEFAULT_CODE = `[NodeA] User @ 0,0
[NodeB] Service @ 200,0
[NodeC] Database @ 200,150

NodeA -())- NodeB
NodeB -(()- NodeC
`.trim();

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
      // Update diagram state
      const newNodes = state.diagram.nodes.map((node) =>
        node.id === id ? { ...node, x, y } : node
      );
      
      // Update code to reflect new position
      // This is a naive implementation; a real one would need a smarter code updater (CST/AST)
      // For now, we'll just regenerate the code or regex replace
      // But regex replace is safer to preserve other parts
      
      let newCode = state.code;
      const lines = newCode.split('\n');
      const newLines = lines.map(line => {
        const trimmed = line.trim();
        // Check if line defines this node
        // Regex: ^\[id\] ...
        const nodeRegex = new RegExp(`^\\[${id}\\]`);
        if (nodeRegex.test(trimmed)) {
           // Check if it already has coordinates
           if (trimmed.includes('@')) {
             return trimmed.replace(/@\s*-?\d+,\s*-?\d+/, `@ ${x},${y}`);
           } else {
             return `${trimmed} @ ${x},${y}`;
           }
        }
        return line;
      });
      
      newCode = newLines.join('\n');

      return {
        code: newCode,
        diagram: { ...state.diagram, nodes: newNodes },
      };
    }),
}));
