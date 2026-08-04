from datetime import UTC, datetime, timedelta
from threading import RLock

from .auth import hash_password, new_token, token_digest
from .models import CanvasDocument, Evaluation, InterviewSession, InterviewerNote, SessionParticipant, StoredUser


def utcnow() -> datetime:
    return datetime.now(UTC)


class MemoryStore:
    def __init__(self) -> None:
        self.lock = RLock()
        self.reset()

    def reset(self) -> None:
        now = utcnow()
        self.users: dict[str, StoredUser] = {}
        self.sessions: dict[str, InterviewSession] = {}
        self.participants: dict[str, SessionParticipant] = {}
        self.canvases: dict[str, CanvasDocument] = {}
        self.notes: dict[tuple[str, str], InterviewerNote] = {}
        self.evaluations: dict[tuple[str, str], Evaluation] = {}
        self.user_tokens: dict[str, str] = {}
        self.participant_tokens: dict[str, str] = {}

        users = [
            ("user-alex", "alex@example.com", "Alex Rivera", "password123"),
            ("user-sam", "sam@example.com", "Sam Chen", "password123"),
        ]
        for user_id, email, name, password in users:
            self.users[user_id] = StoredUser(id=user_id, email=email, displayName=name, password_hash=hash_password(password))

        prompt = {
            "title": "Design a URL shortener",
            "question": "Design a reliable URL shortening service.",
            "requirements": ["Create and resolve short URLs", "Track click counts"],
            "constraints": ["100M redirects per day", "Low redirect latency"],
            "followUps": ["How would you handle hot links?", "How would you add expiration?"],
            "revealedFollowUps": 0,
        }
        seeded = [
            ("session-active", "Active URL Shortener Interview", "active", "candidate-42", now - timedelta(minutes=18), None),
            ("session-waiting", "Upcoming System Design", "waiting", "candidate-77", None, None),
            ("session-completed", "Completed Architecture Review", "completed", "candidate-19", now - timedelta(days=1), now - timedelta(hours=23)),
        ]
        for sid, title, state, candidate, started, completed in seeded:
            self.sessions[sid] = InterviewSession(
                id=sid, ownerUserId="user-alex", title=title, prompt=prompt,
                candidateReference=candidate, status=state, durationSeconds=2700,
                timerStartedAt=started if state == "active" else None,
                timerAccumulatedSeconds=420 if state in {"active", "completed"} else 0,
                candidateEditingEnabled=True, observerEditingEnabled=False,
                canvasPermission="candidate_and_interviewers", templateId="system-design",
                invitationToken=f"invite-{sid}", startedAt=started, completedAt=completed,
                expiresAt=now + timedelta(days=2), createdAt=now - timedelta(days=2), updatedAt=now,
            )
            self.canvases[sid] = CanvasDocument(version=1, nodes=[], connectors=[], strokes=[])

        participant = SessionParticipant(
            id="participant-candidate", sessionId="session-active", displayName="Taylor Morgan",
            role="candidate", presenceColor="#6366f1", connected=True, joinedAt=now - timedelta(minutes=20), lastSeenAt=now,
        )
        self.participants[participant.id] = participant
        self.seed_participant_token = "seed-participant-token"
        self.participant_tokens[token_digest(self.seed_participant_token)] = participant.id
        self.evaluations[("session-completed", "user-alex")] = Evaluation(
            sessionId="session-completed", ratings={"API design": 4, "Communication": 5},
            comments={"API design": "Clear boundaries and trade-offs."}, overallRecommendation="hire",
            submittedAt=completed, updatedAt=now,
        )

    def issue_user_token(self, user_id: str) -> str:
        token = new_token()
        self.user_tokens[token_digest(token)] = user_id
        return token

    def issue_participant_token(self, participant_id: str) -> str:
        token = new_token()
        self.participant_tokens[token_digest(token)] = participant_id
        return token


store = MemoryStore()
