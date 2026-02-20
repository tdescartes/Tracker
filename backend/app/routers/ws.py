"""
WebSocket router — Phase 3
Real-time household sync via /api/ws/{household_id}

Clients connect and receive JSON events when any household member:
  - adds/updates/removes a pantry item
  - confirms a receipt
  - updates a goal

Connection lifecycle:
  1. Client connects with JWT in query param: /api/ws/{hid}?token=<jwt>
  2. Server validates token, adds to household room
  3. On disconnect, removes from room

Events sent to household room (JSON):
  { "event": "pantry_updated", "data": {...} }
  { "event": "receipt_confirmed", "data": {...} }
  { "event": "goal_updated", "data": {...} }
  { "event": "ping", "data": {} }
"""
import asyncio
import json
from collections import defaultdict
from typing import DefaultDict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from jose import JWTError, jwt

from app.config import settings

router = APIRouter()

# In-memory room map: household_id → set of WebSocket connections
_rooms: DefaultDict[str, set[WebSocket]] = defaultdict(set)


class HouseholdSyncManager:
    async def connect(self, ws: WebSocket, household_id: str) -> None:
        await ws.accept()
        _rooms[household_id].add(ws)

    def disconnect(self, ws: WebSocket, household_id: str) -> None:
        _rooms[household_id].discard(ws)
        if not _rooms[household_id]:
            del _rooms[household_id]

    async def broadcast(self, household_id: str, event: str, data: dict) -> None:
        """Send an event to all connected members of a household room."""
        if household_id not in _rooms:
            return
        dead: list[WebSocket] = []
        message = json.dumps({"event": event, "data": data})
        for ws in list(_rooms[household_id]):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            _rooms[household_id].discard(ws)

    def active_count(self, household_id: str) -> int:
        return len(_rooms.get(household_id, set()))


manager = HouseholdSyncManager()


async def _validate_token_from_query(token: str) -> dict:
    """Validate JWT and return payload. Raises ValueError on failure."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("sub") is None:
            raise ValueError("Invalid token subject")
        return payload
    except JWTError as e:
        raise ValueError(f"Token validation failed: {e}")


@router.websocket("/{household_id}")
async def household_websocket(
    household_id: str,
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket endpoint for real-time household sync.
    Validates the JWT before accepting the connection.
    """
    # Validate token before accepting
    try:
        payload = await _validate_token_from_query(token)
    except ValueError:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(websocket, household_id)

    # Send welcome message with current connection count
    await websocket.send_text(json.dumps({
        "event": "connected",
        "data": {
            "household_id": household_id,
            "active_connections": manager.active_count(household_id),
            "message": "Connected to Tracker real-time sync",
        },
    }))

    # Start a background ping task to keep connection alive
    ping_task = asyncio.create_task(_ping_loop(websocket))

    try:
        while True:
            # Listen for client messages (client can send events too)
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                # Echo back acknowledgement
                await websocket.send_text(json.dumps({
                    "event": "ack",
                    "data": {"received": msg.get("event")},
                }))
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        pass
    finally:
        ping_task.cancel()
        manager.disconnect(websocket, household_id)


async def _ping_loop(ws: WebSocket, interval: int = 30) -> None:
    """Send a ping every `interval` seconds to keep the connection alive."""
    while True:
        await asyncio.sleep(interval)
        try:
            await ws.send_text(json.dumps({"event": "ping", "data": {}}))
        except Exception:
            break


# ---------------------------------------------------------------------------
# Public utility — broadcast from other routers
# ---------------------------------------------------------------------------
async def broadcast_to_household(household_id: str, event: str, data: dict) -> None:
    """Call this from any router to push a real-time event to a household."""
    await manager.broadcast(household_id, event, data)
