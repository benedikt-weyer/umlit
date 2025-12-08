import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const Toolbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  const handleExportPng = () => {
    window.dispatchEvent(new CustomEvent('export-png'));
  };

  const handleExportSvg = () => {
    window.dispatchEvent(new CustomEvent('export-svg'));
  };

  return (
    <div className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">UMLit</h1>
        <span className="text-sm text-muted-foreground">Text-to-Visual Diagram Editor</span>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={toggleTheme} variant="ghost" size="sm">
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
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
