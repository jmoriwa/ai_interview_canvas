/**
 * MOCK BACKEND — replace with real API calls later.
 *
 * Everything here simulates the HTTP + WebSocket surface described in the spec
 * (sections 15 and 16). State lives in localStorage so refreshes and multiple
 * browser tabs behave like a persisted, collaborative server.
 *
 * Swap points when the real backend lands:
 *   - `request()`  -> fetch("/api/...")
 *   - `openSessionChannel()` -> WebSocket connection
 */

import {
  emptyCanvasDocument,
  PRESENCE_COLORS,
  type CanvasDocument,
  type CanvasPermission,
  type Evaluation,
  type InterviewSession,
  type InterviewerNote,
  type ParticipantRole,
  type SessionParticipant,
  type SessionStatus,
  type User,
} from "./domain";
import { TEMPLATES } from "./templates";

const LATENCY = 220;
const STORE_KEY = "designinterview.mock.v1";
const SESSION_KEY = "designinterview.auth.v1";

interface Store {
  users: User[];
  sessions: InterviewSession[];
  participants: SessionParticipant[];
  documents: Record<string, CanvasDocument>;
  notes: Record<string, InterviewerNote>;
  evaluations: Record<string, Evaluation>;
}

const now = () => new Date().toISOString();
const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

const seedUser: User = {
  id: "user_demo",
  email: "demo@designinterview.dev",
  displayName: "Dana Reeves",
};

function seed(): Store {
  const created = new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString();
  const template = TEMPLATES.find((t) => t.id === "url_shortener")!;
  const past: InterviewSession = {
    id: "ses_demo_completed",
    ownerUserId: seedUser.id,
    title: "Senior Backend — URL Shortener",
    prompt: template.prompt,
    candidateReference: "Priya Nandakumar",
    status: "completed",
    durationSeconds: 45 * 60,
    timerStartedAt: null,
    timerAccumulatedSeconds: 42 * 60,
    candidateEditingEnabled: true,
    observerEditingEnabled: false,
    canvasPermission: "candidate_and_interviewers",
    templateId: template.id,
    invitationToken: "demo-token-completed",
    startedAt: created,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    createdAt: created,
    updatedAt: created,
  };
  return {
    users: [seedUser],
    sessions: [past],
    participants: [
      {
        id: "part_demo_1",
        sessionId: past.id,
        displayName: seedUser.displayName,
        role: "interviewer",
        presenceColor: PRESENCE_COLORS[0]!,
        connected: false,
        joinedAt: created,
        lastSeenAt: created,
      },
      {
        id: "part_demo_2",
        sessionId: past.id,
        displayName: "Priya Nandakumar",
        role: "candidate",
        presenceColor: PRESENCE_COLORS[1]!,
        connected: false,
        joinedAt: created,
        lastSeenAt: created,
      },
    ],
    documents: { [past.id]: template.starterDocument() },
    notes: {
      [past.id]: {
        sessionId: past.id,
        content:
          "Strong on requirements clarification. Needed a nudge toward cache invalidation.\nAsked good questions about read/write ratio.",
        updatedAt: created,
      },
    },
    evaluations: {
      [past.id]: {
        sessionId: past.id,
        ratings: {
          "Requirements clarification": 4,
          "High-level architecture": 4,
          "Data modeling": 3,
          Scalability: 4,
          Communication: 5,
        },
        comments: { "Data modeling": "Base62 encoding discussed, sharding left vague." },
        overallRecommendation: "hire",
        submittedAt: created,
        updatedAt: created,
      },
    },
  };
}

function read(): Store {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) {
      const fresh = seed();
      window.localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return seed();
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function mutate<T>(fn: (store: Store) => T): T {
  const store = read();
  const result = fn(store);
  write(store);
  return result;
}

/** Simulated network hop. Replace with fetch(). */
async function request<T>(fn: () => T): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCY));
  return fn();
}

class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/* ---------------------------------- auth ---------------------------------- */

export const auth = {
  currentUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },
  /** POST /api/auth/login — mocked, accepts any password. */
  login: (email: string) =>
    request(() =>
      mutate((store) => {
        const normalized = email.trim().toLowerCase();
        let user = store.users.find((u) => u.email === normalized);
        if (!user) {
          user = {
            id: uid("user"),
            email: normalized,
            displayName: normalized.split("@")[0]!.replace(/[._]/g, " "),
          };
          store.users.push(user);
        }
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }),
    ),
  /** POST /api/auth/logout */
  logout: () =>
    request(() => {
      window.localStorage.removeItem(SESSION_KEY);
    }),
};

/* --------------------------------- sessions -------------------------------- */

export interface CreateSessionInput {
  title: string;
  prompt: InterviewSession["prompt"];
  candidateReference: string;
  durationSeconds: number | null;
  candidateEditingEnabled: boolean;
  observerEditingEnabled: boolean;
  expiresInHours: number;
  templateId: string;
}

export const sessionsApi = {
  /** GET /api/sessions */
  list: () =>
    request(() => {
      const user = auth.currentUser();
      const store = read();
      return store.sessions
        .filter((s) => !user || s.ownerUserId === user.id || s.ownerUserId === seedUser.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),

  /** GET /api/sessions/{id} */
  get: (id: string) =>
    request(() => {
      const session = read().sessions.find((s) => s.id === id);
      if (!session) throw new ApiError("Session not found", 404);
      return session;
    }),

  /** POST /api/invitations/{token}/join — resolves a session from a guest token. */
  getByToken: (token: string) =>
    request(() => {
      const session = read().sessions.find((s) => s.invitationToken === token);
      if (!session) throw new ApiError("This invitation link is not valid.", 404);
      if (new Date(session.expiresAt).getTime() < Date.now())
        throw new ApiError("This invitation link has expired.", 410);
      if (session.status === "cancelled" || session.status === "expired")
        throw new ApiError("This interview is no longer available.", 410);
      return session;
    }),

  /** POST /api/sessions */
  create: (input: CreateSessionInput) =>
    request(() =>
      mutate((store) => {
        const user = auth.currentUser() ?? seedUser;
        const template = TEMPLATES.find((t) => t.id === input.templateId);
        const session: InterviewSession = {
          id: uid("ses"),
          ownerUserId: user.id,
          title: input.title,
          prompt: input.prompt,
          candidateReference: input.candidateReference,
          status: "waiting",
          durationSeconds: input.durationSeconds,
          timerStartedAt: null,
          timerAccumulatedSeconds: 0,
          candidateEditingEnabled: input.candidateEditingEnabled,
          observerEditingEnabled: input.observerEditingEnabled,
          canvasPermission: input.candidateEditingEnabled
            ? "candidate_and_interviewers"
            : "interviewers_only",
          templateId: input.templateId,
          invitationToken: uid("inv").replace("inv_", ""),
          startedAt: null,
          completedAt: null,
          expiresAt: new Date(Date.now() + input.expiresInHours * 3600_000).toISOString(),
          createdAt: now(),
          updatedAt: now(),
        };
        store.sessions.unshift(session);
        store.documents[session.id] = template
          ? template.starterDocument()
          : emptyCanvasDocument();
        store.participants.push({
          id: uid("part"),
          sessionId: session.id,
          displayName: user.displayName,
          role: "interviewer",
          presenceColor: PRESENCE_COLORS[0]!,
          connected: false,
          joinedAt: now(),
          lastSeenAt: now(),
        });
        return session;
      }),
    ),

  /** PATCH /api/sessions/{id} */
  update: (id: string, patch: Partial<InterviewSession>) =>
    request(() =>
      mutate((store) => {
        const session = store.sessions.find((s) => s.id === id);
        if (!session) throw new ApiError("Session not found", 404);
        Object.assign(session, patch, { updatedAt: now() });
        broadcast(id, "session.state");
        return session;
      }),
    ),

  /** POST /api/sessions/{id}/{start|pause|complete|cancel} */
  transition: (id: string, action: "start" | "pause" | "resume" | "complete" | "cancel") =>
    request(() =>
      mutate((store) => {
        const session = store.sessions.find((s) => s.id === id);
        if (!session) throw new ApiError("Session not found", 404);
        const status: Record<typeof action, SessionStatus> = {
          start: "active",
          resume: "active",
          pause: "paused",
          complete: "completed",
          cancel: "cancelled",
        };
        session.status = status[action];
        if (action === "start" && !session.startedAt) session.startedAt = now();
        if (action === "complete") {
          session.completedAt = now();
          if (session.timerStartedAt) {
            session.timerAccumulatedSeconds += Math.floor(
              (Date.now() - new Date(session.timerStartedAt).getTime()) / 1000,
            );
            session.timerStartedAt = null;
          }
        }
        session.updatedAt = now();
        broadcast(id, "session.state");
        return session;
      }),
    ),

  /** timer.command over the realtime channel; server-authoritative clock. */
  timer: (id: string, command: "start" | "pause" | "reset" | "add_time", seconds = 300) =>
    request(() =>
      mutate((store) => {
        const session = store.sessions.find((s) => s.id === id);
        if (!session) throw new ApiError("Session not found", 404);
        if (command === "start" && !session.timerStartedAt) {
          session.timerStartedAt = now();
          if (session.status === "waiting" || session.status === "paused") {
            session.status = "active";
            session.startedAt ??= now();
          }
        }
        if (command === "pause" && session.timerStartedAt) {
          session.timerAccumulatedSeconds += Math.floor(
            (Date.now() - new Date(session.timerStartedAt).getTime()) / 1000,
          );
          session.timerStartedAt = null;
        }
        if (command === "reset") {
          session.timerStartedAt = null;
          session.timerAccumulatedSeconds = 0;
        }
        if (command === "add_time") {
          session.durationSeconds = (session.durationSeconds ?? 0) + seconds;
        }
        session.updatedAt = now();
        broadcast(id, "timer.updated");
        return session;
      }),
    ),

  setPermission: (id: string, permission: CanvasPermission) =>
    sessionsApi.update(id, {
      canvasPermission: permission,
      candidateEditingEnabled:
        permission === "everyone" || permission === "candidate_and_interviewers",
      observerEditingEnabled: permission === "everyone",
    }),

  revealFollowUp: (id: string) =>
    request(() =>
      mutate((store) => {
        const session = store.sessions.find((s) => s.id === id);
        if (!session) throw new ApiError("Session not found", 404);
        session.prompt.revealedFollowUps = Math.min(
          session.prompt.followUps.length,
          session.prompt.revealedFollowUps + 1,
        );
        broadcast(id, "session.state");
        return session;
      }),
    ),
};

/* ------------------------------- participants ------------------------------ */

export const participantsApi = {
  /** GET /api/sessions/{id}/participants */
  list: (sessionId: string) =>
    request(() => read().participants.filter((p) => p.sessionId === sessionId)),

  /** POST /api/invitations/{token}/join */
  join: (sessionId: string, displayName: string, role: ParticipantRole) =>
    request(() =>
      mutate((store) => {
        const existing = store.participants.filter((p) => p.sessionId === sessionId);
        const participant: SessionParticipant = {
          id: uid("part"),
          sessionId,
          displayName,
          role,
          presenceColor: PRESENCE_COLORS[existing.length % PRESENCE_COLORS.length]!,
          connected: true,
          joinedAt: now(),
          lastSeenAt: now(),
        };
        store.participants.push(participant);
        const session = store.sessions.find((s) => s.id === sessionId);
        if (session && session.status === "draft") session.status = "waiting";
        broadcast(sessionId, "presence.joined");
        return participant;
      }),
    ),

  heartbeat: (participantId: string) =>
    mutate((store) => {
      const p = store.participants.find((x) => x.id === participantId);
      if (p) {
        p.connected = true;
        p.lastSeenAt = now();
      }
    }),

  /** DELETE /api/sessions/{id}/participants/{participantId} */
  remove: (sessionId: string, participantId: string) =>
    request(() =>
      mutate((store) => {
        store.participants = store.participants.filter((p) => p.id !== participantId);
        broadcast(sessionId, "participant.removed");
      }),
    ),
};

/* ---------------------------------- canvas --------------------------------- */

export const canvasApi = {
  /** GET /api/sessions/{id}/canvas */
  get: (sessionId: string) =>
    request(() => read().documents[sessionId] ?? emptyCanvasDocument()),

  /**
   * document.update — in the real system this is a CRDT update over WebSocket.
   * The mock stores a whole document and bumps a version, then notifies peers.
   */
  save: (sessionId: string, doc: CanvasDocument) =>
    new Promise<CanvasDocument>((resolve) => {
      setTimeout(() => {
        const saved = mutate((store) => {
          const next = { ...doc, version: doc.version + 1 };
          store.documents[sessionId] = next;
          return next;
        });
        broadcast(sessionId, "document.update");
        resolve(saved);
      }, 120);
    }),
};

/* ----------------------------- notes / evaluation --------------------------- */

export const notesApi = {
  get: (sessionId: string) =>
    request(
      () =>
        read().notes[sessionId] ?? { sessionId, content: "", updatedAt: now() },
    ),
  save: (sessionId: string, content: string) =>
    request(() =>
      mutate((store) => {
        store.notes[sessionId] = { sessionId, content, updatedAt: now() };
        return store.notes[sessionId]!;
      }),
    ),
};

const emptyEvaluation = (sessionId: string): Evaluation => ({
  sessionId,
  ratings: {},
  comments: {},
  overallRecommendation: "not_evaluated",
  submittedAt: null,
  updatedAt: now(),
});

export const evaluationsApi = {
  get: (sessionId: string) =>
    request(() => read().evaluations[sessionId] ?? emptyEvaluation(sessionId)),
  save: (sessionId: string, patch: Partial<Evaluation>) =>
    request(() =>
      mutate((store) => {
        const current = store.evaluations[sessionId] ?? emptyEvaluation(sessionId);
        const next = { ...current, ...patch, updatedAt: now() };
        store.evaluations[sessionId] = next;
        return next;
      }),
    ),
};

/* --------------------------- realtime channel (mock) ----------------------- */

export type RealtimeEvent =
  | "session.state"
  | "timer.updated"
  | "document.update"
  | "presence.joined"
  | "participant.removed";

const CHANNEL_KEY = "designinterview.channel.v1";

function broadcast(sessionId: string, type: RealtimeEvent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CHANNEL_KEY,
    JSON.stringify({ sessionId, type, messageId: uid("msg"), timestamp: now() }),
  );
}

/**
 * Stand-in for the WebSocket collaboration gateway. Cross-tab messages arrive
 * through the storage event, which makes multi-participant behaviour testable
 * before the real gateway exists.
 */
export function openSessionChannel(
  sessionId: string,
  onEvent: (type: RealtimeEvent) => void,
) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key !== CHANNEL_KEY || !e.newValue) return;
    try {
      const msg = JSON.parse(e.newValue) as { sessionId: string; type: RealtimeEvent };
      if (msg.sessionId === sessionId) onEvent(msg.type);
    } catch {
      /* ignore malformed frame */
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function resetMockBackend() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORE_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}