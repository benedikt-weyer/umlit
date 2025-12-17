import { create } from 'zustand';
import { parseDiagram } from './parser';
import type { Diagram, Node, Port } from './types';
import type { DiagramAST } from './types/ast';
import type { Token } from './parser/lexer';
import { autoLayoutNodes, updateCodeWithPositions } from './utils/autoLayout';

interface AppState {
  code: string;
  diagram: Diagram;
  error: Error | null;
  tokens: Token[] | null;
  ast: DiagramAST | null;
  setCode: (code: string) => void;
  resetCode: () => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  autoLayout: () => void;
}

const DEFAULT_CODE = `[uml2.5-component] {
  [NodeA] User
  [NodeB] Service {
    [NodeB1] Handler
    [NodeB2] Logic
    port [p1] with [Connection1] left : API
    port [p2] with [Connection2] right : API2
  }
  [NodeC] Database

  [Connection1] NodeA -())- NodeB1
  [Connection2] NodeC -(()- NodeB2
}`.trim();

// Initialize with auto-layout applied
const initializeDiagram = () => {
  const { diagram: initialDiagram, error: initialError, ast: initialAST, tokens: initialTokens } = parseDiagram(DEFAULT_CODE);
  
  if (initialError) {
      return { 
        code: DEFAULT_CODE, 
        diagram: initialDiagram, 
        error: initialError,
        ast: initialAST || null,
        tokens: initialTokens || null
      };
  }
  
  const layoutedNodes = autoLayoutNodes(initialDiagram.nodes, initialDiagram);
  const layoutedCode = updateCodeWithPositions(DEFAULT_CODE, layoutedNodes);
  const { diagram: layoutedDiagram, error: layoutError, ast: layoutAST, tokens: layoutTokens } = parseDiagram(layoutedCode);
  
  return {
    code: layoutedCode,
    diagram: layoutedDiagram,
    error: layoutError || null,
    ast: layoutAST || null,
    tokens: layoutTokens || null
  };
};

const initialState = initializeDiagram();

export const useStore = create<AppState>((set) => ({
  code: initialState.code,
  diagram: initialState.diagram,
  error: initialState.error,
  tokens: initialState.tokens,
  ast: initialState.ast,
  setCode: (code) =>
    set(() => {
      const { diagram, error, ast, tokens } = parseDiagram(code);
      return { 
        code, 
        diagram, 
        error: error || null,
        ast: ast || null,
        tokens: tokens || null
      };
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
        const indentMatch = line.match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : '';
        
        // Check each moved node
        for (const nodeId of nodesToUpdate) {
          const nodeRegex = new RegExp(`^\\[${nodeId}\\]`);
          if (nodeRegex.test(trimmed)) {
            const updatedNode = newNodes.find(n => n.id === nodeId);
            if (updatedNode) {
              // Check if it already has coordinates
              if (trimmed.includes('@')) {
                const updated = trimmed.replace(/@\s*-?\d+,\s*-?\d+/, `@ ${updatedNode.x},${updatedNode.y}`);
                return `${indent}${updated}`;
              } else {
                return `${indent}${trimmed} @ ${updatedNode.x},${updatedNode.y}`;
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
  resetCode: () =>
    set(() => {
      const { diagram, error, ast, tokens } = parseDiagram(DEFAULT_CODE);
      
      if (error) {
        return {
          code: DEFAULT_CODE,
          diagram,
          error: error || null,
          ast: ast || null,
          tokens: tokens || null
        };
      }
      
      const layoutedNodes = autoLayoutNodes(diagram.nodes, diagram);
      const layoutedCode = updateCodeWithPositions(DEFAULT_CODE, layoutedNodes);
      const { diagram: layoutedDiagram, error: layoutError, ast: layoutAST, tokens: layoutTokens } = parseDiagram(layoutedCode);
      
      return {
        code: layoutedCode,
        diagram: layoutedDiagram,
        error: layoutError || null,
        ast: layoutAST || null,
        tokens: layoutTokens || null
      };
    }),
  autoLayout: () =>
    set((state) => {
      // Apply auto-layout algorithm
      const layoutedNodes = autoLayoutNodes(state.diagram.nodes, state.diagram);
      
      // Update code with new positions
      const newCode = updateCodeWithPositions(state.code, layoutedNodes);
      
      return {
        code: newCode,
        diagram: { ...state.diagram, nodes: layoutedNodes },
      };
    }),
}));
