import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { linter, type Diagnostic } from '@codemirror/lint';
import { useStore } from '../store';
import { useTheme } from './ThemeContextProvider';
import { ParserError } from '../parser/astParser';

export const SourceCodeEditor: React.FC = () => {
  const { code, setCode, error } = useStore();
  const { theme } = useTheme();

  const handleChange = React.useCallback((value: string) => {
    setCode(value);
  }, [setCode]);

  const errorExtension = React.useMemo(() => {
    return linter((view) => {
      if (!error || !(error instanceof ParserError)) return [];
      
      try {
          // Verify line exists
          if (error.line > view.state.doc.lines) return [];
          
          const lineObj = view.state.doc.line(error.line);
          // Highlight from column to end of word or line
          // ParserError column is 1-based start of token
          const from = Math.min(lineObj.from + error.column - 1, lineObj.to);
          const to = lineObj.to; // For now highlight rest of line
          
          const diagnostic: Diagnostic = {
            from,
            to: Math.max(from + 1, to), // Ensure at least 1 char
            severity: 'error',
            message: error.message,
          };
          return [diagnostic];
      } catch (e) {
          return [];
      }
    });
  }, [error]);

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={code}
          height="100%"
          theme={theme === 'dark' ? 'dark' : 'light'}
          extensions={[javascript(), errorExtension]}
          onChange={handleChange}
          className="h-full text-base"
        />
      </div>
      {error && (
        <div className="bg-destructive/10 text-destructive p-2 text-sm border-t border-destructive/20 font-mono">
          {error.message}
        </div>
      )}
    </div>
  );
};
