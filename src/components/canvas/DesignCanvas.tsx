import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComponentIcon } from "@/lib/component-library";
import type {
  CanvasConnector,
  CanvasDocument,
  CanvasNode,
  CanvasStroke,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

export type CanvasTool =
  | "select"
  | "pan"
  | "connector"
  | "pen"
  | "highlighter"
  | "eraser"
  | "text"
  | "note"
  | "rectangle"
  | "ellipse"
  | "diamond";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_NODE_COLOR = "oklch(0.79 0.13 195)";
const STROKE_COLORS = [
  "oklch(0.95 0.01 250)",
  "oklch(0.79 0.13 195)",
  "oklch(0.8 0.14 78)",
  "oklch(0.68 0.18 25)",
];

interface Props {
  document: CanvasDocument;
  onChange: (next: CanvasDocument, options?: { commit?: boolean }) => void;
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  readOnly?: boolean | undefined;
  showGrid?: boolean | undefined;
  snapToGrid?: boolean | undefined;
  strokeColor?: string | undefined;
  strokeWidth?: number | undefined;
  cursors?: RemoteCursor[] | undefined;
  onPointerMoveDoc?: ((x: number, y: number) => void) | undefined;
  viewport: Viewport;
  onViewportChange: (v: Viewport) => void;
  selection: string[];
  onSelectionChange: (ids: string[]) => void;
  className?: string | undefined;
}

export function centerOfNode(n: CanvasNode) {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
}

/** Edge intersection so connectors touch the box border, not the centre. */
function anchorPoint(from: CanvasNode, to: CanvasNode) {
  const c1 = centerOfNode(from);
  const c2 = centerOfNode(to);
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  if (dx === 0 && dy === 0) return c1;
  const hw = from.width / 2 + 6;
  const hh = from.height / 2 + 6;
  const scale = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6));
  return { x: c1.x + dx * scale, y: c1.y + dy * scale };
}

function strokePath(points: number[]) {
  if (points.length < 4) {
    const [x = 0, y = 0] = points;
    return `M ${x} ${y} L ${x + 0.01} ${y}`;
  }
  let d = `M ${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += ` L ${points[i]} ${points[i + 1]}`;
  return d;
}

export function DesignCanvas({
  document: doc,
  onChange,
  tool,
  onToolChange,
  readOnly = false,
  showGrid = true,
  snapToGrid = false,
  strokeColor = STROKE_COLORS[0]!,
  strokeWidth = 3,
  cursors = [],
  onPointerMoveDoc,
  viewport,
  onViewportChange,
  selection,
  onSelectionChange,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<null | { x1: number; y1: number; x2: number; y2: number }>(null);
  const [liveStroke, setLiveStroke] = useState<number[] | null>(null);
  const [ghost, setGhost] = useState<null | { x: number; y: number }>(null);

  const stateRef = useRef({ doc, viewport, tool, selection, readOnly, strokeColor, strokeWidth, snapToGrid });
  stateRef.current = { doc, viewport, tool, selection, readOnly, strokeColor, strokeWidth, snapToGrid };

  const toDoc = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const { viewport: v } = stateRef.current;
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - v.x) / v.zoom,
      y: (clientY - rect.top - v.y) / v.zoom,
    };
  }, []);

  /* ------------------------------ wheel zoom ------------------------------ */
  const wheelRef = useRef((e: WheelEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const v = stateRef.current.viewport;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) < 1) {
      const next = clamp(v.zoom * Math.exp(-dy * 0.0018), MIN_ZOOM, MAX_ZOOM);
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const k = next / v.zoom;
      onViewportChange({ x: px - (px - v.x) * k, y: py - (py - v.y) * k, zoom: next });
    } else {
      onViewportChange({ ...v, x: v.x - e.deltaX, y: v.y - dy });
    }
  });
  wheelRef.current = wheelRef.current;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ------------------------------ mutations ------------------------------- */
  const update = useCallback(
    (fn: (d: CanvasDocument) => CanvasDocument, commit = true) => {
      if (stateRef.current.readOnly) return;
      onChange(fn(stateRef.current.doc), { commit });
    },
    [onChange],
  );

  const addNodeAt = useCallback(
    (x: number, y: number, kind: CanvasNode["kind"], extra: Partial<CanvasNode> = {}) => {
      const id = uid("n");
      const node: CanvasNode = {
        id,
        kind,
        componentType: extra.componentType ?? "generic_service",
        label: extra.label ?? (kind === "text" ? "Text" : kind === "note" ? "Sticky note" : ""),
        x: x - (extra.width ?? 168) / 2,
        y: y - (extra.height ?? 92) / 2,
        width: extra.width ?? 168,
        height: extra.height ?? 92,
        color: extra.color ?? DEFAULT_NODE_COLOR,
        shape: extra.shape,
      };
      update((d) => ({ ...d, nodes: [...d.nodes, node] }));
      onSelectionChange([id]);
      if (kind === "text" || kind === "note") setEditingId(id);
      return id;
    },
    [update, onSelectionChange],
  );

  /** Public drop handler for the component library. */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const raw = e.dataTransfer.getData("application/x-design-component");
    if (!raw) return;
    const { type, label, color } = JSON.parse(raw) as { type: string; label: string; color: string };
    const p = toDoc(e.clientX, e.clientY);
    const snap = (n: number) => (snapToGrid ? Math.round(n / 16) * 16 : n);
    addNodeAt(snap(p.x), snap(p.y), type === "text_note" ? "note" : "component", {
      componentType: type,
      label,
      color,
    });
    setGhost(null);
  };

  /* ------------------------------ interactions ---------------------------- */
  const dragRef = useRef<null | {
    mode: "pan" | "move" | "resize" | "marquee" | "draw";
    startClient: { x: number; y: number };
    startDoc: { x: number; y: number };
    startViewport: Viewport;
    origins: Record<string, { x: number; y: number; width: number; height: number }>;
    nodeId?: string;
  }>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || tool === "pan" || (e.button === 0 && e.altKey)) {
      dragRef.current = {
        mode: "pan",
        startClient: { x: e.clientX, y: e.clientY },
        startDoc: toDoc(e.clientX, e.clientY),
        startViewport: viewport,
        origins: {},
      };
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    const p = toDoc(e.clientX, e.clientY);

    if (tool === "pen" || tool === "highlighter") {
      if (readOnly) return;
      setLiveStroke([p.x, p.y]);
      dragRef.current = {
        mode: "draw",
        startClient: { x: e.clientX, y: e.clientY },
        startDoc: p,
        startViewport: viewport,
        origins: {},
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }
    if (tool === "text" || tool === "note") {
      addNodeAt(p.x, p.y, tool, tool === "note" ? { width: 180, height: 130 } : { width: 200, height: 44 });
      onToolChange("select");
      return;
    }
    if (tool === "rectangle" || tool === "ellipse" || tool === "diamond") {
      addNodeAt(p.x, p.y, "shape", { shape: tool, width: 180, height: 120, label: "" });
      onToolChange("select");
      return;
    }
    // select tool on empty canvas -> marquee
    onSelectionChange([]);
    setConnectFrom(null);
    setMarquee({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    dragRef.current = {
      mode: "marquee",
      startClient: { x: e.clientX, y: e.clientY },
      startDoc: p,
      startViewport: viewport,
      origins: {},
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const beginNodeDrag = (e: React.PointerEvent, node: CanvasNode, mode: "move" | "resize") => {
    if (readOnly || node.locked) return;
    e.stopPropagation();
    const ids = selection.includes(node.id) ? selection : [node.id];
    if (!selection.includes(node.id)) onSelectionChange(e.shiftKey ? [...selection, node.id] : [node.id]);
    const origins: Record<string, { x: number; y: number; width: number; height: number }> = {};
    doc.nodes.filter((n) => ids.includes(n.id)).forEach((n) => {
      origins[n.id] = { x: n.x, y: n.y, width: n.width, height: n.height };
    });
    dragRef.current = {
      mode,
      startClient: { x: e.clientX, y: e.clientY },
      startDoc: toDoc(e.clientX, e.clientY),
      startViewport: viewport,
      origins,
      nodeId: node.id,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toDoc(e.clientX, e.clientY);
    onPointerMoveDoc?.(p.x, p.y);
    const drag = dragRef.current;
    if (!drag) return;
    const snap = (n: number) => (stateRef.current.snapToGrid ? Math.round(n / 16) * 16 : n);

    if (drag.mode === "pan") {
      onViewportChange({
        ...drag.startViewport,
        x: drag.startViewport.x + (e.clientX - drag.startClient.x),
        y: drag.startViewport.y + (e.clientY - drag.startClient.y),
      });
      return;
    }
    if (drag.mode === "draw" && liveStroke) {
      setLiveStroke((prev) => (prev ? [...prev, p.x, p.y] : prev));
      return;
    }
    if (drag.mode === "marquee") {
      setMarquee({ x1: drag.startDoc.x, y1: drag.startDoc.y, x2: p.x, y2: p.y });
      return;
    }
    const dx = p.x - drag.startDoc.x;
    const dy = p.y - drag.startDoc.y;
    if (drag.mode === "move") {
      update(
        (d) => ({
          ...d,
          nodes: d.nodes.map((n) =>
            drag.origins[n.id]
              ? { ...n, x: snap(drag.origins[n.id]!.x + dx), y: snap(drag.origins[n.id]!.y + dy) }
              : n,
          ),
        }),
        false,
      );
      return;
    }
    if (drag.mode === "resize" && drag.nodeId) {
      const origin = drag.origins[drag.nodeId]!;
      update(
        (d) => ({
          ...d,
          nodes: d.nodes.map((n) =>
            n.id === drag.nodeId
              ? {
                  ...n,
                  width: Math.max(72, snap(origin.width + dx)),
                  height: Math.max(44, snap(origin.height + dy)),
                }
              : n,
          ),
        }),
        false,
      );
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.mode === "draw" && liveStroke && liveStroke.length >= 4) {
      const stroke: CanvasStroke = {
        id: uid("s"),
        points: liveStroke,
        color: strokeColor,
        width: tool === "highlighter" ? strokeWidth * 4 : strokeWidth,
        tool: tool === "highlighter" ? "highlighter" : "pen",
      };
      update((d) => ({ ...d, strokes: [...d.strokes, stroke] }));
    }
    if (drag.mode === "draw") setLiveStroke(null);
    if (drag.mode === "marquee" && marquee) {
      const x1 = Math.min(marquee.x1, marquee.x2);
      const x2 = Math.max(marquee.x1, marquee.x2);
      const y1 = Math.min(marquee.y1, marquee.y2);
      const y2 = Math.max(marquee.y1, marquee.y2);
      if (Math.abs(x2 - x1) > 4 || Math.abs(y2 - y1) > 4) {
        onSelectionChange(
          doc.nodes
            .filter((n) => n.x < x2 && n.x + n.width > x1 && n.y < y2 && n.y + n.height > y1)
            .map((n) => n.id),
        );
      }
      setMarquee(null);
    }
    if (drag.mode === "move" || drag.mode === "resize") onChange(stateRef.current.doc, { commit: true });
  };

  const onNodeClick = (node: CanvasNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tool === "connector") {
      if (!connectFrom) {
        setConnectFrom(node.id);
        return;
      }
      if (connectFrom !== node.id) {
        const connector: CanvasConnector = {
          id: uid("c"),
          fromNodeId: connectFrom,
          toNodeId: node.id,
          label: "",
          style: "solid",
          direction: "forward",
          color: "oklch(0.72 0.02 250)",
        };
        update((d) => ({ ...d, connectors: [...d.connectors, connector] }));
        onSelectionChange([connector.id]);
      }
      setConnectFrom(null);
      return;
    }
    if (tool === "eraser") {
      update((d) => ({
        ...d,
        nodes: d.nodes.filter((n) => n.id !== node.id),
        connectors: d.connectors.filter((c) => c.fromNodeId !== node.id && c.toNodeId !== node.id),
      }));
      return;
    }
    onSelectionChange(e.shiftKey ? Array.from(new Set([...selection, node.id])) : [node.id]);
  };

  /* ------------------------------- rendering ------------------------------ */
  const nodeById = useMemo(() => new Map(doc.nodes.map((n) => [n.id, n])), [doc.nodes]);
  const cursorClass =
    tool === "pan"
      ? "cursor-grab"
      : tool === "pen" || tool === "highlighter"
        ? "cursor-crosshair"
        : tool === "eraser"
          ? "cursor-cell"
          : tool === "connector"
            ? "cursor-crosshair"
            : "cursor-default";

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) setGhost({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onDragLeave={() => setGhost(null)}
      onDrop={handleDrop}
      className={cn(
        "relative h-full w-full touch-none overflow-hidden select-none",
        showGrid ? "canvas-grid-bg" : "bg-canvas",
        cursorClass,
        className,
      )}
      style={
        showGrid
          ? {
              backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
              backgroundPosition: `${viewport.x}px ${viewport.y}px`,
            }
          : undefined
      }
      role="application"
      aria-label="Collaborative system design canvas"
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        <svg className="pointer-events-none absolute overflow-visible" width={1} height={1}>
          <defs>
            <marker id="di-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {doc.connectors.map((c) => {
            const from = nodeById.get(c.fromNodeId);
            const to = nodeById.get(c.toNodeId);
            if (!from || !to) return null;
            const a = anchorPoint(from, to);
            const b = anchorPoint(to, from);
            const selected = selection.includes(c.id);
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            return (
              <g key={c.id} style={{ color: c.color }}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={selected ? "var(--color-primary)" : c.color}
                  strokeWidth={selected ? 2.5 : 1.75}
                  strokeDasharray={c.style === "dashed" ? "9 6" : c.style === "dotted" ? "2 5" : undefined}
                  markerEnd={c.direction !== "none" ? "url(#di-arrow)" : undefined}
                  markerStart={c.direction === "both" ? "url(#di-arrow)" : undefined}
                  className="pointer-events-auto cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (tool === "eraser") {
                      update((d) => ({ ...d, connectors: d.connectors.filter((x) => x.id !== c.id) }));
                      return;
                    }
                    onSelectionChange([c.id]);
                  }}
                />
                {c.label ? (
                  <g>
                    <rect
                      x={mid.x - c.label.length * 3.9 - 6}
                      y={mid.y - 11}
                      width={c.label.length * 7.8 + 12}
                      height={20}
                      rx={5}
                      fill="var(--color-card)"
                      stroke="var(--color-border)"
                    />
                    <text
                      x={mid.x}
                      y={mid.y + 3}
                      textAnchor="middle"
                      fontSize="11"
                      fill="var(--color-foreground)"
                      fontFamily="var(--font-mono)"
                    >
                      {c.label}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
          {doc.strokes.map((s) => (
            <path
              key={s.id}
              d={strokePath(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={s.tool === "highlighter" ? 0.32 : 1}
              className="pointer-events-auto"
              onPointerDown={(e) => {
                if (tool !== "eraser") return;
                e.stopPropagation();
                update((d) => ({ ...d, strokes: d.strokes.filter((x) => x.id !== s.id) }));
              }}
            />
          ))}
          {liveStroke ? (
            <path
              d={strokePath(liveStroke)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={tool === "highlighter" ? strokeWidth * 4 : strokeWidth}
              strokeLinecap="round"
              opacity={tool === "highlighter" ? 0.32 : 1}
            />
          ) : null}
          {marquee ? (
            <rect
              x={Math.min(marquee.x1, marquee.x2)}
              y={Math.min(marquee.y1, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x1)}
              height={Math.abs(marquee.y2 - marquee.y1)}
              fill="var(--color-primary)"
              fillOpacity={0.08}
              stroke="var(--color-primary)"
              strokeDasharray="4 4"
            />
          ) : null}
        </svg>

        {doc.nodes.map((node) => {
          const selected = selection.includes(node.id);
          const isConnectSource = connectFrom === node.id;
          return (
            <div
              key={node.id}
              onPointerDown={(e) => {
                if (tool === "select") beginNodeDrag(e, node, "move");
                else e.stopPropagation();
              }}
              onClick={(e) => onNodeClick(node, e)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!readOnly && !node.locked) setEditingId(node.id);
              }}
              className={cn(
                "absolute flex flex-col items-center justify-center gap-1.5 rounded-lg border text-center transition-shadow",
                node.kind === "note"
                  ? "border-accent/40 bg-accent/15 p-3 text-left"
                  : node.kind === "text"
                    ? "border-transparent bg-transparent"
                    : node.kind === "shape"
                      ? "border-2 bg-transparent"
                      : "border-border bg-card px-3 py-2",
                selected && "ring-2 ring-primary",
                isConnectSource && "ring-2 ring-accent",
                tool === "select" && !node.locked ? "cursor-move" : "cursor-pointer",
              )}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                borderColor: node.kind === "shape" ? node.color : undefined,
                borderRadius: node.shape === "ellipse" ? "50%" : undefined,
                transform: node.shape === "diamond" ? "rotate(45deg)" : undefined,
                boxShadow: selected ? "0 8px 24px -12px oklch(0 0 0 / 60%)" : undefined,
              }}
            >
              {node.kind === "component" ? (
                <ComponentIcon type={node.componentType} size={20} style={{ color: node.color }} />
              ) : null}
              {editingId === node.id ? (
                <input
                  autoFocus
                  defaultValue={node.label}
                  onBlur={(e) => {
                    const label = e.target.value;
                    update((d) => ({
                      ...d,
                      nodes: d.nodes.map((n) => (n.id === node.id ? { ...n, label } : n)),
                    }));
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full rounded-sm bg-background/70 px-1 text-center text-sm text-foreground outline-none ring-1 ring-primary"
                />
              ) : (
                <span
                  className={cn(
                    "px-1 leading-tight break-words",
                    node.kind === "text" ? "text-base font-medium" : "text-[13px]",
                    node.kind === "note" ? "self-start text-left text-[13px]" : "",
                  )}
                  style={{ transform: node.shape === "diamond" ? "rotate(-45deg)" : undefined }}
                >
                  {node.label}
                </span>
              )}
              {node.locked ? (
                <span className="absolute top-1 right-1 text-[10px] text-muted-foreground">locked</span>
              ) : null}
              {selected && !readOnly && !node.locked ? (
                <span
                  onPointerDown={(e) => beginNodeDrag(e, node, "resize")}
                  className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-background bg-primary"
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}

        {cursors.map((c) => (
          <div
            key={c.id}
            className="pointer-events-none absolute z-20 flex items-start gap-1"
            style={{ left: c.x, top: c.y }}
          >
            <svg width="14" height="18" viewBox="0 0 14 18" style={{ color: c.color }}>
              <path d="M0 0 L14 11 L7 11 L9 18 Z" fill="currentColor" />
            </svg>
            <span
              className="rounded px-1.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: c.color, color: "oklch(0.2 0.03 240)" }}
            >
              {c.name}
            </span>
          </div>
        ))}
      </div>

      {ghost ? (
        <div
          className="pointer-events-none absolute h-[92px] w-[168px] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-dashed border-primary/60 bg-primary/10"
          style={{ left: ghost.x, top: ghost.y }}
        />
      ) : null}

      {readOnly ? (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted-foreground">
          Canvas is read-only
        </div>
      ) : null}
      {tool === "connector" ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted-foreground">
          {connectFrom ? "Now click the target component" : "Click the source component"}
        </div>
      ) : null}
    </div>
  );
}

export { STROKE_COLORS, MIN_ZOOM, MAX_ZOOM, clamp };