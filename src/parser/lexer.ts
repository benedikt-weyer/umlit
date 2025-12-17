export enum TokenType {
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  LBRACE = 'LBRACE',     // {
  RBRACE = 'RBRACE',     // }
  AT = 'AT',             // @
  COMMA = 'COMMA',       // ,
  COLON = 'COLON',       // :
  ARROW = 'ARROW',       // ->
  DELEGATE_ARROW = 'DELEGATE_ARROW', // ->delegate->
  KEYWORD_PORT = 'PORT', // port
  KEYWORD_ON = 'ON',     // on
  SIDE = 'SIDE',         // left, right, top, bottom
  INTERFACE_CONNECTOR = 'INTERFACE', // -())-, -(()-, etc.
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  STRING = 'STRING', // For labels that might contain spaces if quoted, or just text
  NEWLINE = 'NEWLINE',
  WHITESPACE = 'WHITESPACE',
  EOF = 'EOF'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(options: { includeWhitespace?: boolean } = {}): Token[] {
    const tokens: Token[] = [];
    let token = this.nextToken(options.includeWhitespace);

    while (token.type !== TokenType.EOF) {
      // If includeWhitespace is true, everything is included (except maybe Newlines if filtered? No, usually include all)
      // Original logic:
      // if (token.type !== TokenType.NEWLINE) { ... }
      
      // If we are highlighting, we need ALL tokens including Newlines and Whitespace.
      // If we are parsing, we usually skip whitespace (Lexer default behavior was skipping in nextToken).
      
      // If using default (parsing), nextToken skips whitespace.
      // But tokenize loop filters NEWLINE?
      // "if (token.type !== TokenType.NEWLINE) ... // For now, let's include NEWLINEs" -> code commented out logic implies logic includes NEWLINEs.
      
      tokens.push(token);
      token = this.nextToken(options.includeWhitespace);
    }
    tokens.push(token); // Push EOF
    return tokens;
  }

  private nextToken(includeWhitespace: boolean = false): Token {
    if (!includeWhitespace) {
        this.skipWhitespace();
    } else {
        // Build whitespace token if current char is whitespace
        if (this.isWhitespace(this.peek()) && this.peek() !== '\n') {
            let value = '';
            while (this.position < this.input.length && this.isWhitespace(this.peek()) && this.peek() !== '\n') {
                value += this.input[this.position];
                this.advance();
            }
            return this.createToken(TokenType.WHITESPACE, value);
        }
    }

    if (this.position >= this.input.length) {
      return this.createToken(TokenType.EOF, '');
    }

    const char = this.input[this.position];

    // Newlines
    if (char === '\n') {
      this.advance();
      this.line++;
      this.column = 1;
      return this.createToken(TokenType.NEWLINE, '\n');
    }

    // Single character tokens
    if (char === '[') return this.advanceWithToken(TokenType.LBRACKET, '[');
    if (char === ']') return this.advanceWithToken(TokenType.RBRACKET, ']');
    if (char === '{') return this.advanceWithToken(TokenType.LBRACE, '{');
    if (char === '}') return this.advanceWithToken(TokenType.RBRACE, '}');
    if (char === '@') return this.advanceWithToken(TokenType.AT, '@');
    if (char === ',') return this.advanceWithToken(TokenType.COMMA, ',');
    if (char === ':') return this.advanceWithToken(TokenType.COLON, ':');

    // Arrows and connectors (starting with -)
    if (char === '-') {
      // Check for ->delegate->
      if (this.match('->delegate->')) {
        return this.advanceWithToken(TokenType.DELEGATE_ARROW, '->delegate->', 12);
      }
      // Check for -->
      if (this.match('-->')) {
        return this.advanceWithToken(TokenType.ARROW, '-->', 3);
      }
      // Check for ->
      if (this.match('->')) {
        return this.advanceWithToken(TokenType.ARROW, '->', 2);
      }
      // Check for interface connectors like -())- or -(()-
      // Regex: -([()]+)-
      const substr = this.input.slice(this.position);
      const interfaceMatch = substr.match(/^(-(?:\(\)|[()])+-)/);
      if (interfaceMatch) {
         return this.advanceWithToken(TokenType.INTERFACE_CONNECTOR, interfaceMatch[0], interfaceMatch[0].length);
      }
    }

    // Identifiers and Keywords
    if (this.isAlpha(char) || char === '.') { 
      let value = '';
      while (this.position < this.input.length) {
        const c = this.input[this.position];
        if (this.isAlphaNumeric(c) || c === '.') {
          value += c;
          this.advance();
        } else if (c === '-') {
            // Check if it's an arrow or connector start
            // current this.position points to c.
            // peek(1) would be next char.
            const next = this.peek(1);
            if (next === '>' || next === '(' || next === ')') {
                break; // Start of arrow/connector
            }
            // Otherwise it's part of identifier
            value += c;
            this.advance();
        } else {
            break;
        }
      }

      if (value === 'port') return this.createToken(TokenType.KEYWORD_PORT, value);
      if (value === 'on') return this.createToken(TokenType.KEYWORD_ON, value);
      if (['left', 'right', 'top', 'bottom'].includes(value)) return this.createToken(TokenType.SIDE, value);

      return this.createToken(TokenType.IDENTIFIER, value);
    }

    // Numbers
    if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek(1)))) {
        let value = '';
        if (char === '-') {
            value += '-';
            this.advance();
        }
        while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
            value += this.input[this.position];
            this.advance();
        }
        return this.createToken(TokenType.NUMBER, value);
    }

    // String/Rest of line labels (Handling "label string" is tricky without quotes if we consumed identifiers)
    // The current parser uses regex which captures "everything else" as label.
    // We might need a generic STRING token that captures unquoted text until newline or special char
    // specialized for context?
    // For now, let's treat unknown sequences as STRING if they don't match others.
    
    // BUT, the parser defines [id] label @ x,y. "label" can be anything.
    // So "User Interface" is two identifiers? Or one string?
    // Let's consume until newline or { or @ or ] or } if we hit something unknown?
    // Or simpler: We treat identifiers as strings. If we see spaces, they separate tokens.
    // If the parser expects a Label, it can consume multiple IDENTIFIER/STRING tokens.
    
    // Let's handle generic text as IDENTIFIER for now, but better support spaces?
    // The previous regex parsed "User Interface" as one group.
    
    // Let's assume labels are unquoted strings.
    // If we encounter a character that doesn't start a known token, maybe we consume it as part of an identifier/string?
    // Currently `isAlpha` handles basic letters.
    
    // Let's stick to standard tokenization: "User Interface" -> IDENTIFIER "User", IDENTIFIER "Interface"
    // The parser will be responsible for joining them if it expects a multi-word label.
    
    return this.advanceWithToken(TokenType.STRING, char); // Fallback for single chars
  }

  private skipWhitespace() {
    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private advance() {
    this.position++;
    this.column++;
  }

  private advanceWithToken(type: TokenType, value: string, length?: number): Token {
    const len = length || value.length;
    // value is passed for creating token, but we might just have advanced 1 char if length not passed
    // Actually we should advance by length
    if (length && length > 1) {
        // We already advanced? No, helper didn't.
        // But for single chars causing this call, we haven't advanced yet.
    }
    
    // Correct logic:
    // We haven't advanced the stream for the match yet if we just checked char/match.
    // If we consumed in loop (Identifier), we advanced.
    
    // For single/fixed tokens:
    const token = this.createToken(type, value);
    this.position += len;
    this.column += len;
    return token;
  }

  private createToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column
    };
  }

  private match(str: string): boolean {
    return this.input.slice(this.position).startsWith(str);
  }

  private peek(offset: number = 0): string {
    return this.input[this.position + offset] || '';
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\r';
  }
}
