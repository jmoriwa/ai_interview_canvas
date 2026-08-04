import json
import os
from collections.abc import Iterator, MutableMapping
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import RLock
from typing import Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import JSON, String, create_engine, delete, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .auth import hash_password, new_token, token_digest
from .models import CanvasDocument, Evaluation, InterviewSession, InterviewerNote, SessionParticipant, StoredUser


def utcnow() -> datetime:
    return datetime.now(UTC)


def _default_database_url() -> str:
    database_path = Path(__file__).resolve().parents[1] / "designinterview.db"
    return f"sqlite:///{database_path.as_posix()}"


DATABASE_URL = os.getenv("DATABASE_URL", _default_database_url())


class Base(DeclarativeBase):
    pass


class Record(Base):
    __tablename__ = "records"

    collection: Mapped[str] = mapped_column(String(32), primary_key=True)
    key: Mapped[str] = mapped_column(String(512), primary_key=True)
    value: Mapped[dict | str] = mapped_column(JSON, nullable=False)


engine_options = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, **engine_options)
SessionFactory = sessionmaker(bind=engine, expire_on_commit=False)
Base.metadata.create_all(engine)

T = TypeVar("T")


def _encode_key(key: object) -> str:
    return json.dumps(key, separators=(",", ":"))


def _decode_key(key: str) -> object:
    decoded = json.loads(key)
    return tuple(decoded) if isinstance(decoded, list) else decoded


class DatabaseMapping(MutableMapping, Generic[T]):
    """A small mapping facade that persists values through SQLAlchemy."""

    def __init__(self, collection: str, model: type[T] | None = None) -> None:
        self.collection = collection
        self.model = model

    def _deserialize(self, value: dict | str) -> T:
        if self.model and issubclass(self.model, BaseModel):
            return self.model.model_validate(value)
        return value  # type: ignore[return-value]

    def _serialize(self, value: T) -> dict | str:
        if isinstance(value, BaseModel):
            return value.model_dump(mode="json", by_alias=True)
        return value  # type: ignore[return-value]

    def __getitem__(self, key: object) -> T:
        with SessionFactory() as db:
            record = db.get(Record, (self.collection, _encode_key(key)))
            if record is None:
                raise KeyError(key)
            return self._deserialize(record.value)

    def __setitem__(self, key: object, value: T) -> None:
        encoded = _encode_key(key)
        with SessionFactory.begin() as db:
            record = db.get(Record, (self.collection, encoded))
            serialized = self._serialize(value)
            if record is None:
                db.add(Record(collection=self.collection, key=encoded, value=serialized))
            else:
                record.value = serialized

    def __delitem__(self, key: object) -> None:
        with SessionFactory.begin() as db:
            record = db.get(Record, (self.collection, _encode_key(key)))
            if record is None:
                raise KeyError(key)
            db.delete(record)

    def __iter__(self) -> Iterator:
        with SessionFactory() as db:
            keys = db.scalars(select(Record.key).where(Record.collection == self.collection)).all()
        return iter(_decode_key(key) for key in keys)

    def __len__(self) -> int:
        with SessionFactory() as db:
            return len(db.scalars(select(Record.key).where(Record.collection == self.collection)).all())


class DatabaseStore:
    def __init__(self) -> None:
        self.lock = RLock()
        self.users = DatabaseMapping("users", StoredUser)
        self.sessions = DatabaseMapping("sessions", InterviewSession)
        self.participants = DatabaseMapping("participants", SessionParticipant)
        self.canvases = DatabaseMapping("canvases", CanvasDocument)
        self.notes = DatabaseMapping("notes", InterviewerNote)
        self.evaluations = DatabaseMapping("evaluations", Evaluation)
        self.user_tokens = DatabaseMapping[str]("user_tokens")
        self.participant_tokens = DatabaseMapping[str]("participant_tokens")
        self.seed()

    def reset(self) -> None:
        """Clear and reseed storage. Intended for isolated test setup."""
        with self.lock, SessionFactory.begin() as db:
            db.execute(delete(Record))
        self.seed()

    def seed(self) -> None:
        with self.lock:
            if len(self.users):
                return
            self._seed_data()

    def _seed_data(self) -> None:
        now = utcnow()
        users = [
            ("user-alex", "alex@example.com", "Alex Rivera", "password123"),
            ("user-sam", "sam@example.com", "Sam Chen", "password123"),
        ]
        for user_id, email, name, password in users:
            self.users[user_id] = StoredUser(id=user_id, email=email, displayName=name, password_hash=hash_password(password))

        prompt = {
            "title": "Design a URL shortener", "question": "Design a reliable URL shortening service.",
            "requirements": ["Create and resolve short URLs", "Track click counts"],
            "constraints": ["100M redirects per day", "Low redirect latency"],
            "followUps": ["How would you handle hot links?", "How would you add expiration?"], "revealedFollowUps": 0,
        }
        seeded = [
            ("session-active", "Active URL Shortener Interview", "active", "candidate-42", now - timedelta(minutes=18), None),
            ("session-waiting", "Upcoming System Design", "waiting", "candidate-77", None, None),
            ("session-completed", "Completed Architecture Review", "completed", "candidate-19", now - timedelta(days=1), now - timedelta(hours=23)),
        ]
        for sid, title, state, candidate, started, completed in seeded:
            self.sessions[sid] = InterviewSession(
                id=sid, ownerUserId="user-alex", title=title, prompt=prompt, candidateReference=candidate,
                status=state, durationSeconds=2700, timerStartedAt=started if state == "active" else None,
                timerAccumulatedSeconds=420 if state in {"active", "completed"} else 0,
                candidateEditingEnabled=True, observerEditingEnabled=False,
                canvasPermission="candidate_and_interviewers", templateId="system-design",
                invitationToken=f"invite-{sid}", startedAt=started, completedAt=completed,
                expiresAt=now + timedelta(days=2), createdAt=now - timedelta(days=2), updatedAt=now,
            )
            self.canvases[sid] = CanvasDocument(version=1, nodes=[], connectors=[], strokes=[])

        participant = SessionParticipant(
            id="participant-candidate", sessionId="session-active", displayName="Taylor Morgan", role="candidate",
            presenceColor="#6366f1", connected=True, joinedAt=now - timedelta(minutes=20), lastSeenAt=now,
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

    def revoke_participant_tokens(self, participant_id: str) -> None:
        for digest, stored_participant_id in list(self.participant_tokens.items()):
            if stored_participant_id == participant_id:
                self.participant_tokens.pop(digest, None)


store = DatabaseStore()
