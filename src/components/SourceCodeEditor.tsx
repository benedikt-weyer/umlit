import React, { useRef, useMemo } from 'react';
import { useStore } from '../store';
import { useTheme } from './ThemeContextProvider';
import { cn } from '@/lib/utils';
import { Lexer, TokenType, type Token } from '../parser/lexer';
import { ParserError } from '../parser/astParser';

const getTokenColor = (type: TokenType, theme: 'light' | 'dark'): string => {
  const isDark = theme === 'dark';
  
  switch (type) {
    case TokenType.KEYWORD_PORT:
    case TokenType.KEYWORD_ON:
    case TokenType.KEYWORD_WITH:
      return isDark ? '#569cd6' : '#0000ff'; // Blue
    case TokenType.SIDE:
      return isDark ? '#c586c0' : '#af00db'; // Purple
    case TokenType.LBRACKET:
    case TokenType.RBRACKET:
    case TokenType.LBRACE:
    case TokenType.RBRACE:
    case TokenType.AT:
    case TokenType.COMMA:
    case TokenType.COLON:
      return isDark ? '#d4d4d4' : '#000000'; // Standard text
    case TokenType.ARROW:
    case TokenType.DELEGATE_ARROW:
    case TokenType.INTERFACE_CONNECTOR:
      return isDark ? '#dcdcaa' : '#795e26'; // Yellow/Gold
    case TokenType.NUMBER:
      return isDark ? '#b5cea8' : '#098658'; // Green
    case TokenType.IDENTIFIER:
      return isDark ? '#9cdcfe' : '#001080'; // Light Blue / Navy
    case TokenType.STRING:
      return isDark ? '#ce9178' : '#a31515'; // Red/Brownish
    case TokenType.NEWLINE:
    case TokenType.WHITESPACE:
    case TokenType.EOF:
      return 'transparent';
    default:
      return 'inherit';
  }
};

export const SourceCodeEditor: React.FC = () => {
  const { code, setCode, error } = useStore();
  const { theme } = useTheme();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  
  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
      if (preRef.current) {
        preRef.current.scrollTop = scrollTop;
        preRef.current.scrollLeft = scrollLeft;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const tabChar = '  '; // 2 spaces
      
      if (e.shiftKey) {
        // Shift+Tab: Unindent
        const beforeCursor = code.substring(0, start);
        const lineStart = beforeCursor.lastIndexOf('\n') + 1;
        const lineText = code.substring(lineStart, start);
        
        if (lineText.startsWith(tabChar)) {
          const newCode = code.substring(0, lineStart) + code.substring(lineStart + tabChar.length);
          setCode(newCode);
          
          // Adjust cursor position
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - tabChar.length;
          }, 0);
        }
      } else {
        // Tab: Indent
        const newCode = code.substring(0, start) + tabChar + code.substring(end);
        setCode(newCode);
        
        // Move cursor after the inserted tab
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + tabChar.length;
        }, 0);
      }
    }
  };

  const lines = code.split('\n');
  const lineCount = lines.length;

  // Tokenize for highlighting
  const tokens = useMemo(() => {
    try {
        const lexer = new Lexer(code);
        return lexer.tokenize({ includeWhitespace: true });
    } catch (e) {
        return [];
    }
  }, [code]);

  return (
    <div className={cn(
      "flex flex-col h-full border-r",
      theme === 'dark' ? "bg-[#1e1e1e]" : "bg-white"
    )}>
      <div className="flex-1 relative flex overflow-hidden">
        {/* Line Numbers */}
        <div 
          ref={lineNumbersRef}
          className={cn(
            "w-12 text-right pr-3 select-none overflow-hidden py-4 font-mono text-[14px] leading-[21px]",
            theme === 'dark' ? "bg-[#1e1e1e] text-[#858585]" : "bg-[#f0f0f0] text-[#858585] border-r"
          )}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="h-[21px]">{i + 1}</div>
          ))}
        </div>
        
        {/* Editor Container */}
        <div className="flex-1 relative overflow-hidden">
             {/* Highlight Overlay */}
            <pre
              ref={preRef}
              className={cn(
                 "absolute inset-0 m-0 p-0 pl-3 py-4 font-mono text-[14px] leading-[21px] whitespace-pre pointer-events-none overflow-hidden",
                 theme === 'dark' ? "text-[#d4d4d4]" : "text-black"
              )}
              style={{
                fontFamily: 'monospace',
              }}
              aria-hidden="true"
            >
              {tokens.map((token, i) => {
                const isError = error instanceof ParserError && 
                                token.line === error.line && 
                                token.column === error.column;
                
                return (
                  <span 
                    key={i} 
                    style={{ 
                      color: getTokenColor(token.type, theme as 'light'|'dark'),
                      textDecoration: isError ? 'underline wavy red' : undefined,
                      textDecorationSkipInk: 'none'
                    }}
                  >
                    {token.value}
                  </span>
                );
              })}
            </pre>

            {/* Transparent Textarea for Input */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              className={cn(
                "absolute inset-0 w-full h-full resize-none border-none outline-none p-0 pl-3 py-4 font-mono text-[14px] leading-[21px] whitespace-pre overflow-auto",
                "bg-transparent text-transparent caret-foreground focus:ring-0"
              )}
              spellCheck={false}
              style={{
                fontFamily: 'monospace',
                color: 'transparent',
                caretColor: theme === 'dark' ? 'white' : 'black'
              }}
            />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-2 text-sm border-t border-destructive/20 font-mono z-10 relative">
          {error.message}
        </div>
      )}
    </div>
  );
};
