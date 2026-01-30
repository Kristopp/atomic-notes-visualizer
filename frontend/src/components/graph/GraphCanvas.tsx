/**
 * GraphCanvas Component
 * Interactive D3.js force-directed graph visualization
 * Uses D3.js v7.9.0 for physics simulation
 */
import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { GraphData, GraphNode, GraphLink } from '../../types/graph';
import styles from './GraphCanvas.module.scss';

interface GraphCanvasProps {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

export default function GraphCanvas({
  data,
  width = 1200,
  height = 800,
  onNodeClick,
  onNodeHover,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [focusedNode, setFocusedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);

    // Create container group for zoom/pan
    const g = svg.append('g').attr('class', styles.graphContainer);

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(data.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(data.links)
          .id((d) => d.id)
          .distance((link) => {
            // Stronger relationships = shorter distance
            return 100 - link.strength * 50;
          })
          .strength((link) => link.strength)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => (d as GraphNode).size + 10));

    // Create links (paths instead of lines for curves)
    const link = g
      .append('g')
      .attr('class', styles.links)
      .selectAll('path')
      .data(data.links)
      .join('path')
      .attr('class', styles.link)
      .attr('stroke-width', (d) => Math.sqrt(d.strength * 8))
      .attr('stroke-opacity', (d) => 0.2 + d.strength * 0.4);

    // Create nodes
    const node = g
      .append('g')
      .attr('class', styles.nodes)
      .selectAll<SVGGElement, GraphNode>('g')
      .data(data.nodes)
      .join('g')
      .attr('class', styles.node)
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Add circles to nodes
    node
      .append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color)
      .attr('class', styles.nodeCircle)
      .style('color', (d) => d.color); // For currentColor in CSS filters

    // Add labels to nodes
    node
      .append('text')
      .text((d) => d.name)
      .attr('class', styles.nodeLabel)
      .attr('x', 0)
      .attr('y', (d) => d.size + 18);

    // Add hover effects
    node
      .on('mouseenter', function (_event, d) {
        d3.select(this).select('circle').attr('class', styles.nodeCircleHover);
        setHoveredNode(d);
        onNodeHover?.(d);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('class', styles.nodeCircle);
        setHoveredNode(null);
        onNodeHover?.(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setFocusedNode(d);
        onNodeClick?.(d);
      });

    // Update positions on each tick
    simulation.on('tick', () => {
      link.attr('d', (d) => {
        const sourceX = typeof d.source === 'object' ? d.source.x ?? 0 : 0;
        const sourceY = typeof d.source === 'object' ? d.source.y ?? 0 : 0;
        const targetX = typeof d.target === 'object' ? d.target.x ?? 0 : 0;
        const targetY = typeof d.target === 'object' ? d.target.y ?? 0 : 0;

        // Quadratic Bezier curve for a nice organic look
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;

        // Calculate control point offset for the curve
        const offsetX = -dy * 0.15;
        const offsetY = dx * 0.15;

        return `M ${sourceX} ${sourceY} Q ${midX + offsetX} ${midY + offsetY} ${targetX} ${targetY}`;
      });

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);

      // Update Opacity based on focus
      if (focusedNode) {
        const neighborIds = new Set<string>();
        data.links.forEach(l => {
          if (typeof l.source === 'object' && l.source.id === focusedNode.id) neighborIds.add(typeof l.target === 'object' ? l.target.id : '');
          if (typeof l.target === 'object' && l.target.id === focusedNode.id) neighborIds.add(typeof l.source === 'object' ? l.source.id : '');
        });
        neighborIds.add(focusedNode.id);

        node.style('opacity', (d) => neighborIds.has(d.id) ? 1 : 0.08)
          .style('filter', (d) => neighborIds.has(d.id) ? 'none' : 'grayscale(1)');

        link.style('opacity', (l) =>
          (typeof l.source === 'object' && l.source.id === focusedNode.id) ||
            (typeof l.target === 'object' && l.target.id === focusedNode.id) ? 1 : 0.02
        ).style('stroke', (l) =>
          (typeof l.source === 'object' && l.source.id === focusedNode.id) ||
            (typeof l.target === 'object' && l.target.id === focusedNode.id) ? 'rgba(99, 102, 241, 0.8)' : 'rgba(148, 163, 184, 0.15)'
        );
      } else {
        node.style('opacity', 1).style('filter', 'none');
        link.style('opacity', (d) => 0.2 + d.strength * 0.4)
          .style('stroke', 'rgba(148, 163, 184, 0.15)');
      }
    });

    svg.on('click', () => {
      setFocusedNode(null);
    });

    // Drag functions
    function dragstarted(_event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, subject: GraphNode) {
      if (!_event.active) simulation.alphaTarget(0.3).restart();
      subject.fx = subject.x;
      subject.fy = subject.y;
    }

    function dragged(_event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, subject: GraphNode) {
      subject.fx = _event.x;
      subject.fy = _event.y;
    }

    function dragended(_event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, subject: GraphNode) {
      if (!_event.active) simulation.alphaTarget(0);
      subject.fx = null;
      subject.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, width, height, onNodeClick, onNodeHover]);

  return (
    <div className={styles.canvasWrapper}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={styles.canvas}
      />
      {hoveredNode && (
        <div className={styles.tooltip}>
          <div className="flex justify-between items-start mb-2">
            <h4>{hoveredNode.name}</h4>
            <span className={styles.tooltipType}>{hoveredNode.type}</span>
          </div>
          <div className="flex gap-4 mb-3">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Connections: <span className="text-indigo-400">{data.links.filter(l => (typeof l.source === 'object' ? l.source.id : l.source) === hoveredNode.id || (typeof l.target === 'object' ? l.target.id : l.target) === hoveredNode.id).length}</span>
            </div>
          </div>
          {hoveredNode.description && (
            <p className={styles.tooltipDescription}>{hoveredNode.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
