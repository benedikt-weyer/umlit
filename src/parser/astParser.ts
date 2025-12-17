import type { DiagramAST, ASTNode, ASTEdge, ASTPort, DiagramType } from '../types/ast';
import { Lexer, TokenType, type Token } from './lexer';

export class ParserError extends Error {
  line: number;
  column: number;
  
  constructor(message: string, line: number, column: number) {
    super(`${message} (Line ${line}, Column ${column})`);
    this.name = 'ParserError';
    this.line = line;
    this.column = column;
  }
}

const MAX_DEPTH = 50;

export function parseToAST(code: string): DiagramAST {
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
  let edges: ASTEdge[] = [];
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
       return { type: diagramType, rootNodes, edges, tokens };
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
    
    // 2. Node or Edge
    // Node starts with [id]
    // Edge starts with Identifier (source) -> ...
    
    if (match(TokenType.LBRACKET)) {
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
      consume(TokenType.ARROW);
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
    
    // Label
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
    
    edges.push({
      id: `edge-${edgeIdCounter++}`,
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
    consume(TokenType.KEYWORD_ON);
    consume(TokenType.LBRACKET);
    const nodeId = consume(TokenType.IDENTIFIER).value;
    consume(TokenType.RBRACKET);
    
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
          node.ports.push({ id, label, side });
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

  return { type: diagramType, rootNodes, edges, tokens };
}
