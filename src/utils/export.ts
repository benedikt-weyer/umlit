import type { Diagram } from '../types';

export function generateSVG(diagram: Diagram): string {
  const padding = 50;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // Calculate bounds
  diagram.nodes.forEach(node => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, -node.y); // Invert Y for calculation
    maxX = Math.max(maxX, node.x + 150); // Width
    maxY = Math.max(maxY, -node.y + 80); // Height
  });

  if (diagram.nodes.length === 0) {
    minX = 0; minY = 0; maxX = 800; maxY = 600;
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" style="font-family: sans-serif;">`;
  
  // Background
  svg += `<rect x="${minX - padding}" y="${minY - padding}" width="${width}" height="${height}" fill="#f9fafb" />`;

  // Edges
  diagram.edges.forEach(edge => {
    const source = diagram.nodes.find(n => n.id === edge.source);
    const target = diagram.nodes.find(n => n.id === edge.target);
    if (source && target) {
      const x1 = source.x;
      const y1 = -source.y;
      const x2 = target.x;
      const y2 = -target.y;
      
      // Line
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="2" />`;
      
      // Lollipop Circle
      svg += `<circle cx="${x2}" cy="${y2}" r="5" fill="white" stroke="black" stroke-width="1" />`;
    }
  });

  // Nodes
  diagram.nodes.forEach(node => {
    const x = node.x;
    const y = -node.y;
    const w = 150;
    const h = 80;
    
    // Node Group
    svg += `<g transform="translate(${x - w/2}, ${y - h/2})">`;
    
    // Box
    svg += `<rect width="${w}" height="${h}" fill="${node.color || 'white'}" stroke="black" stroke-width="1" />`;
    
    // Icon Placeholder
    svg += `<rect x="10" y="${h/2 - 10}" width="20" height="20" fill="#ddd" stroke="#666" stroke-width="1" />`;
    
    // Label
    svg += `<text x="${w/2}" y="${h/2}" dominant-baseline="middle" text-anchor="middle" font-size="16" fill="black">${node.label}</text>`;
    
    svg += `</g>`;
  });

  svg += `</svg>`;
  return svg;
}

export function downloadStringAsFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
