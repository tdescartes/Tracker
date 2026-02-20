"""
Notification Service — Phase 2
Handles push notifications for web (Web Push / browser) and mobile (Expo Push).
Stores device tokens in the DB and fires notifications for expiring pantry items.
"""
import httpx
import json
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def register_token(db: AsyncSession, user_id: str, token: str, platform: str) -> None:
    """
    Upsert a push notification token for a user.
    platform: 'expo' | 'web'
    """
    await db.execute(
        text("""
            INSERT INTO push_notification_tokens (user_id, token, platform)
            VALUES (:user_id, :token, :platform)
            ON CONFLICT (token) DO UPDATE
                SET user_id = EXCLUDED.user_id,
                    platform = EXCLUDED.platform,
                    updated_at = NOW()
        """),
        {"user_id": user_id, "token": token, "platform": platform},
    )
    await db.commit()


async def unregister_token(db: AsyncSession, token: str) -> None:
    await db.execute(
        text("DELETE FROM push_notification_tokens WHERE token = :token"),
        {"token": token},
    )
    await db.commit()


async def get_tokens_for_user(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(
        text("SELECT token, platform FROM push_notification_tokens WHERE user_id = :uid"),
        {"uid": user_id},
    )
    return [{"token": r.token, "platform": r.platform} for r in result.fetchall()]


async def get_tokens_for_household(db: AsyncSession, household_id: str) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT pnt.token, pnt.platform
            FROM push_notification_tokens pnt
            JOIN users u ON u.id = pnt.user_id
            WHERE u.household_id = :hid
        """),
        {"hid": household_id},
    )
    return [{"token": r.token, "platform": r.platform} for r in result.fetchall()]


async def send_expiry_notifications(db: AsyncSession, days_ahead: int = 3) -> dict:
    """
    Find all pantry items expiring within `days_ahead` days and send push
    notifications to all household members.
    Returns a summary of notifications sent.
    """
    cutoff = date.today() + timedelta(days=days_ahead)

    # Find expiring items grouped by household
    result = await db.execute(
        text("""
            SELECT pi.name, pi.expiry_date, pi.quantity, pi.unit,
                   u.household_id
            FROM pantry_items pi
            JOIN users u ON u.id = pi.added_by_user_id
            WHERE pi.status IN ('UNOPENED', 'OPENED')
              AND pi.expiry_date IS NOT NULL
              AND pi.expiry_date <= :cutoff
            ORDER BY u.household_id, pi.expiry_date
        """),
        {"cutoff": cutoff},
    )
    rows = result.fetchall()

    if not rows:
        return {"households_notified": 0, "total_pushed": 0}

    # Group by household
    from collections import defaultdict
    by_household: dict = defaultdict(list)
    for r in rows:
        by_household[r.household_id].append(r)

    total_pushed = 0
    for household_id, items in by_household.items():
        tokens = await get_tokens_for_household(db, household_id)
        if not tokens:
            continue

        # Build message
        if len(items) == 1:
            item = items[0]
            days_left = (item.expiry_date - date.today()).days
            body = f"{item.name} expires {'today' if days_left == 0 else f'in {days_left} day(s)'}!"
        else:
            body = f"{len(items)} items expiring soon — check your pantry!"

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
    await db.execute(
        text("""
            INSERT INTO notifications (user_id, title, body, type, meta)
            VALUES (:user_id, :title, :body, :type, :meta)
        """),
        {
            "user_id": user_id,
            "title": title,
            "body": body,
            "type": notification_type,
            "meta": json.dumps(meta or {}),
        },
    )
    await db.commit()


async def get_notifications(db: AsyncSession, user_id: str, unread_only: bool = False) -> list[dict]:
    sql = """
        SELECT id, title, body, type, is_read, created_at, meta
        FROM notifications
        WHERE user_id = :uid
    """
    if unread_only:
        sql += " AND is_read = FALSE"
    sql += " ORDER BY created_at DESC LIMIT 50"

    result = await db.execute(text(sql), {"uid": user_id})
    rows = result.fetchall()
    return [
        {
            "id": str(r.id),
            "title": r.title,
            "body": r.body,
            "type": r.type,
            "is_read": r.is_read,
            "created_at": r.created_at.isoformat(),
            "meta": r.meta if isinstance(r.meta, dict) else json.loads(r.meta or "{}"),
        }
        for r in rows
    ]


async def mark_read(db: AsyncSession, user_id: str, notification_id: str | None = None) -> None:
    """Mark one or all notifications as read for the user."""
    if notification_id:
        await db.execute(
            text("UPDATE notifications SET is_read = TRUE WHERE id = :id AND user_id = :uid"),
            {"id": notification_id, "uid": user_id},
        )
    else:
        await db.execute(
            text("UPDATE notifications SET is_read = TRUE WHERE user_id = :uid"),
            {"uid": user_id},
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
