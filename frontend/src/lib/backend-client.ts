import type {
  CanvasDocument,
  CanvasPermission,
  Evaluation,
  InterviewSession,
  InterviewerNote,
  ParticipantRole,
  SessionParticipant,
  User,
} from "./domain";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
const AUTH_KEY = "designinterview.auth.v1";
const ACCESS_TOKEN_KEY = "designinterview.access-token.v1";
const PARTICIPANT_TOKEN_PREFIX = "designinterview.participant-token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getParticipantToken(sessionId?: string) {
  if (!sessionId || typeof window === "undefined") return null;
  const joinedSession = window.localStorage.getItem(`designinterview.participant.${sessionId}`);
  return joinedSession
    ? window.localStorage.getItem(`${PARTICIPANT_TOKEN_PREFIX}.${sessionId}`)
    : null;
}

async function request<T>(path: string, options: RequestInit = {}, sessionId?: string): Promise<T> {
  const headers = new Headers(options.headers);
  const token =
    getParticipantToken(sessionId) ??
    (typeof window === "undefined" ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY));
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(body?.message ?? `Request failed (${response.status})`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const auth = {
  currentUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(body?.message ?? "Sign in failed", response.status);
    }
    const user = (await response.json()) as User;
    const token = response.headers.get("X-Access-Token");
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    if (token) window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return user;
  },
  async logout() {
    try {
      await request<void>("/auth/logout", { method: "POST" });
    } finally {
      window.localStorage.removeItem(AUTH_KEY);
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },
};

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
  list: () => request<InterviewSession[]>("/sessions"),
  get: (id: string) => request<InterviewSession>(`/sessions/${id}`, {}, id),
  getByToken: (token: string) => request<InterviewSession>(`/invitations/${token}`),
  create: (input: CreateSessionInput) =>
    request<InterviewSession>("/sessions", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, patch: Partial<InterviewSession>) =>
    request<InterviewSession>(`/sessions/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  transition: (id: string, action: "start" | "pause" | "resume" | "complete" | "cancel") =>
    request<InterviewSession>(`/sessions/${id}/${action}`, { method: "POST" }),
  timer: (id: string, command: "start" | "pause" | "reset" | "add_time", seconds = 300) =>
    request<InterviewSession>(`/sessions/${id}/timer`, {
      method: "POST",
      body: JSON.stringify({ command, seconds }),
    }),
  setPermission: (id: string, permission: CanvasPermission) =>
    sessionsApi.update(id, {
      canvasPermission: permission,
      candidateEditingEnabled:
        permission === "everyone" || permission === "candidate_and_interviewers",
      observerEditingEnabled: permission === "everyone",
    }),
  revealFollowUp: (id: string) =>
    request<InterviewSession>(`/sessions/${id}/follow-ups/reveal`, { method: "POST" }),
};

export const participantsApi = {
  list: (sessionId: string) =>
    request<SessionParticipant[]>(`/sessions/${sessionId}/participants`, {}, sessionId),
  async join(token: string, displayName: string, role: ParticipantRole) {
    const response = await fetch(`${API_BASE}/invitations/${token}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ displayName, role }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(body?.message ?? "Could not join interview", response.status);
    }
    const participant = (await response.json()) as SessionParticipant;
    const participantToken = response.headers.get("X-Participant-Token");
    if (participantToken)
      window.localStorage.setItem(
        `${PARTICIPANT_TOKEN_PREFIX}.${participant.sessionId}`,
        participantToken,
      );
    return participant;
  },
  heartbeat: (participantId: string, sessionId?: string) =>
    request<void>(`/participants/${participantId}/heartbeat`, { method: "POST" }, sessionId),
  remove: (sessionId: string, participantId: string) =>
    request<void>(`/sessions/${sessionId}/participants/${participantId}`, { method: "DELETE" }),
};

export const canvasApi = {
  get: (sessionId: string) =>
    request<CanvasDocument>(`/sessions/${sessionId}/canvas`, {}, sessionId),
  save: (sessionId: string, doc: CanvasDocument) =>
    request<CanvasDocument>(
      `/sessions/${sessionId}/canvas`,
      { method: "PUT", body: JSON.stringify(doc) },
      sessionId,
    ),
};
export const notesApi = {
  get: (sessionId: string) => request<InterviewerNote>(`/sessions/${sessionId}/notes`),
  save: (sessionId: string, content: string) =>
    request<InterviewerNote>(`/sessions/${sessionId}/notes`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
};
export const evaluationsApi = {
  get: (sessionId: string) => request<Evaluation>(`/sessions/${sessionId}/evaluation`),
  save: (sessionId: string, patch: Partial<Evaluation>) =>
    request<Evaluation>(`/sessions/${sessionId}/evaluation`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
};

export type RealtimeEvent =
  "session.state" | "timer.updated" | "document.update" | "presence.joined" | "participant.removed";
// The backend currently exposes REST only; callers already poll session state.
export function openSessionChannel(_sessionId: string, _onEvent: (type: RealtimeEvent) => void) {
  return () => {};
}
