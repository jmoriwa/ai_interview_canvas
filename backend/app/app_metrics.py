"""Domain metrics for interview room activity."""

from datetime import timedelta
from typing import Iterable

from opentelemetry import metrics
from opentelemetry.metrics import CallbackOptions, Observation

from .models import CanvasDocument
from .store import store, utcnow

ACTIVE_PARTICIPANT_WINDOW = timedelta(seconds=60)

meter = metrics.get_meter("designinterview.domain")

rooms_created = meter.create_counter(
    "interview_rooms_created",
    unit="{room}",
    description="Number of interview rooms created",
)
canvas_elements_created = meter.create_counter(
    "interview_room_canvas_elements_created",
    unit="{element}",
    description="Number of canvas elements added to interview rooms",
)


def canvas_element_counts(canvas: CanvasDocument) -> dict[str, int]:
    return {
        "node": len(canvas.nodes),
        "connector": len(canvas.connectors),
        "stroke": len(canvas.strokes),
    }


def record_room_created() -> None:
    rooms_created.add(1)


def record_canvas_additions(
    room_id: str, previous: CanvasDocument, current: CanvasDocument
) -> None:
    previous_counts = canvas_element_counts(previous)
    for element_type, current_count in canvas_element_counts(current).items():
        added = current_count - previous_counts[element_type]
        if added > 0:
            canvas_elements_created.add(
                added,
                {"room.id": room_id, "element.type": element_type},
            )


def observe_active_participants(
    _: CallbackOptions,
) -> Iterable[Observation]:
    cutoff = utcnow() - ACTIVE_PARTICIPANT_WINDOW
    counts = {room_id: 0 for room_id in store.sessions}
    for participant in store.participants.values():
        if participant.connected and participant.last_seen_at >= cutoff:
            counts[participant.session_id] = counts.get(participant.session_id, 0) + 1
    return [
        Observation(count, {"room.id": room_id})
        for room_id, count in counts.items()
    ]


def observe_canvas_elements(_: CallbackOptions) -> Iterable[Observation]:
    observations: list[Observation] = []
    for room_id, canvas in store.canvases.items():
        for element_type, count in canvas_element_counts(canvas).items():
            observations.append(
                Observation(
                    count,
                    {"room.id": room_id, "element.type": element_type},
                )
            )
    return observations


def observe_rooms(_: CallbackOptions) -> Iterable[Observation]:
    return [Observation(len(store.sessions))]


meter.create_observable_gauge(
    "interview_rooms",
    callbacks=[observe_rooms],
    unit="{room}",
    description="Current number of interview rooms",
)
meter.create_observable_gauge(
    "interview_room_active_participants",
    callbacks=[observe_active_participants],
    unit="{participant}",
    description="Participants with a heartbeat in the last 60 seconds",
)
meter.create_observable_gauge(
    "interview_room_canvas_elements",
    callbacks=[observe_canvas_elements],
    unit="{element}",
    description="Current canvas elements in interview rooms",
)
