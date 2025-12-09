import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Moon, Sun, LayoutGrid } from 'lucide-react';
import { useTheme } from './ThemeContextProvider';
import { useStore } from '../store';

export const ApplicationToolbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const diagramType = useStore((state) => state.diagram.type);
  const autoLayout = useStore((state) => state.autoLayout);
  
  const handleExportPng = () => {
    window.dispatchEvent(new CustomEvent('export-png'));
  };

  const handleExportSvg = () => {
    window.dispatchEvent(new CustomEvent('export-svg'));
  };

  const handleAutoLayout = () => {
    autoLayout();
  };

  return (
    <div className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">UMLit</h1>
        <span className="text-sm text-muted-foreground">Text-to-Visual Diagram Editor</span>
        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-mono">
          {diagramType}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleAutoLayout} variant="outline" size="sm">
          <LayoutGrid className="w-4 h-4 mr-2" />
          Auto Layout
        </Button>
        <Button onClick={toggleTheme} variant="ghost" size="default">
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
        <Button onClick={handleExportPng} size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export PNG
        </Button>
        <Button onClick={handleExportSvg} size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export SVG
        </Button>
      </div>
    </div>
  );
};
