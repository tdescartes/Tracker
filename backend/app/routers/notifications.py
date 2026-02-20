"""
Notifications router — Phase 2
POST /api/notifications/token          → register push token
DELETE /api/notifications/token        → unregister
GET  /api/notifications/               → list in-app notifications
POST /api/notifications/{id}/read      → mark one as read
POST /api/notifications/read-all       → mark all as read
POST /api/notifications/trigger-expiry → manually trigger expiry check (admin/cron)
"""
from fastapi import APIRouter, Depends, Body, HTTPException
from pydantic import BaseModel
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services import notification_service as ns

router = APIRouter()


class TokenPayload(BaseModel):
    token: str
    platform: Literal["expo", "web"] = "expo"


@router.post("/token", status_code=204)
async def register_push_token(
    payload: TokenPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register or refresh a push notification token for this device."""
    await ns.register_token(db, str(current_user.id), payload.token, payload.platform)


@router.delete("/token", status_code=204)
async def unregister_push_token(
    payload: TokenPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove push token (called on logout or permission denied)."""
    await ns.unregister_token(db, payload.token)


@router.get("/")
async def list_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch in-app notifications (most recent 50)."""
    notifications = await ns.get_notifications(db, str(current_user.id), unread_only=unread_only)
    unread_count = sum(1 for n in notifications if not n["is_read"])
    return {"notifications": notifications, "unread_count": unread_count}


@router.post("/{notification_id}/read", status_code=204)
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ns.mark_read(db, str(current_user.id), notification_id)


@router.post("/read-all", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ns.mark_read(db, str(current_user.id))


@router.post("/trigger-expiry")
async def trigger_expiry_notifications(
    days_ahead: int = Body(default=3, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually trigger expiry-alert notifications for all households.
    In production this would be called by a cron job (e.g., every morning at 8 AM).
    """
    result = await ns.send_expiry_notifications(db, days_ahead=days_ahead)
    return result
