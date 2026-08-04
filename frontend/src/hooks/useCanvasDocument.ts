import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, canvasApi } from "@/lib/backend-client";
import { emptyCanvasDocument, type CanvasDocument } from "@/lib/domain";

export type SaveState = "idle" | "pending" | "saved" | "error";

const MAX_HISTORY = 60;
const SAVE_DEBOUNCE_MS = 100;
const SYNC_INTERVAL_MS = 250;

function mergeCollection<T extends { id: string }>(base: T[], local: T[], remote: T[]) {
  const baseById = new Map(base.map((item) => [item.id, item]));
  const localById = new Map(local.map((item) => [item.id, item]));
  const merged = new Map(remote.map((item) => [item.id, item]));

  for (const item of local) {
    const original = baseById.get(item.id);
    if (!original || JSON.stringify(original) !== JSON.stringify(item)) merged.set(item.id, item);
  }
  for (const item of base) {
    if (!localById.has(item.id)) merged.delete(item.id);
  }
  return [...merged.values()];
}

function mergeConcurrent(
  base: CanvasDocument,
  local: CanvasDocument,
  remote: CanvasDocument,
): CanvasDocument {
  return {
    version: remote.version,
    nodes: mergeCollection(base.nodes, local.nodes, remote.nodes),
    connectors: mergeCollection(base.connectors, local.connectors, remote.connectors),
    strokes: mergeCollection(base.strokes, local.strokes, remote.strokes),
  };
}

/**
 * Owns canvas document state, undo/redo history and autosave.
 *
 * The backend currently exposes versioned REST documents, so this hook polls
 * for remote versions and merges concurrent edits when optimistic saves clash.
 */
export function useCanvasDocument(sessionId: string) {
  const [doc, setDoc] = useState<CanvasDocument>(emptyCanvasDocument);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const past = useRef<CanvasDocument[]>([]);
  const future = useRef<CanvasDocument[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = useRef<CanvasDocument>(emptyCanvasDocument());
  const hasLocalChanges = useRef(false);
  const editRevision = useRef(0);
  const latest = useRef(doc);
  latest.current = doc;

  const load = useCallback(async () => {
    const loaded = await canvasApi.get(sessionId);
    base.current = loaded;
    setDoc(loaded);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (hasLocalChanges.current) return;
      void canvasApi
        .get(sessionId)
        .then((remote) => {
          if (hasLocalChanges.current || remote.version <= latest.current.version) return;
          base.current = remote;
          setDoc(remote);
        })
        .catch(() => undefined);
    }, SYNC_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [sessionId]);

  const scheduleSave = useCallback(() => {
    setSaveState("pending");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const local = latest.current;
      const revision = editRevision.current;
      try {
        const saved = await canvasApi.save(sessionId, local);
        base.current = saved;
        hasLocalChanges.current = editRevision.current !== revision;
        setDoc((current) => ({ ...current, version: saved.version }));
        setSaveState("saved");
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          try {
            const remote = await canvasApi.get(sessionId);
            const retryRevision = editRevision.current;
            const merged = mergeConcurrent(base.current, latest.current, remote);
            const saved = await canvasApi.save(sessionId, merged);
            base.current = saved;
            hasLocalChanges.current = editRevision.current !== retryRevision;
            setDoc((current) =>
              editRevision.current === retryRevision
                ? saved
                : { ...current, version: saved.version },
            );
            setSaveState("saved");
            return;
          } catch {
            // Fall through to the visible error state after one safe retry.
          }
        }
        setSaveState("error");
      }
    }, SAVE_DEBOUNCE_MS);
  }, [sessionId]);

  const apply = useCallback(
    (next: CanvasDocument, options?: { commit?: boolean }) => {
      const commit = options?.commit ?? true;
      // Drag/resize frames use commit=false until pointer-up. They are still
      // local changes and must be protected from an incoming poll.
      hasLocalChanges.current = true;
      if (commit) {
        editRevision.current += 1;
      }
      setDoc((prev) => {
        if (commit) {
          past.current = [...past.current.slice(-MAX_HISTORY), prev];
          future.current = [];
        }
        return next;
      });
      if (commit) scheduleSave();
    },
    [scheduleSave],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(latest.current);
    hasLocalChanges.current = true;
    editRevision.current += 1;
    setDoc(prev);
    scheduleSave();
  }, [scheduleSave]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(latest.current);
    hasLocalChanges.current = true;
    editRevision.current += 1;
    setDoc(next);
    scheduleSave();
  }, [scheduleSave]);

  return {
    doc,
    setDocument: apply,
    loading,
    saveState,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    reload: load,
  };
}
