import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface MindMapProps {
  data: any;
}

export const MindMap: React.FC<MindMapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };

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

  return (
    <div className="w-full h-full overflow-auto bg-white rounded-xl border border-black/5 shadow-sm p-4">
      <svg ref={svgRef} width="1000" height="800" viewBox="0 0 1000 800"></svg>
    </div>
  );
};
