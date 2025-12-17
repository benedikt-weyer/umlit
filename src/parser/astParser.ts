import type { Diagram, Node, Connector, Port, DiagramType } from '../types';
import type { DiagramAST, ASTNode, ASTEdge, ASTPort } from '../types/ast'; // Revert to import AST types
import { TokenType, Lexer } from './lexer';
import type { Token } from './lexer';

export class ParserError extends Error {
  public line: number;
  public column: number;

  constructor(message: string, line: number, column: number) {
    super(message);
    this.name = 'ParserError';
    this.line = line;
    this.column = column;
  }
}

interface ParsedCst {
  type: DiagramType;
  rootNodes: ASTNode[];
  connectors: ASTConnector[]; 
  tokens: Token[];
}
const MAX_DEPTH = 50;

export function parseToAST(code: string): ParsedCst {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  
  // Basic parsing state
  let currentTokenIndex = 0;
  
  function peek(offset: number = 0): Token {
    return tokens[currentTokenIndex + offset];
  }
  
  function advance(): Token {
    const token = tokens[currentTokenIndex];
    currentTokenIndex++;
    return token;
  }
  
  function consume(type: TokenType, errorMsg?: string): Token {
    const token = peek();
    if (token.type === type) {
      return advance();
    }
    throw new ParserError(errorMsg || `Expected ${type} but got ${token.type}`, token.line, token.column);
  }
  
  function match(type: TokenType): boolean {
    return peek().type === type;
  }
  
  // Diagram type detection
  // Expect [diagram-type] { ... }
  // or just Content if no wrapper? The original parser handled wrapper.
  
  let diagramType: DiagramType = 'uml2.5-component';
  let rootNodes: ASTNode[] = [];
  let connectors: ASTConnector[] = [];
  let edgeIdCounter = 0;
  const nodeStack: ASTNode[] = [];
  
  // Check for wrapper
  if (match(TokenType.LBRACKET)) {
    // Could be [diagram-type] { ... } OR just a node [id] ...
    // Look ahead?
    // If it's [diagram-type], next is IDENTIFIER then RBRACKET then LBRACE
    // If it's [id], next is IDENTIFIER then RBRACKET then LABEL...
    
    // Let's rely on the identifier value?
    const nextFn = peek(1);
    const validTypes = ['uml2.5-component', 'uml2.5-class', 'uml2.5-sequence', 'uml2.5-activity'];
    
    if (nextFn.type === TokenType.IDENTIFIER && validTypes.includes(nextFn.value)) {
       // It's a diagram wrapper
       consume(TokenType.LBRACKET);
       const typeToken = consume(TokenType.IDENTIFIER);
       diagramType = typeToken.value as DiagramType;
       consume(TokenType.RBRACKET);
       consume(TokenType.LBRACE);
       
       // Parse content inside
       parseBlockContent();
       
       // Expect closing brace
       if (match(TokenType.RBRACE)) {
         consume(TokenType.RBRACE);
       }
       return { type: diagramType, rootNodes, connectors, tokens };
    }
  }
  
  // If no wrapper, just parse content
  parseBlockContent();
  
  function parseBlockContent() {
    while (!match(TokenType.EOF) && !match(TokenType.RBRACE)) {
      if (match(TokenType.NEWLINE)) {
        advance();
        continue;
      }
      
      parseStatement();
    }
  }
  
  function parseStatement() {
    // 1. Port definition: port [id] on [node] side : label
    if (match(TokenType.KEYWORD_PORT)) {
      parsePort();
      return;
    }
    
    // 2. Node or Named Edge
    // Node: [id] label @ x,y { or [id] label
    // Named Edge: [name] source -())- target
    
    if (match(TokenType.LBRACKET)) {
      // Look ahead to determine if this is a node or a named connector
      // [id] IDENTIFIER (if next is arrow/connector, it's an edge, else it's a node)
      const checkIndex = currentTokenIndex;
      consume(TokenType.LBRACKET);
      consume(TokenType.IDENTIFIER);
      consume(TokenType.RBRACKET);
      
      // Check what comes after [id]
      const nextToken = peek();
      
      // Reset to original position
      currentTokenIndex = checkIndex;
      
      // If next token is an identifier followed by a connector, it's a named edge
      if (nextToken.type === TokenType.IDENTIFIER) {
        // Look even further ahead to handle optional interface name
        // Could be: [Connection1] NodeA -())- NodeB1
        // Or: [Connection1] ExportPDF NodeA -())- NodeB1
        const checkIndex2 = currentTokenIndex;
        consume(TokenType.LBRACKET);
        consume(TokenType.IDENTIFIER);
        consume(TokenType.RBRACKET);
        consume(TokenType.IDENTIFIER); // First identifier (could be interface name OR source node)
        const afterFirst = peek();
        
        // Check if there's another identifier (meaning first was interface name)
        if (afterFirst.type === TokenType.IDENTIFIER) {
          consume(TokenType.IDENTIFIER); // Second identifier (source node)
          const afterSecond = peek();
          currentTokenIndex = checkIndex2;
          
          if (afterSecond.type === TokenType.ARROW || 
              afterSecond.type === TokenType.DELEGATE_ARROW || 
              afterSecond.type === TokenType.INTERFACE_CONNECTOR) {
            parseEdge();
            return;
          }
        } else {
          // Only one identifier after [id], check if connector follows
          currentTokenIndex = checkIndex2;
          
          if (afterFirst.type === TokenType.ARROW || 
              afterFirst.type === TokenType.DELEGATE_ARROW || 
              afterFirst.type === TokenType.INTERFACE_CONNECTOR) {
            parseEdge();
            return;
          }
        }
        
        // Reset and fall through to node parsing
        currentTokenIndex = checkIndex;
      }
      
      // Otherwise it's a node
      parseNode();
    } else if (match(TokenType.IDENTIFIER)) {
      parseEdge();
    } else {
      // Unknown or unexpected token, skip to newline
      // console.warn('Unexpected token:', peek());
      advance();
      while (!match(TokenType.NEWLINE) && !match(TokenType.EOF)) {
        advance();
      }
    }
  }
  
  function parseNode() {
    consume(TokenType.LBRACKET);
    const idToken = consume(TokenType.IDENTIFIER, "Expected node ID");
    consume(TokenType.RBRACKET);
    
    // Label can be multiple tokens until @ or { or newline
    let label = "";
    while(
        !match(TokenType.AT) && 
        !match(TokenType.LBRACE) && 
        !match(TokenType.NEWLINE) && 
        !match(TokenType.EOF) &&
        !match(TokenType.RBRACE) // End of block
    ) {
        if (label.length > 0) label += " ";
        label += advance().value;
    }
    label = label.trim();
    
    let x: number | undefined;
    let y: number | undefined;
    
    if (match(TokenType.AT)) {
      consume(TokenType.AT);
      const xToken = consume(TokenType.NUMBER);
      consume(TokenType.COMMA);
      const yToken = consume(TokenType.NUMBER);
      x = parseInt(xToken.value, 10);
      y = parseInt(yToken.value, 10);
    }
    
    const node: ASTNode = {
      id: idToken.value,
      label,
      x,
      y,
      children: [],
      ports: []
    };
    
    const parent = nodeStack.length > 0 ? nodeStack[nodeStack.length - 1] : null;
    if (parent) {
      parent.children.push(node);
    } else {
      rootNodes.push(node);
    }
    
    // Nested content?
    if (match(TokenType.LBRACE)) {
      consume(TokenType.LBRACE);
      nodeStack.push(node);
      
      if (nodeStack.length > MAX_DEPTH) {
          console.warn("Max nesting depth exceeded");
      }
      
      parseBlockContent();
      
      consume(TokenType.RBRACE);
      nodeStack.pop();
    }
  }
  
  function parseEdge() {
    // Check if this is a named connector: [ConnectionName] source ... target
    let connectorName: string | undefined;
    if (match(TokenType.LBRACKET)) {
      consume(TokenType.LBRACKET);
      const nameToken = consume(TokenType.IDENTIFIER, "Expected connector name");
      connectorName = nameToken.value;
      consume(TokenType.RBRACKET);
    }
    
    // Check for optional interface name before source node
    // Format: [ConnectionName] InterfaceName SourceNode -connector- TargetNode
    // We need to look ahead to see if there are two identifiers before the connector symbol
    let interfaceName: string | undefined;
    
    const checkIndex = currentTokenIndex;
    const firstId = peek();
    if (firstId.type === TokenType.IDENTIFIER) {
      advance(); // consume first identifier
      const secondToken = peek();
      
      // If the second token is also an identifier, first is interface name, second is source
      if (secondToken.type === TokenType.IDENTIFIER) {
        interfaceName = firstId.value;
        // Continue parsing with second identifier as source
      } else {
        // Only one identifier, it's the source node, reset
        currentTokenIndex = checkIndex;
      }
    }
    
    // source . port ... or source ...
    const sourceToken = consume(TokenType.IDENTIFIER, "Expected source node");
    let sourcePortId: string | undefined;
    
    // Check for source.port
    // The previous token was just source. If next is DOT... wait, Lexer doesn't have DOT token, it treats "source.port" as IDENTIFIER if simple
    // My Lexer implementation: identifier allows dots inside.
    // So "NodeA.p1" is one token.
    
    let sourceNodeId = sourceToken.value;
    if (sourceNodeId.includes('.')) {
        const parts = sourceNodeId.split('.');
        sourceNodeId = parts[0];
        sourcePortId = parts[1];
    }
    
    // Edge Type
    let edgeType: string | undefined;
    let stereotype: string | undefined;
    let isDelegate = false;
    
    if (match(TokenType.ARROW)) {
      const token = consume(TokenType.ARROW);
      edgeType = token.value;
    } else if (match(TokenType.DELEGATE_ARROW)) {
      consume(TokenType.DELEGATE_ARROW);
      isDelegate = true;
      stereotype = 'delegate';
    } else if (match(TokenType.INTERFACE_CONNECTOR)) {
      edgeType = consume(TokenType.INTERFACE_CONNECTOR).value;
      // Previous regex: match[2] was (-...-) 
      // Actually regex was: ^([\w.]+)\s+(-(?:\(\)|[()])+-)?\s+...
      // So it captured the whole thing.
      // Wait, let's check old parser:
      // const edgeType = interfaceMatch[2].trim(); -> it included the dashes.
      // My lexer returns full string "-())-".
      // ASTEdge type expects string.
      // So no need to trim.
      // But wait:
      // if (type && type.includes('(') && type.includes(')')) in Edge.tsx
      // const symbolMatch = type.match(/-([()]+)-/);
      // It expects dashes.
    } else {
       const token = peek();
       throw new ParserError(`Unexpected token for edge connection: ${token.type}`, token.line, token.column);
    }
    
    // Target
    const targetToken = consume(TokenType.IDENTIFIER, "Expected target node");
    let targetNodeId = targetToken.value;
    let targetPortId: string | undefined;
    
    if (targetNodeId.includes('.')) {
        const parts = targetNodeId.split('.');
        targetNodeId = parts[0];
        targetPortId = parts[1];
    }
    
    // Label (can be interface name or explicit label after colon)
    let label: string | undefined;
    if (match(TokenType.COLON)) {
      consume(TokenType.COLON);
      // Label until end of line
      let l = "";
      while(!match(TokenType.NEWLINE) && !match(TokenType.EOF)) {
          if (l.length > 0) l += " ";
           l += advance().value;
      }
      label = l.trim();
    }
    
    // If no explicit label but we have an interface name, use that as the label
    if (!label && interfaceName) {
      label = interfaceName;
    }
    
    connectors.push({
      id: connectorName || `conn-${edgeIdCounter++}`, // Use name if provided, otherwise generate
      name: connectorName,
      sourceNodeId,
      targetNodeId,
      sourcePortId,
      targetPortId,
      label,
      isDelegate,
      stereotype,
      edgeType
    });
  }
  
  function parsePort() {
    consume(TokenType.KEYWORD_PORT);
    consume(TokenType.LBRACKET);
    const id = consume(TokenType.IDENTIFIER).value;
    consume(TokenType.RBRACKET);
    
    // New syntax: port [p1] with [Connection1] left : API
    // Old syntax: port [p1] on [NodeB] left : API
    let nodeId: string | undefined;
    let connectorRef: string | undefined;
    
    if (match(TokenType.KEYWORD_WITH)) {
      // New syntax with connector reference
      consume(TokenType.KEYWORD_WITH);
      consume(TokenType.LBRACKET);
      connectorRef = consume(TokenType.IDENTIFIER).value;
      consume(TokenType.RBRACKET);
      
      // Infer node from context (current node in stack)
      if (nodeStack.length > 0) {
        nodeId = nodeStack[nodeStack.length - 1].id;
      } else {
        throw new ParserError("Port with connector reference must be inside a node block", peek().line, peek().column);
      }
    } else if (match(TokenType.KEYWORD_ON)) {
      // Old syntax
      consume(TokenType.KEYWORD_ON);
      consume(TokenType.LBRACKET);
      nodeId = consume(TokenType.IDENTIFIER).value;
      consume(TokenType.RBRACKET);
    } else {
      throw new ParserError("Expected 'with' or 'on' after port ID", peek().line, peek().column);
    }
    
    const sideToken = consume(TokenType.SIDE);
    const side = sideToken.value as 'left' | 'right' | 'top' | 'bottom';
    
    let label: string | undefined;
    if (match(TokenType.COLON)) {
        consume(TokenType.COLON);
        // Label might be rest of line
        let l = "";
        while(!match(TokenType.NEWLINE) && !match(TokenType.EOF)) {
            if (l.length > 0) l += " ";
            l += advance().value;
        }
        label = l.trim();
    }
    
    // Add port to node
    // Need to find node in rootNodes or nodeStack?
    // User might define port inside the nested block or outside.
    // "port [p1] on [NodeB]" -> implies we search globally?
    // Old parser: 
    // const findAndAddPort = (nodes: ASTNode[]): boolean => { ... recurse ... }
    
    const findAndAddPort = (nodes: ASTNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          node.ports.push({ id, label, side, connectorRef });
          return true;
        }
        if (findAndAddPort(node.children)) {
          return true;
        }
      }
      return false;
    };
    
    // Try to find in current scope? Or global?
    // Old parser checked nodeStack first?
    // No, it checked rootNodes if stack empty, or stack[0] (root of current path?).
    // Actually:
    // if (nodeStack.length > 0) findAndAddPort([nodeStack[0]]); else findAndAddPort(rootNodes);
    // This implies ports must be defined within the context of the component if we are inside one?
    // Or nodeStack[0] is the top-most parent being parsed?
    
    // Let's search from rootNodes to be safe, assuming IDs are unique enough or user knows what they are doing.
    if (!findAndAddPort(rootNodes)) {
        // If we are deep inside, maybe the node is in the stack but not attached to root yet?
        // But nodes are added to parents immediately.
        // So searching from rootNodes is comprehensive.
        console.warn(`Node ${nodeId} not found for port ${id}`);
    }
  }

  return { type: diagramType, rootNodes, connectors, tokens };
}

// Basic parser that converts text to AST

export function convertASTToDiagram(ast: DiagramAST | null): Diagram {
  // This function is deprecated/unused as index.ts implements its own.
  // But index.ts IMPORTS it? No, index.ts defines its own `convertASTToDiagram`.
  // Wait, let me check index.ts again. 
  // index.ts: import { parseToAST } from './astParser';
  // index.ts has `function convertASTToDiagram(ast: DiagramAST): Diagram { ... }` locally defined.
  // So I can remove it from here.
  return { type: 'uml2.5-component', nodes: [], connectors: [], ports: [] };
}
// Actually, better to remove the function entirely if not exported/used.
// But check if other files import it.
// `grep` for usage?

