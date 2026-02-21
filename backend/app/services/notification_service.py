"""
Notification Service — Phase 2
Handles push notifications for web (Web Push / browser) and mobile (Expo Push).
Uses ORM models for push tokens and notification records.
"""
import httpx
import uuid
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update

from app.models.notification import PushNotificationToken, Notification
from app.models.pantry import PantryItem, PantryStatus
from app.models.user import User

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def register_token(db: AsyncSession, user_id: str, token: str, platform: str) -> None:
    """Upsert a push notification token for a user."""
    existing = await db.execute(
        select(PushNotificationToken).where(PushNotificationToken.token == token)
    )
    record = existing.scalar_one_or_none()
    if record:
        record.user_id = uuid.UUID(user_id)
        record.platform = platform
    else:
        db.add(PushNotificationToken(user_id=uuid.UUID(user_id), token=token, platform=platform))
    await db.commit()


async def unregister_token(db: AsyncSession, token: str) -> None:
    result = await db.execute(
        select(PushNotificationToken).where(PushNotificationToken.token == token)
    )
    record = result.scalar_one_or_none()
    if record:
        await db.delete(record)
        await db.commit()


async def get_tokens_for_user(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(
        select(PushNotificationToken).where(PushNotificationToken.user_id == uuid.UUID(user_id))
    )
    return [{"token": r.token, "platform": r.platform} for r in result.scalars()]


async def get_tokens_for_household(db: AsyncSession, household_id: str) -> list[dict]:
    result = await db.execute(
        select(PushNotificationToken)
        .join(User, User.id == PushNotificationToken.user_id)
        .where(User.household_id == uuid.UUID(household_id))
    )
    return [{"token": r.token, "platform": r.platform} for r in result.scalars()]


async def send_expiry_notifications(db: AsyncSession, days_ahead: int = 3) -> dict:
    """
    Find all pantry items expiring within `days_ahead` days and send push
    notifications to all household members.
    """
    cutoff = date.today() + timedelta(days=days_ahead)

    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.status.in_([PantryStatus.UNOPENED, PantryStatus.OPENED]),
                PantryItem.expiration_date != None,
                PantryItem.expiration_date <= cutoff,
            )
        ).order_by(PantryItem.household_id, PantryItem.expiration_date)
    )
    items = result.scalars().all()

    if not items:
        return {"households_notified": 0, "total_pushed": 0}

    # Group by household
    from collections import defaultdict
    by_household: dict = defaultdict(list)
    for item in items:
        by_household[str(item.household_id)].append(item)

    total_pushed = 0
    for household_id, h_items in by_household.items():
        tokens = await get_tokens_for_household(db, household_id)
        if not tokens:
            continue

        # Build message
        if len(h_items) == 1:
            item = h_items[0]
            days_left = (item.expiration_date - date.today()).days
            body = f"{item.name} expires {'today' if days_left == 0 else f'in {days_left} day(s)'}!"
        else:
            body = f"{len(h_items)} items expiring soon — check your pantry!"

        for token_info in tokens:
            if token_info["platform"] == "expo":
                pushed = await _send_expo_notification(
                    token=token_info["token"],
                    title="🍎 Tracker — Expiry Alert",
                    body=body,
                    data={"screen": "pantry", "filter": "expiring"},
                )
                if pushed:
                    total_pushed += 1

    return {"households_notified": len(by_household), "total_pushed": total_pushed}


async def save_in_app_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    body: str,
    notification_type: str = "info",
    meta: dict | None = None,
) -> None:
    """Save a notification record to the DB for in-app display."""
    db.add(Notification(
        user_id=uuid.UUID(user_id),
        title=title,
        body=body,
        type=notification_type,
        meta=meta or {},
    ))
    await db.commit()


async def get_notifications(db: AsyncSession, user_id: str, unread_only: bool = False) -> list[dict]:
    filters = [Notification.user_id == uuid.UUID(user_id)]
    if unread_only:
        filters.append(Notification.is_read == False)

    result = await db.execute(
        select(Notification)
        .where(and_(*filters))
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    rows = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "title": r.title,
            "body": r.body,
            "type": r.type,
            "is_read": r.is_read,
            "created_at": r.created_at.isoformat(),
            "meta": r.meta if isinstance(r.meta, dict) else {},
        }
        for r in rows
    ]


async def mark_read(db: AsyncSession, user_id: str, notification_id: str | None = None) -> None:
    """Mark one or all notifications as read for the user."""
    if notification_id:
        await db.execute(
            update(Notification)
            .where(and_(Notification.id == uuid.UUID(notification_id), Notification.user_id == uuid.UUID(user_id)))
            .values(is_read=True)
        )
    else:
        await db.execute(
            update(Notification)
            .where(Notification.user_id == uuid.UUID(user_id))
            .values(is_read=True)
        )
    await db.commit()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _send_expo_notification(
    token: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    """Send a single push notification via Expo's push API. Returns True on success."""
    if not token.startswith("ExponentPushToken["):
        return False
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "data": data or {},
        "sound": "default",
        "priority": "high",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            result = resp.json()
            ticket = result.get("data", {})
            return ticket.get("status") == "ok"
    except Exception:
        return False
