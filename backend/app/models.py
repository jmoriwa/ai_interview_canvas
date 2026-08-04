from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class LoginRequest(StrictModel):
    email: EmailStr
    password: str


class SignupRequest(StrictModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(alias="displayName", min_length=2, max_length=60)


class User(StrictModel):
    id: str
    email: EmailStr
    display_name: str = Field(alias="displayName")


class StoredUser(User):
    password_hash: str


class InterviewPrompt(StrictModel):
    title: str
    question: str
    requirements: list[str]
    constraints: list[str]
    follow_ups: list[str] = Field(alias="followUps")
    revealed_follow_ups: int = Field(alias="revealedFollowUps", ge=0)


class SessionStatus(str, Enum):
    draft = "draft"
    waiting = "waiting"
    active = "active"
    paused = "paused"
    completed = "completed"
    expired = "expired"
    cancelled = "cancelled"


class CanvasPermission(str, Enum):
    everyone = "everyone"
    candidate_and_interviewers = "candidate_and_interviewers"
    interviewers_only = "interviewers_only"
    owner_only = "owner_only"


class InterviewSession(StrictModel):
    id: str
    owner_user_id: str = Field(alias="ownerUserId")
    title: str
    prompt: InterviewPrompt
    candidate_reference: str = Field(alias="candidateReference")
    status: SessionStatus
    duration_seconds: int | None = Field(alias="durationSeconds", ge=0)
    timer_started_at: datetime | None = Field(alias="timerStartedAt")
    timer_accumulated_seconds: int = Field(alias="timerAccumulatedSeconds", ge=0)
    candidate_editing_enabled: bool = Field(alias="candidateEditingEnabled")
    observer_editing_enabled: bool = Field(alias="observerEditingEnabled")
    canvas_permission: CanvasPermission = Field(alias="canvasPermission")
    template_id: str = Field(alias="templateId")
    invitation_token: str = Field(alias="invitationToken")
    started_at: datetime | None = Field(alias="startedAt")
    completed_at: datetime | None = Field(alias="completedAt")
    expires_at: datetime = Field(alias="expiresAt")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class CreateSessionRequest(StrictModel):
    title: str = Field(min_length=3, max_length=120)
    prompt: InterviewPrompt
    candidate_reference: str = Field(alias="candidateReference", max_length=120)
    duration_seconds: int | None = Field(alias="durationSeconds", ge=0)
    candidate_editing_enabled: bool = Field(alias="candidateEditingEnabled")
    observer_editing_enabled: bool = Field(alias="observerEditingEnabled")
    expires_in_hours: int = Field(alias="expiresInHours", ge=1)
    template_id: str = Field(alias="templateId")


class UpdateSessionRequest(StrictModel):
    title: str | None = None
    prompt: InterviewPrompt | None = None
    candidate_reference: str | None = Field(default=None, alias="candidateReference")
    duration_seconds: int | None = Field(default=None, alias="durationSeconds", ge=0)
    candidate_editing_enabled: bool | None = Field(default=None, alias="candidateEditingEnabled")
    observer_editing_enabled: bool | None = Field(default=None, alias="observerEditingEnabled")
    canvas_permission: CanvasPermission | None = Field(default=None, alias="canvasPermission")

    @model_validator(mode="after")
    def not_empty(self):
        if not self.model_fields_set:
            raise ValueError("At least one property is required")
        return self


class TimerCommandRequest(StrictModel):
    command: Literal["start", "pause", "reset", "add_time"]
    seconds: int = Field(default=300, ge=1)


class ParticipantRole(str, Enum):
    interviewer = "interviewer"
    candidate = "candidate"
    observer = "observer"


class JoinInvitationRequest(StrictModel):
    display_name: str = Field(alias="displayName", min_length=2, max_length=60)
    role: ParticipantRole


class SessionParticipant(StrictModel):
    id: str
    session_id: str = Field(alias="sessionId")
    display_name: str = Field(alias="displayName")
    role: ParticipantRole
    presence_color: str = Field(alias="presenceColor")
    connected: bool
    joined_at: datetime = Field(alias="joinedAt")
    last_seen_at: datetime = Field(alias="lastSeenAt")


class CanvasNode(StrictModel):
    id: str
    kind: Literal["component", "text", "note", "shape"]
    component_type: str = Field(alias="componentType")
    label: str
    description: str | None = None
    x: float
    y: float
    width: float
    height: float
    color: str
    locked: bool | None = None
    shape: Literal["rectangle", "ellipse", "diamond"] | None = None


class CanvasConnector(StrictModel):
    id: str
    from_node_id: str = Field(alias="fromNodeId")
    to_node_id: str = Field(alias="toNodeId")
    label: str
    style: Literal["solid", "dashed", "dotted"]
    direction: Literal["forward", "none", "both"]
    color: str


class CanvasStroke(StrictModel):
    id: str
    points: list[float]
    color: str
    width: float = Field(ge=0)
    tool: Literal["pen", "highlighter"]


class CanvasDocument(StrictModel):
    version: int = Field(ge=0)
    nodes: list[CanvasNode]
    connectors: list[CanvasConnector]
    strokes: list[CanvasStroke]


class InterviewerNote(StrictModel):
    session_id: str = Field(alias="sessionId")
    content: str
    updated_at: datetime = Field(alias="updatedAt")


class SaveNoteRequest(StrictModel):
    content: str


ScorecardCategory = Literal["Requirements clarification", "High-level architecture", "Data modeling", "API design", "Scalability", "Reliability", "Performance", "Security", "Trade-off analysis", "Communication"]
Recommendation = Literal["strong_hire", "hire", "mixed", "no_hire", "strong_no_hire", "not_evaluated"]


class Evaluation(StrictModel):
    session_id: str = Field(alias="sessionId")
    ratings: dict[ScorecardCategory, int]
    comments: dict[ScorecardCategory, str]
    overall_recommendation: Recommendation = Field(alias="overallRecommendation")
    submitted_at: datetime | None = Field(alias="submittedAt")
    updated_at: datetime = Field(alias="updatedAt")

    @model_validator(mode="after")
    def validate_ratings(self):
        if any(value < 1 or value > 5 for value in self.ratings.values()):
            raise ValueError("Ratings must be between 1 and 5")
        return self


class UpdateEvaluationRequest(StrictModel):
    ratings: dict[ScorecardCategory, int] | None = None
    comments: dict[ScorecardCategory, str] | None = None
    overall_recommendation: Recommendation | None = Field(default=None, alias="overallRecommendation")
    submitted_at: datetime | None = Field(default=None, alias="submittedAt")

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one property is required")
        if self.ratings and any(value < 1 or value > 5 for value in self.ratings.values()):
            raise ValueError("Ratings must be between 1 and 5")
        return self
