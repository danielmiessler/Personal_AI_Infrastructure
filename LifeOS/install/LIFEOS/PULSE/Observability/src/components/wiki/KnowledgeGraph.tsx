"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

interface GraphNode {
  id: string;
  title: string;
  category: string;
  quality?: number;
  backlinkCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (slug: string, category: string) => void;
  hiddenCategories?: Set<string>;
  searchQuery?: string;
  // When provided (memory-graph mode), color by this map (category=community id)
  // and lay out cluster centers dynamically on a ring instead of the 5 fixed domains.
  colorMap?: Record<string, string>;
}

const CATEGORY_COLORS: Record<string, string> = {
  "system-doc": "#22d3ee",
  person: "#38bdf8",
  company: "#fbbf24",
  idea: "#a78bfa",
  blog: "#f472b6",
  book: "#f87171",
};

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  r: number;
}

interface SimEdge {
  source: SimNode | string;
  target: SimNode | string;
}

interface TransformAnim {
  from: { x: number; y: number; k: number };
  to: { x: number; y: number; k: number };
  start: number;
  dur: number;
}

export default function KnowledgeGraph({ nodes, edges, onNodeClick, hiddenCategories, searchQuery, colorMap }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const colorMapRef = useRef(colorMap);
  colorMapRef.current = colorMap;

  const stateRef = useRef<{
    simNodes: SimNode[];
    nodeById: Map<string, SimNode>;
    simEdges: SimEdge[];
    neighbors: Map<string, Set<string>>;
    transform: { x: number; y: number; k: number };
    transformAnim: TransformAnim | null;
    focused: string | null;
    hovered: string | null;
    dim: number; // animated 0..1 — how far the non-highlighted graph has faded
    dragNode: SimNode | null;
    needsRender: boolean;
    width: number;
    height: number;
  } | null>(null);

  const markDirty = useCallback(() => {
    if (stateRef.current) stateRef.current.needsRender = true;
  }, []);

  const render = useCallback(() => {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { transform, simNodes, simEdges, neighbors, focused, hovered, dim, width, height } = state;
    const cmap = colorMapRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // The active node drives highlighting: an explicit focus wins, otherwise hover.
    const active = focused ?? hovered;
    const activeNeighbors = active ? neighbors.get(active) ?? new Set<string>() : null;
    const dimAlpha = 1 - dim * 0.94; // dimmed elements fade toward 0.06

    // Labels fade in with zoom; highlight state overrides the threshold.
    const zoomLabelAlpha = Math.max(0, Math.min(1, (transform.k - 1.6) / 0.8));

    // Edges
    for (const e of simEdges) {
      const s = e.source as SimNode;
      const t = e.target as SimNode;
      const connects = active !== null && (s.id === active || t.id === active);
      if (active && !connects) {
        ctx.globalAlpha = 0.25 * dimAlpha;
        ctx.strokeStyle = "rgba(51,65,85,1)";
        ctx.lineWidth = 0.5 / transform.k;
      } else if (connects) {
        ctx.globalAlpha = 0.25 + dim * 0.35;
        ctx.strokeStyle = "rgba(148,163,184,1)";
        ctx.lineWidth = (0.5 + dim) / transform.k;
      } else {
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = "rgba(51,65,85,1)";
        ctx.lineWidth = 0.5 / transform.k;
      }
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Nodes
    for (const n of simNodes) {
      const isActive = n.id === active;
      const isNeighbor = activeNeighbors?.has(n.id) ?? false;
      const dimmed = active !== null && !isActive && !isNeighbor;
      const color = cmap?.[n.category] || CATEGORY_COLORS[n.category] || "#64748b";

      ctx.globalAlpha = dimmed ? dimAlpha : 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, isActive ? n.r * (1 + dim * 0.35) : n.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = "rgba(255,255,255," + (0.4 + dim * 0.6) + ")";
        ctx.lineWidth = 1.5 / transform.k;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Labels
    if (zoomLabelAlpha > 0 || active) {
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const fontSize = Math.max(3, 10 / transform.k);
      ctx.font = `${fontSize}px 'concourse-t3', sans-serif`;

      for (const n of simNodes) {
        const isActive = n.id === active;
        const isNeighbor = activeNeighbors?.has(n.id) ?? false;

        let alpha = zoomLabelAlpha;
        if (active) {
          if (isActive) alpha = Math.max(alpha, dim);
          else if (isNeighbor) alpha = Math.max(alpha * dimAlpha, dim * 0.8);
          else alpha = alpha * dimAlpha;
        }
        if (alpha <= 0.02) continue;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = isActive ? "#f1f5f9" : isNeighbor ? "#94a3b8" : "#64748b";
        const label = n.title.length > 25 ? n.title.slice(0, 22) + "..." : n.title;
        ctx.fillText(label, n.x, n.y - n.r - 2);
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, []);

  // Build (or rebuild) the live simulation
  const draw = useCallback(() => {
    if (!canvasRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    simulationRef.current?.stop();

    // Filter nodes
    const visibleNodes = hiddenCategories?.size
      ? nodes.filter((n) => !hiddenCategories.has(n.category))
      : nodes;
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));

    // Build adjacency
    const neighbors = new Map<string, Set<string>>();
    for (const e of visibleEdges) {
      if (!neighbors.has(e.source)) neighbors.set(e.source, new Set());
      if (!neighbors.has(e.target)) neighbors.set(e.target, new Set());
      neighbors.get(e.source)!.add(e.target);
      neighbors.get(e.target)!.add(e.source);
    }

    // Category cluster centers. Default: 5 fixed domain centers (knowledge-graph mode).
    // colorMap mode (memory graph): lay distinct categories out on a ring so each
    // discovered community gets its own gravitational center.
    let cats: Record<string, { x: number; y: number }>;
    if (colorMap) {
      cats = {};
      const keys = Array.from(new Set(visibleNodes.map((n) => n.category)));
      const R = Math.min(width, height) * 0.38;
      keys.forEach((k, i) => {
        const a = (i / Math.max(keys.length, 1)) * Math.PI * 2;
        cats[k] = { x: width / 2 + Math.cos(a) * R, y: height / 2 + Math.sin(a) * R };
      });
    } else {
      cats = {
        "system-doc": { x: width * 0.25, y: height * 0.3 },
        person: { x: width * 0.75, y: height * 0.3 },
        company: { x: width * 0.25, y: height * 0.7 },
        idea: { x: width * 0.75, y: height * 0.7 },
        book: { x: width * 0.5, y: height * 0.5 },
      };
    }

    // Build simulation nodes with initial positions near their cluster center
    const simNodes: SimNode[] = visibleNodes.map((n) => {
      const c = cats[n.category] || { x: width / 2, y: height / 2 };
      return {
        ...n,
        x: c.x + (Math.random() - 0.5) * width * 0.3,
        y: c.y + (Math.random() - 0.5) * height * 0.3,
        r: Math.max(3, Math.sqrt(n.backlinkCount || 1) * 2.5 + 2),
      };
    });
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));
    const simEdges: SimEdge[] = visibleEdges
      .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
      .map((e) => ({ source: e.source, target: e.target }));

    const edgeRatio = simEdges.length / Math.max(simNodes.length, 1);
    const isSparse = edgeRatio < 0.1;

    const simulation = d3
      .forceSimulation(simNodes as any)
      .force("link", d3.forceLink(simEdges as any).id((d: any) => d.id).distance(isSparse ? 15 : 50))
      .force("charge", d3.forceManyBody().strength(isSparse ? -5 : -80))
      .force("x", d3.forceX((d: any) => (cats[d.category]?.x ?? width / 2)).strength(0.15))
      .force("y", d3.forceY((d: any) => (cats[d.category]?.y ?? height / 2)).strength(0.15))
      .force("collision", d3.forceCollide().radius((d: any) => d.r + 1))
      .velocityDecay(0.4)
      .alphaDecay(0.02)
      .on("tick", () => {
        // Soft viewport containment — without it the dense communities push
        // themselves off-frame and the initial view opens on empty space.
        const pad = 20;
        for (const n of simNodes) {
          n.x = Math.max(pad, Math.min(width - pad, n.x));
          n.y = Math.max(pad, Math.min(height - pad, n.y));
        }
        markDirty();
      });

    // A few warmup ticks so the first painted frame is clustered, not exploded —
    // the visible part of the settle still plays out live.
    for (let i = 0; i < 15; i++) simulation.tick();

    simulationRef.current = simulation;
    stateRef.current = {
      simNodes,
      nodeById,
      simEdges,
      neighbors,
      transform: stateRef.current?.transform ?? { x: 0, y: 0, k: 1 },
      transformAnim: null,
      focused: null,
      hovered: null,
      dim: 0,
      dragNode: null,
      needsRender: true,
      width,
      height,
    };
  }, [nodes, edges, hiddenCategories, colorMap, markDirty]);

  // Animation / render loop — paints only when something changed or is animating
  useEffect(() => {
    let raf = 0;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const state = stateRef.current;
      if (!state) return;

      // Animate the highlight fade
      const dimTarget = state.focused || state.hovered ? 1 : 0;
      if (Math.abs(state.dim - dimTarget) > 0.005) {
        state.dim += (dimTarget - state.dim) * 0.18;
        state.needsRender = true;
      } else if (state.dim !== dimTarget) {
        state.dim = dimTarget;
        state.needsRender = true;
      }

      // Animate camera moves (focus zoom)
      if (state.transformAnim) {
        const a = state.transformAnim;
        const t = Math.min(1, (performance.now() - a.start) / a.dur);
        const e = easeOut(t);
        state.transform = {
          x: a.from.x + (a.to.x - a.from.x) * e,
          y: a.from.y + (a.to.y - a.from.y) * e,
          k: a.from.k + (a.to.k - a.from.k) * e,
        };
        if (t >= 1) state.transformAnim = null;
        state.needsRender = true;
      }

      if (state.needsRender) {
        state.needsRender = false;
        render();
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [render]);

  // Camera helper — animate toward centering a node
  const animateTo = useCallback((to: { x: number; y: number; k: number }, dur = 450) => {
    const state = stateRef.current;
    if (!state) return;
    state.transformAnim = { from: { ...state.transform }, to, start: performance.now(), dur };
  }, []);

  // Search: auto-focus first match (no physics rebuild on keystrokes)
  useEffect(() => {
    const state = stateRef.current;
    if (!state || !searchQuery || searchQuery.length < 2) return;
    const q = searchQuery.toLowerCase();
    for (const n of state.simNodes) {
      if (n.title.toLowerCase().includes(q)) {
        state.focused = n.id;
        animateTo({ x: state.width / 2 - n.x * 3, y: state.height / 2 - n.y * 3, k: 3 });
        break;
      }
    }
  }, [searchQuery, animateTo]);

  // Mouse interaction
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas: HTMLCanvasElement = canvasRef.current;

    let isPanning = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;

    function toWorld(mx: number, my: number) {
      const t = stateRef.current!.transform;
      return { x: (mx - t.x) / t.k, y: (my - t.y) / t.k };
    }

    function hitTest(mx: number, my: number): SimNode | null {
      const state = stateRef.current;
      if (!state) return null;
      const w = toWorld(mx, my);
      let closest: SimNode | null = null;
      let closestDist = Infinity;
      for (const n of state.simNodes) {
        const dx = n.x - w.x;
        const dy = n.y - w.y;
        const dist = dx * dx + dy * dy;
        const hitR = Math.max(n.r + 3, 8 / state.transform.k);
        if (dist < hitR * hitR && dist < closestDist) {
          closest = n;
          closestDist = dist;
        }
      }
      return closest;
    }

    // Tooltip element
    const tooltipEl = document.createElement("div");
    tooltipEl.className = "graph-tooltip";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      pointerEvents: "none",
      background: "rgba(2, 6, 23, 0.95)",
      border: "1px solid rgba(51, 65, 85, 0.5)",
      borderRadius: "8px",
      padding: "8px 12px",
      opacity: "0",
      zIndex: "100",
      backdropFilter: "blur(8px)",
      fontFamily: "'concourse-t3', sans-serif",
      transition: "opacity 0.15s",
    });
    canvas.parentElement?.appendChild(tooltipEl);

    function showTooltip(n: SimNode, mx: number, my: number) {
      const state = stateRef.current;
      if (!state) return;
      const color = colorMapRef.current?.[n.category] || CATEGORY_COLORS[n.category] || "#94a3b8";
      tooltipEl.innerHTML =
        `<div style="font-family: 'advocate-c14', sans-serif; font-size: 10px; letter-spacing: 0.05em; color: ${color}">${n.category.replace("-", " ").toUpperCase()}</div>` +
        `<div style="font-size: 12px; color: #f1f5f9; margin-top: 2px">${n.title}</div>` +
        (n.backlinkCount > 0 ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px">${n.backlinkCount} backlinks</div>` : "") +
        `<div style="font-size: 9px; color: #475569; margin-top: 3px">${state.focused === n.id ? "click again to open" : "click to focus · drag to move"}</div>`;
      tooltipEl.style.opacity = "1";
      tooltipEl.style.left = mx + 12 + "px";
      tooltipEl.style.top = my - 12 + "px";
    }

    function hideTooltip() {
      tooltipEl.style.opacity = "0";
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const state = stateRef.current;
      if (!state) return;
      state.transformAnim = null;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newK = Math.max(0.3, Math.min(8, state.transform.k * factor));
      state.transform.x = mx - (mx - state.transform.x) * (newK / state.transform.k);
      state.transform.y = my - (my - state.transform.y) * (newK / state.transform.k);
      state.transform.k = newK;
      state.needsRender = true;
    }

    function handleMouseDown(e: MouseEvent) {
      const state = stateRef.current;
      if (!state) return;
      moved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      const rect = canvas.getBoundingClientRect();
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);

      if (hit) {
        // Grab the node: pin it to the pointer and reheat the physics so the
        // rest of the graph springs around it (the Obsidian drag feel).
        state.dragNode = hit;
        hit.fx = hit.x;
        hit.fy = hit.y;
        simulationRef.current?.alphaTarget(0.3).restart();
        canvas.style.cursor = "grabbing";
      } else {
        isPanning = true;
        canvas.style.cursor = "grabbing";
      }
    }

    function handleMouseMove(e: MouseEvent) {
      const state = stateRef.current;
      if (!state) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) > 3) moved = true;

      if (state.dragNode) {
        const w = toWorld(mx, my);
        state.dragNode.fx = w.x;
        state.dragNode.fy = w.y;
        hideTooltip();
        return;
      }

      if (isPanning) {
        state.transformAnim = null;
        state.transform.x += e.clientX - lastX;
        state.transform.y += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        state.needsRender = true;
        hideTooltip();
        return;
      }
      lastX = e.clientX;
      lastY = e.clientY;

      const hit = hitTest(mx, my);
      canvas.style.cursor = hit ? "pointer" : "grab";
      const newHover = hit?.id ?? null;
      if (newHover !== state.hovered) {
        state.hovered = newHover;
        state.needsRender = true;
      }
      if (hit) showTooltip(hit, mx, my);
      else hideTooltip();
    }

    function handleMouseUp() {
      const state = stateRef.current;
      if (!state) return;
      if (state.dragNode) {
        state.dragNode.fx = null;
        state.dragNode.fy = null;
        state.dragNode = null;
        simulationRef.current?.alphaTarget(0);
      }
      isPanning = false;
      canvas.style.cursor = "grab";
    }

    function handleClick(e: MouseEvent) {
      const state = stateRef.current;
      if (!state || moved) return; // a drag, not a click
      const rect = canvas.getBoundingClientRect();
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);

      if (hit) {
        if (state.focused === hit.id) {
          // Second click — navigate
          if (onNodeClick) onNodeClick(hit.id, hit.category);
        } else {
          state.focused = hit.id;
          const targetK = 3;
          animateTo({
            x: state.width / 2 - hit.x * targetK,
            y: state.height / 2 - hit.y * targetK,
            k: targetK,
          });
        }
        state.needsRender = true;
      } else if (state.focused) {
        state.focused = null;
        animateTo({ x: 0, y: 0, k: 1 });
      }
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
      canvas.removeEventListener("click", handleClick);
      tooltipEl.remove();
    };
  }, [onNodeClick, animateTo]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      simulationRef.current?.stop();
    };
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-ground">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
