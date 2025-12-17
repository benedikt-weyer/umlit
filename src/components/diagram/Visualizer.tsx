import React, { useState, useRef, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import { useStore } from '../../store';
import { Edge } from './Edge';
import { useTheme } from '../ThemeContextProvider';
import { buildRenderStack } from '../../utils/renderStack';
import { Renderer } from './Renderer';
import { generateSVG, downloadStringAsFile } from '../../utils/export';

export const Visualizer: React.FC = () => {
  const diagram = useStore((state) => state.diagram);
  const updateNodePosition = useStore((state) => state.updateNodePosition);
  const { theme } = useTheme();
  const stageRef = useRef<any>(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Build render stack from diagram
  const renderStack = useMemo(() => {
    return buildRenderStack(diagram, theme);
  }, [diagram, theme]);

  const handleNodeDrag = (nodeId: string, x: number, y: number) => {
    updateNodePosition(nodeId, x, y);
  };

  // Handle container resize
  React.useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle wheel zoom
  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const zoomSpeed = 0.001;
    const delta = -e.evt.deltaY * zoomSpeed;
    const newScale = Math.max(0.1, Math.min(5, oldScale * (1 + delta)));

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // PNG export handler
  React.useEffect(() => {
    const handlePng = () => {
      if (!stageRef.current) return;
      
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'diagram.png';
      a.click();
    };

    const handleSvg = () => {
      const svgContent = generateSVG(diagram);
      downloadStringAsFile(svgContent, 'diagram.svg', 'image/svg+xml');
    };

    window.addEventListener('export-png', handlePng);
    window.addEventListener('export-svg', handleSvg);

    return () => {
      window.removeEventListener('export-png', handlePng);
      window.removeEventListener('export-svg', handleSvg);
    };
  }, [diagram]);

  const bgColor = theme === 'dark' ? '#0a0a0a' : '#fafafa';

  return (
    <div ref={containerRef} className="h-full w-full bg-background relative">
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable
        onWheel={handleWheel}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setStagePos({
              x: e.target.x(),
              y: e.target.y(),
            });
          }
        }}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        style={{ backgroundColor: bgColor }}
      >
        <Layer>
          {/* Render edges */}
          {diagram.edges.map((edge) => (
            <Edge key={edge.id} {...edge} />
          ))}
          
          {/* Render everything from the stack */}
          <Renderer renderStack={renderStack} onNodeDrag={handleNodeDrag} />
        </Layer>
      </Stage>
    </div>
  );
};
