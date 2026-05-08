"""
WebSocket-based real-time queue.
Protocol: JSON messages with { "type": ..., "payload": ... }

Client → Server:
  session:create  {}
  session:join    { "code": "ABCDEF" }
  queue:add       { "code": ..., "item": QueueItem }
  queue:remove    { "code": ..., "item_id": str }
  queue:reorder   { "code": ..., "ordered_ids": [str] }
  queue:next      { "code": ... }

Server → Client (broadcast):
  session:created  { "code": ... }
  queue:updated    { "session": SessionState }
  error            { "message": ... }
"""

import json
import uuid
import string
import random
from typing import Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["queue"])


# ── In-memory state ────────────────────────────────────────────────────────────


class SessionState:
    def __init__(self, host_ws_id: str):
        self.host_ws_id = host_ws_id
        self.queue: List[dict] = []
        self.current_item: Optional[dict] = None

    def to_dict(self):
        return {
            "queue": self.queue,
            "current_item": self.current_item,
        }


sessions: Dict[str, SessionState] = {}
ws_to_session: Dict[str, str] = {}
session_connections: Dict[str, List[WebSocket]] = {}


def _gen_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


async def _broadcast(code: str, msg: dict):
    dead = []
    for ws in session_connections.get(code, []):
        try:
            await ws.send_json(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        session_connections[code].remove(ws)


async def _handle_message(ws_id: str, ws: WebSocket, raw: str):
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        await ws.send_json({"type": "error", "payload": {"message": "Invalid JSON"}})
        return

    msg_type: str = data.get("type", "")
    payload: dict = data.get("payload", {})

    if msg_type == "session:create":
        code = _gen_code()
        sessions[code] = SessionState(ws_id)
        ws_to_session[ws_id] = code
        session_connections.setdefault(code, []).append(ws)
        await ws.send_json({"type": "session:created", "payload": {"code": code}})

    elif msg_type == "session:join":
        code = payload.get("code", "").upper()
        if code not in sessions:
            await ws.send_json({"type": "error", "payload": {"message": "Session not found"}})
            return
        ws_to_session[ws_id] = code
        session_connections.setdefault(code, []).append(ws)
        await ws.send_json(
            {"type": "session:joined", "payload": {"code": code, "session": sessions[code].to_dict()}}
        )

    elif msg_type == "queue:add":
        code = payload.get("code", "").upper()
        session = sessions.get(code)
        if not session:
            await ws.send_json({"type": "error", "payload": {"message": "Session not found"}})
            return
        item = {**payload.get("item", {}), "id": str(uuid.uuid4())}
        session.queue.append(item)
        await _broadcast(code, {"type": "queue:updated", "payload": {"session": session.to_dict()}})

    elif msg_type == "queue:remove":
        code = payload.get("code", "").upper()
        session = sessions.get(code)
        if not session:
            return
        item_id = payload.get("item_id")
        session.queue = [i for i in session.queue if i.get("id") != item_id]
        await _broadcast(code, {"type": "queue:updated", "payload": {"session": session.to_dict()}})

    elif msg_type == "queue:reorder":
        code = payload.get("code", "").upper()
        session = sessions.get(code)
        if not session:
            return
        ordered_ids: list = payload.get("ordered_ids", [])
        id_map = {i["id"]: i for i in session.queue}
        session.queue = [id_map[oid] for oid in ordered_ids if oid in id_map]
        await _broadcast(code, {"type": "queue:updated", "payload": {"session": session.to_dict()}})

    elif msg_type == "queue:next":
        code = payload.get("code", "").upper()
        session = sessions.get(code)
        if not session or session.host_ws_id != ws_id:
            return
        session.current_item = session.queue.pop(0) if session.queue else None
        await _broadcast(code, {"type": "queue:updated", "payload": {"session": session.to_dict()}})

    elif msg_type == "queue:get":
        code = payload.get("code", "").upper()
        session = sessions.get(code)
        if session:
            await ws.send_json({"type": "queue:updated", "payload": {"session": session.to_dict()}})


@router.websocket("/ws/queue")
async def queue_ws(ws: WebSocket):
    await ws.accept()
    ws_id = str(uuid.uuid4())

    try:
        while True:
            raw = await ws.receive_text()
            await _handle_message(ws_id, ws, raw)
    except WebSocketDisconnect:
        code = ws_to_session.pop(ws_id, None)
        if code:
            conns = session_connections.get(code, [])
            if ws in conns:
                conns.remove(ws)
            session = sessions.get(code)
            if session and session.host_ws_id == ws_id:
                sessions.pop(code, None)
