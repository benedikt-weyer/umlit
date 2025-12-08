import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useStore } from '../store';

export const Editor: React.FC = () => {
  const { code, setCode } = useStore();

  const handleChange = React.useCallback((value: string) => {
    setCode(value);
  }, [setCode]);

  return (
    <div className="h-full w-full bg-[#1e1e1e]">
      <CodeMirror
        value={code}
        height="100%"
        theme="dark"
        extensions={[javascript()]}
        onChange={handleChange}
        className="h-full text-base"
      />
    </div>
  );
};
