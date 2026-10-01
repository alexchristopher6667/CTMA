"""
CommunicationManager: owns per-agent inboxes, the full message history, and
pushes live events out over WebSocket connections so the frontend can
animate everything as it happens.

Inboxes are keyed by internal agent id ("research" / "analyst" / "critic").
Messages themselves still store human-readable sender/receiver *names* (e.g.
"Research Agent" -> "Analyst Agent", or "Research Agent" -> "Team" for a
round-3 broadcast) since that's what the transcript and stream UI display --
send_message() takes both the id (for routing) and the name (for display) so
the two never get confused.
"""

from __future__ import annotations

import json
import uuid
from typing import Dict, List, Optional

from fastapi import WebSocket

from models import Message, MessageType


class CommunicationManager:
    def __init__(self) -> None:
        self.inboxes: Dict[str, List[Message]] = {"research": [], "analyst": [], "critic": []}
        self.history: List[Message] = []
        self._connections: List[WebSocket] = []

    # -- WebSocket connection management ----------------------------------

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)

    async def broadcast(self, event: dict) -> None:
        """Send a JSON event to every connected frontend client."""
        payload = json.dumps(event)
        dead = []
        for ws in self._connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    # -- Messaging -----------------------------------------------------------

    def send_message(
        self,
        sender_id: str,
        receiver_id: Optional[str],
        sender_name: str,
        receiver_name: str,
        content: str,
        round_number: int,
        message_type: MessageType,
        confidence: Optional[float] = None,
        duration_sec: float = 0.0,
    ) -> Message:
        message = Message(
            id=str(uuid.uuid4()),
            sender=sender_name,
            receiver=receiver_name,
            content=content,
            round=round_number,
            message_type=message_type,
            confidence=confidence,
            duration_sec=duration_sec,
        )
        # receiver_id is None for broadcast-style messages (e.g. a round-3
        # "to Team" statement) which have no single agent inbox to land in;
        # they still go into history for the transcript / final synthesis.
        if receiver_id is not None and receiver_id in self.inboxes:
            self.inboxes[receiver_id].append(message)
        self.history.append(message)
        return message

    def inbox_for(self, agent_id: str) -> List[Message]:
        return self.inboxes.get(agent_id, [])

    def reset(self) -> None:
        self.inboxes = {"research": [], "analyst": [], "critic": []}
        self.history = []
