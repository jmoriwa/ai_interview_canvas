import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  COMPONENT_CATEGORIES,
  searchComponents,
  type ComponentCategory,
  type ComponentDefinition,
} from "@/lib/component-library";
import { cn } from "@/lib/utils";

interface Props {
  disabled?: boolean | undefined;
  recent: string[];
  onUse: (def: ComponentDefinition) => void;
}

export function ComponentLibraryPanel({ disabled, recent, onUse }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ComponentCategory | "all">("all");

  const results = useMemo(() => searchComponents(query, category), [query, category]);
  const recentDefs = useMemo(
    () =>
      recent
        .map((type) => searchComponents("", "all").find((c) => c.type === type))
        .filter((c): c is ComponentDefinition => Boolean(c))
        .slice(0, 6),
    [recent],
  );

  const grouped = useMemo(() => {
    const map = new Map<ComponentCategory, ComponentDefinition[]>();
    results.forEach((r) => {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    });
    return map;
  }, [results]);

  return (
    <div className="flex h-full flex-col gap-3 border-r border-border bg-sidebar">
      <div className="space-y-2 px-3 pt-3">
        <h2 className="font-display text-sm font-semibold tracking-wide uppercase">Components</h2>
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. queue"
            aria-label="Search components"
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", ...COMPONENT_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                category === c
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {c === "all" ? "All" : c.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 pb-3">
        {recentDefs.length > 0 && !query ? (
          <Section title="Recently used">
            {recentDefs.map((def) => (
              <LibraryItem key={`recent-${def.type}`} def={def} disabled={disabled} onUse={onUse} />
            ))}
          </Section>
        ) : null}
        {[...grouped.entries()].map(([cat, defs]) => (
          <Section key={cat} title={cat}>
            {defs.map((def) => (
              <LibraryItem key={def.type} def={def} disabled={disabled} onUse={onUse} />
            ))}
          </Section>
        ))}
        {results.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">No components match “{query}”.</p>
        ) : null}
      </ScrollArea>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

function LibraryItem({
  def,
  disabled,
  onUse,
}: {
  def: ComponentDefinition;
  disabled?: boolean | undefined;
  onUse: (def: ComponentDefinition) => void;
}) {
  const Icon = def.icon;
  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/x-design-component",
          JSON.stringify({ type: def.type, label: def.label, color: def.color }),
        );
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => !disabled && onUse(def)}
      disabled={disabled}
      title={`${def.label} — drag onto the canvas or click to add`}
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left text-xs transition-colors",
        disabled ? "opacity-50" : "hover:border-primary/60 hover:bg-secondary cursor-grab active:cursor-grabbing",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: def.color }} aria-hidden />
      <span className="truncate">{def.label}</span>
    </button>
  );
}