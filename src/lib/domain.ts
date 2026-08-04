/**
 * Domain types for DesignInterview.
 *
 * These mirror the data model in the product spec (section 14) and are kept
 * independent of any transport so the real backend can adopt them as-is.
 */

export type SessionStatus =
  | "draft"
  | "waiting"
  | "active"
  | "paused"
  | "completed"
  | "expired"
  | "cancelled";

export type ParticipantRole = "interviewer" | "candidate" | "observer";

export type CanvasPermission =
  | "everyone"
  | "candidate_and_interviewers"
  | "interviewers_only"
  | "owner_only";

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface InterviewPrompt {
  title: string;
  question: string;
  requirements: string[];
  constraints: string[];
  followUps: string[];
  revealedFollowUps: number;
}

export interface InterviewSession {
  id: string;
  ownerUserId: string;
  title: string;
  prompt: InterviewPrompt;
  candidateReference: string;
  status: SessionStatus;
  durationSeconds: number | null;
  timerStartedAt: string | null;
  timerAccumulatedSeconds: number;
  candidateEditingEnabled: boolean;
  observerEditingEnabled: boolean;
  canvasPermission: CanvasPermission;
  templateId: string;
  invitationToken: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  displayName: string;
  role: ParticipantRole;
  presenceColor: string;
  connected: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

/* ---------------------------------- canvas --------------------------------- */

export type NodeKind = "component" | "text" | "note" | "shape";

export interface CanvasNode {
  id: string;
  kind: NodeKind;
  componentType: string;
  label: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  locked?: boolean;
  shape?: "rectangle" | "ellipse" | "diamond";
}

export type ConnectorStyle = "solid" | "dashed" | "dotted";
export type ConnectorDirection = "forward" | "none" | "both";

export interface CanvasConnector {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  style: ConnectorStyle;
  direction: ConnectorDirection;
  color: string;
}

export interface CanvasStroke {
  id: string;
  points: number[]; // flat [x, y, x, y, ...] in document coordinates
  color: string;
  width: number;
  tool: "pen" | "highlighter";
}

export interface CanvasDocument {
  version: number;
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
  strokes: CanvasStroke[];
}

export const emptyCanvasDocument = (): CanvasDocument => ({
  version: 0,
  nodes: [],
  connectors: [],
  strokes: [],
});

/* ------------------------------ notes / scoring ----------------------------- */

export interface InterviewerNote {
  sessionId: string;
  content: string;
  updatedAt: string;
}

export const SCORECARD_CATEGORIES = [
  "Requirements clarification",
  "High-level architecture",
  "Data modeling",
  "API design",
  "Scalability",
  "Reliability",
  "Performance",
  "Security",
  "Trade-off analysis",
  "Communication",
] as const;

export type ScorecardCategory = (typeof SCORECARD_CATEGORIES)[number];

export type Recommendation =
  | "strong_hire"
  | "hire"
  | "mixed"
  | "no_hire"
  | "strong_no_hire"
  | "not_evaluated";

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strong_hire: "Strong hire",
  hire: "Hire",
  mixed: "Mixed",
  no_hire: "No hire",
  strong_no_hire: "Strong no hire",
  not_evaluated: "Not evaluated",
};

export interface Evaluation {
  sessionId: string;
  ratings: Partial<Record<ScorecardCategory, number>>;
  comments: Partial<Record<ScorecardCategory, string>>;
  overallRecommendation: Recommendation;
  submittedAt: string | null;
  updatedAt: string;
}

/* --------------------------------- helpers -------------------------------- */

export const PRESENCE_COLORS = [
  "oklch(0.79 0.13 195)",
  "oklch(0.8 0.14 78)",
  "oklch(0.72 0.15 155)",
  "oklch(0.7 0.16 300)",
  "oklch(0.68 0.18 25)",
  "oklch(0.75 0.12 240)",
];

export function elapsedSeconds(session: InterviewSession, now = Date.now()) {
  const running = session.timerStartedAt
    ? Math.floor((now - new Date(session.timerStartedAt).getTime()) / 1000)
    : 0;
  return session.timerAccumulatedSeconds + Math.max(0, running);
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}