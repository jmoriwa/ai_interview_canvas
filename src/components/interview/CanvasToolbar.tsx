import {
  ArrowRight,
  Circle,
  Diamond,
  Eraser,
  Grid3x3,
  Hand,
  Highlighter,
  Maximize,
  MousePointer2,
  Pen,
  Redo2,
  Square,
  StickyNote,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CanvasTool } from "@/components/canvas/DesignCanvas";
import { STROKE_COLORS } from "@/components/canvas/DesignCanvas";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TOOLS: Array<{ tool: CanvasTool; label: string; icon: typeof Pen; shortcut?: string }> = [
  { tool: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { tool: "pan", label: "Pan", icon: Hand, shortcut: "H" },
  { tool: "connector", label: "Connector", icon: ArrowRight, shortcut: "C" },
  { tool: "pen", label: "Pen", icon: Pen, shortcut: "P" },
  { tool: "highlighter", label: "Highlighter", icon: Highlighter, shortcut: "M" },
  { tool: "eraser", label: "Eraser", icon: Eraser, shortcut: "E" },
  { tool: "text", label: "Text", icon: Type, shortcut: "T" },
  { tool: "note", label: "Sticky note", icon: StickyNote, shortcut: "N" },
  { tool: "rectangle", label: "Rectangle", icon: Square, shortcut: "R" },
  { tool: "ellipse", label: "Ellipse", icon: Circle, shortcut: "O" },
  { tool: "diamond", label: "Diamond", icon: Diamond, shortcut: "D" },
];

interface Props {
  tool: CanvasTool;
  onToolChange: (t: CanvasTool) => void;
  disabled?: boolean | undefined;
  strokeColor: string;
  onStrokeColor: (c: string) => void;
  strokeWidth: number;
  onStrokeWidth: (w: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoom: (delta: number) => void;
  onZoomToFit: () => void;
  zoom: number;
}

export function CanvasToolbar({
  tool,
  onToolChange,
  disabled,
  strokeColor,
  onStrokeColor,
  strokeWidth,
  onStrokeWidth,
  showGrid,
  onToggleGrid,
  onUndo,
  onRedo,
  onZoom,
  onZoomToFit,
  zoom,
}: Props) {
  const drawing = tool === "pen" || tool === "highlighter";
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-2 py-1.5">
      {TOOLS.map(({ tool: t, label, icon: Icon, shortcut }) => (
        <Tooltip key={t}>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={tool === t ? "secondary" : "ghost"}
              className={cn("h-8 w-8", tool === t && "ring-1 ring-primary")}
              onClick={() => onToolChange(t)}
              disabled={disabled && t !== "select" && t !== "pan"}
              aria-label={label}
              aria-pressed={tool === t}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {label}
            {shortcut ? ` (${shortcut})` : ""}
          </TooltipContent>
        </Tooltip>
      ))}

      {drawing ? (
        <>
          <Separator orientation="vertical" className="mx-1 h-6" />
          {STROKE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Stroke colour ${c}`}
              onClick={() => onStrokeColor(c)}
              className={cn(
                "h-5 w-5 rounded-full border",
                strokeColor === c ? "border-primary ring-1 ring-primary" : "border-border",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              type="button"
              aria-label={`Stroke width ${w}`}
              onClick={() => onStrokeWidth(w)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md border",
                strokeWidth === w ? "border-primary bg-secondary" : "border-border",
              )}
            >
              <span className="rounded-full bg-foreground" style={{ height: w, width: w }} />
            </button>
          ))}
        </>
      ) : null}

      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onUndo} aria-label="Undo">
        <Undo2 className="h-4 w-4" aria-hidden />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRedo} aria-label="Redo">
        <Redo2 className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        size="icon"
        variant={showGrid ? "secondary" : "ghost"}
        className="h-8 w-8"
        onClick={onToggleGrid}
        aria-label="Toggle grid"
        aria-pressed={showGrid}
      >
        <Grid3x3 className="h-4 w-4" aria-hidden />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onZoom(-1)} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" aria-hidden />
        </Button>
        <span className="w-11 text-center font-mono text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onZoom(1)} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" aria-hidden />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onZoomToFit} aria-label="Zoom to fit">
          <Maximize className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}