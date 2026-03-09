import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { RefreshCw, Trash2, Download } from 'lucide-react';

interface MindMapProps {
  data: any;
  onRegenerate?: () => void;
  onClear?: () => void;
}

export const MindMap: React.FC<MindMapProps> = ({ data, onRegenerate, onClear }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const width = 1200;
    const height = 800;
    const margin = { top: 20, right: 300, bottom: 20, left: 300 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const tree = d3.tree().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    const root = d3.hierarchy(data);
    tree(root);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1.5)
      .attr("d", d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any);

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", (d: any) => "node" + (d.children ? " node--internal" : " node--leaf"))
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`);

    node.append("circle")
      .attr("r", 4)
      .attr("fill", (d: any) => d.children ? "#555" : "#999");

    node.append("text")
      .attr("dy", 3)
      .attr("x", (d: any) => d.children ? -8 : 8)
      .style("text-anchor", (d: any) => d.children ? "end" : "start")
      .style("font-size", "12px")
      .style("font-family", "sans-serif")
      .text((d: any) => d.data.name);

  }, [data]);

  const handleExportJPG = () => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const padding = 50;
      canvas.width = 1200 + padding * 2;
      canvas.height = 800 + padding * 2;
      
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding);
        
        const link = document.createElement('a');
        link.download = `mindmap_${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  };

  return (
    <div className="w-full h-full overflow-auto bg-white rounded-xl border border-black/5 shadow-sm p-4 relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-lg"
            title="生成"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {onClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-lg"
            title="清空"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleExportJPG}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg"
          title="导出JPG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <svg ref={svgRef} width="1200" height="800" viewBox="0 0 1200 800"></svg>
    </div>
  );
};
