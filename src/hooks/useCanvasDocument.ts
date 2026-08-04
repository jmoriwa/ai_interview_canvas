import { useCallback, useEffect, useRef, useState } from "react";
import { canvasApi, openSessionChannel } from "@/lib/mock-backend";
import { emptyCanvasDocument, type CanvasDocument } from "@/lib/domain";

export type SaveState = "idle" | "pending" | "saved" | "error";

const MAX_HISTORY = 60;

/**
 * Owns canvas document state, undo/redo history and autosave.
 *
 * Autosave currently calls the mock backend. When the real collaboration
 * gateway exists, `commit` becomes a `document.update` message and the
 * channel subscription becomes the socket's `document.update` handler.
 */
export function useCanvasDocument(sessionId: string) {
  const [doc, setDoc] = useState<CanvasDocument>(emptyCanvasDocument);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const past = useRef<CanvasDocument[]>([]);
  const future = useRef<CanvasDocument[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(doc);
  latest.current = doc;

  const load = useCallback(async () => {
    const loaded = await canvasApi.get(sessionId);
    setDoc(loaded);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      openSessionChannel(sessionId, (type) => {
        if (type === "document.update") void load();
      }),
    [sessionId, load],
  );

  const scheduleSave = useCallback(() => {
    setSaveState("pending");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const saved = await canvasApi.save(sessionId, latest.current);
        setDoc((current) => ({ ...current, version: saved.version }));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 700);
  }, [sessionId]);

  const apply = useCallback(
    (next: CanvasDocument, options?: { commit?: boolean }) => {
      const commit = options?.commit ?? true;
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
    setDoc(prev);
    scheduleSave();
  }, [scheduleSave]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(latest.current);
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