import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useStore } from '../store';
import { useTheme } from './ThemeContextProvider';

export const SourceCodeEditor: React.FC = () => {
  const { code, setCode } = useStore();
  const { theme } = useTheme();

  const handleChange = React.useCallback((value: string) => {
    setCode(value);
  }, [setCode]);

  return (
    <div className="h-full w-full bg-background">
      <CodeMirror
        value={code}
        height="100%"
        theme={theme === 'dark' ? 'dark' : 'light'}
        extensions={[javascript()]}
        onChange={handleChange}
        className="h-full text-base"
      />
    </div>
  );
};
