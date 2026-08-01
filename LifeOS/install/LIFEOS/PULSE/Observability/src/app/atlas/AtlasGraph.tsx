"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export interface GNode {
  id: number;
  kind: string;
  canonical_key: string;
  display_name: string;
  status: string;
}
export interface GEdge { kind: string; src: number; dst: number; status: string }

const KIND_COLOR: Record<string, string> = {
  project: "var(--accent-blue)",
  worker: "var(--ok)",
  domain: "var(--ink-2)",
  dns_record: "var(--line-3)",
  target: "var(--warn)",
  system: "var(--err)",
  repo: "#a78bfa",
  service: "#22d3ee",
  machine: "var(--err)",
  d1_database: "#f472b6",
  r2_bucket: "#f472b6",
  kv_namespace: "#f472b6",
  device: "var(--ink-3)",
};
const colorFor = (k: string) => KIND_COLOR[k] ?? "var(--ink-3)";

type SimNode = GNode & d3.SimulationNodeDatum;
type SimLink = d3.SimulationLinkDatum<SimNode> & { kind: string };

/**
 * Live force-directed asset graph — d3-force owns the physics and the SVG;
 * React owns the shell and the filter state. Nodes drag (and the sim re-settles),
 * the canvas zooms and pans, hovering a node isolates its neighborhood.
 */
export function AtlasGraph({
  nodes: rawNodes,
  edges: rawEdges,
  kindFilter,
  onSelect,
}: {
  nodes: GNode[];
  edges: GEdge[];
  kindFilter: Set<string>;
  onSelect: (n: GNode | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const hoverRef = useRef<(id: number | null) => void>(() => {});

  // Only edge-participating nodes of the chosen kinds — isolated dots carry no signal.
  const { nodes, links } = useMemo(() => {
    const allowed = new Set(rawNodes.filter((n) => kindFilter.has(n.kind)).map((n) => n.id));
    const live = rawEdges.filter((e) => e.status === "active" && allowed.has(e.src) && allowed.has(e.dst));
    const deg = new Map<number, number>();
    for (const e of live) {
      deg.set(e.src, (deg.get(e.src) ?? 0) + 1);
      deg.set(e.dst, (deg.get(e.dst) ?? 0) + 1);
    }
    const nodes: SimNode[] = rawNodes.filter((n) => allowed.has(n.id) && (deg.get(n.id) ?? 0) > 0).map((n) => ({ ...n }));
    const present = new Set(nodes.map((n) => n.id));
    const links: SimLink[] = live
      .filter((e) => present.has(e.src) && present.has(e.dst))
      .map((e) => ({ source: e.src, target: e.dst, kind: e.kind }));
    return { nodes, links };
  }, [rawNodes, rawEdges, kindFilter]);

  const degree = useMemo(() => {
    const d = new Map<number, number>();
    for (const l of links) {
      d.set(l.source as number, (d.get(l.source as number) ?? 0) + 1);
      d.set(l.target as number, (d.get(l.target as number) ?? 0) + 1);
    }
    return d;
  }, [links]);

  const adjacency = useMemo(() => {
    const a = new Map<number, Set<number>>();
    for (const l of links) {
      const s = l.source as number, t = l.target as number;
      (a.get(s) ?? a.set(s, new Set()).get(s)!).add(t);
      (a.get(t) ?? a.set(t, new Set()).get(t)!).add(s);
    }
    return a;
  }, [links]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const W = svg.clientWidth || 900;
    const H = 600;
    const sel = d3.select(svg);
    sel.selectAll("*").remove();

    const root = sel.append("g");
    const linkG = root.append("g").attr("stroke", "var(--line-2)").attr("stroke-opacity", 0.45);
    const nodeG = root.append("g");
    const labelG = root.append("g").attr("pointer-events", "none");

    const sim = d3
      .forceSimulation<SimNode>(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id as number).distance(60).strength(0.4))
      .force("charge", d3.forceManyBody().strength(-140))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collide", d3.forceCollide<SimNode>().radius((d) => 6 + Math.sqrt(degree.get(d.id) ?? 1) * 2))
      .force("x", d3.forceX(W / 2).strength(0.03))
      .force("y", d3.forceY(H / 2).strength(0.03));

    const link = linkG.selectAll("line").data(links).join("line").attr("stroke-width", 0.7);

    const node = nodeG
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => 4 + Math.sqrt(degree.get(d.id) ?? 1) * 1.6)
      .attr("fill", (d) => colorFor(d.kind))
      .attr("stroke", "var(--surface-1)")
      .attr("stroke-width", 1)
      .style("cursor", "grab")
      .on("mouseenter", (_e, d) => hoverRef.current(d.id))
      .on("mouseleave", () => hoverRef.current(null))
      .on("click", (_e, d) => onSelect(d))
      .on("dblclick", (_e, d) => { d.fx = null; d.fy = null; sim.alpha(0.3).restart(); }); // release a pinned node

    const label = labelG
      .selectAll<SVGTextElement, SimNode>("text")
      .data(nodes.filter((n) => n.kind === "project" || (degree.get(n.id) ?? 0) >= 8))
      .join("text")
      .text((d) => d.display_name)
      .attr("font-size", 9)
      .attr("fill", "var(--ink-2)")
      .attr("dx", 8)
      .attr("dy", 3);

    node.call(
      d3
        .drag<SVGCircleElement, SimNode>()
        .on("start", (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event) => {
          if (!event.active) sim.alphaTarget(0);
          // Keep fx/fy → the dragged node stays pinned where you dropped it and
          // its neighbors re-settle around it. Double-click a node to release it.
        }),
    );

    sim.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);
      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
      label.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 6])
      .on("zoom", (event) => root.attr("transform", event.transform.toString()));
    sel.call(zoom).on("dblclick.zoom", null);

    // Hover isolation — driven from React state through a stable ref.
    hoverRef.current = (id: number | null) => {
      setHover(id);
      if (id == null) {
        node.attr("opacity", 1);
        link.attr("stroke-opacity", 0.45).attr("stroke", "var(--line-2)");
        label.attr("opacity", 1);
        return;
      }
      const nbrs = adjacency.get(id) ?? new Set<number>();
      node.attr("opacity", (d) => (d.id === id || nbrs.has(d.id) ? 1 : 0.12));
      label.attr("opacity", (d) => (d.id === id || nbrs.has(d.id) ? 1 : 0.08));
      link
        .attr("stroke", (d) => ((d.source as SimNode).id === id || (d.target as SimNode).id === id ? "var(--accent-blue)" : "var(--line-2)"))
        .attr("stroke-opacity", (d) => ((d.source as SimNode).id === id || (d.target as SimNode).id === id ? 0.9 : 0.05));
    };

    return () => {
      sim.stop();
    };
  }, [nodes, links, degree, adjacency, onSelect]);

  return (
    <div className="relative">
      <svg ref={svgRef} width="100%" height={600} style={{ background: "var(--surface-1)", borderRadius: 8, touchAction: "none" }} />
      <div className="absolute left-3 top-3 text-[11px] text-ink-3 pointer-events-none">
        {nodes.length} nodes · {links.length} edges · drag to pull · scroll to zoom{hover != null ? " · hovering" : ""}
      </div>
    </div>
  );
}
