import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStore } from '../store';
import { buildRenderStack } from '../utils/renderStack';

interface DebugViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'tokens' | 'ast' | 'renderStack';
}

import { useTheme } from './ThemeContextProvider';

export const DebugView: React.FC<DebugViewProps> = ({ open, onOpenChange, defaultTab = 'tokens' }) => {
  const { tokens, ast, diagram } = useStore();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'tokens' | 'ast' | 'renderStack'>(defaultTab);

  // Compute render stack on demand
  const renderStack = React.useMemo(() => {
    if (activeTab === 'renderStack' && diagram) {
      return buildRenderStack(diagram, theme as 'light' | 'dark');
    }
    return null;
  }, [activeTab, diagram, theme]);

  // Sync default tab if changed externally
  React.useEffect(() => {
      if (open) {
          setActiveTab(defaultTab);
      }
  }, [defaultTab, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Debug View</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 border-b pb-2">
          <Button 
            variant={activeTab === 'tokens' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('tokens')}
            size="sm"
          >
            Tokens
          </Button>
          <Button 
            variant={activeTab === 'ast' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('ast')}
            size="sm"
          >
            AST
          </Button>
          <Button 
            variant={activeTab === 'renderStack' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('renderStack')}
            size="sm"
          >
            Render Stack
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-muted p-4 rounded text-xs font-mono whitespace-pre-wrap">
          {activeTab === 'tokens' && (
            <pre>{JSON.stringify(tokens, null, 2)}</pre>
          )}
          {activeTab === 'ast' && (
            <pre>{JSON.stringify(ast, null, 2)}</pre>
          )}
          {activeTab === 'renderStack' && (
            <pre>{JSON.stringify(renderStack, null, 2)}</pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
