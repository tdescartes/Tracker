"""
Plaid router — Phase 3
POST /api/plaid/link-token              → create Plaid Link token
POST /api/plaid/exchange-token          → exchange public token for access token
GET  /api/plaid/accounts                → list linked accounts
POST /api/plaid/sync                    → pull latest transactions from Plaid
GET  /api/plaid/linked-items            → list all linked bank integrations
DELETE /api/plaid/items/{item_id}       → unlink a bank account
"""
from fastapi import APIRouter, Depends, Body, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import uuid

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.plaid_service import get_plaid_service
from app.config import settings

router = APIRouter()


def _require_plaid():
    svc = get_plaid_service(settings)
    if not svc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to .env",
        )
    return svc


class ExchangeTokenRequest(BaseModel):
    public_token: str
    account_name: str | None = None


@router.post("/link-token")
async def create_link_token(
    current_user: User = Depends(get_current_user),
):
    """
    Create a Plaid Link token. The front-end uses this to open the Plaid Link widget.
    """
    svc = _require_plaid()
    result = await svc.create_link_token(str(current_user.id))
    return {"link_token": result.get("link_token"), "expiration": result.get("expiration")}


@router.post("/exchange-token")
async def exchange_public_token(
    payload: ExchangeTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exchange the Plaid Link public_token for a permanent access_token.
    Saves the linked account to the DB.
    """
    svc = _require_plaid()
    result = await svc.exchange_public_token(payload.public_token)
    access_token = result.get("access_token")
    item_id = result.get("item_id")

    if not access_token or not item_id:
        raise HTTPException(status_code=400, detail="Plaid token exchange failed")

    institution_name = await svc.get_institution_name(item_id, access_token)

    # Save linked item to DB
    await db.execute(
        text("""
            INSERT INTO plaid_items (id, user_id, item_id, access_token, institution_name, account_name)
            VALUES (:id, :user_id, :item_id, :access_token, :institution_name, :account_name)
            ON CONFLICT (item_id) DO UPDATE
                SET access_token = EXCLUDED.access_token,
                    institution_name = EXCLUDED.institution_name,
                    updated_at = NOW()
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": str(current_user.id),
            "item_id": item_id,
            "access_token": access_token,
            "institution_name": institution_name,
            "account_name": payload.account_name or institution_name,
        },
    )
    await db.commit()

    return {
        "item_id": item_id,
        "institution_name": institution_name,
        "status": "linked",
    }


@router.get("/linked-items")
async def list_linked_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all bank accounts linked via Plaid for this user."""
    result = await db.execute(
        text("""
            SELECT id, item_id, institution_name, account_name, created_at, last_synced_at
            FROM plaid_items
            WHERE user_id = :uid
            ORDER BY created_at DESC
        """),
        {"uid": str(current_user.id)},
    )
    rows = result.fetchall()
    return {
        "items": [
            {
                "id": str(r.id),
                "item_id": r.item_id,
                "institution_name": r.institution_name,
                "account_name": r.account_name,
                "linked_at": r.created_at.isoformat() if r.created_at else None,
                "last_synced_at": r.last_synced_at.isoformat() if r.last_synced_at else None,
            }
            for r in rows
        ]
    }


@router.post("/sync")
async def sync_transactions(
    item_id: str = Body(..., embed=True),
    days_back: int = Body(default=30, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pull latest transactions from Plaid for a linked account and save to bank_transactions.
    """
    svc = _require_plaid()

    # Get access token
    result = await db.execute(
        text("SELECT access_token FROM plaid_items WHERE item_id = :iid AND user_id = :uid"),
        {"iid": item_id, "uid": str(current_user.id)},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Linked account not found")

    transactions = await svc.sync_transactions(row.access_token, days_back=days_back)

    inserted = 0
    for tx in transactions:
        is_sub = _detect_subscription(tx["description"])
        await db.execute(
            text("""
                INSERT INTO bank_transactions
                    (id, household_id, transaction_date, description, amount, is_income,
                     is_subscription, category, raw_description, source, plaid_transaction_id)
                VALUES
                    (:id, :hid, :date, :desc, :amount, :is_income, :is_sub,
                     :category, :raw_desc, 'plaid', :plaid_id)
                ON CONFLICT (plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL
                DO NOTHING
            """),
            {
                "id": str(uuid.uuid4()),
                "hid": str(current_user.household_id),
                "date": tx["date"],
                "desc": tx["description"],
                "amount": tx["amount"],
                "is_income": tx["is_income"],
                "is_sub": is_sub,
                "category": tx.get("category", "Uncategorized"),
                "raw_desc": tx.get("merchant_name", ""),
                "plaid_id": tx.get("plaid_transaction_id"),
            },
        )
        inserted += 1

    await db.commit()

    # Update last_synced_at
    await db.execute(
        text("UPDATE plaid_items SET last_synced_at = NOW() WHERE item_id = :iid"),
        {"iid": item_id},
    )
    await db.commit()

    return {"synced": inserted, "item_id": item_id}


@router.delete("/items/{item_id}", status_code=204)
async def unlink_account(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unlink a Plaid-connected bank account."""
    result = await db.execute(
        text("DELETE FROM plaid_items WHERE id = :id AND user_id = :uid RETURNING id"),
        {"id": item_id, "uid": str(current_user.id)},
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Linked account not found")
    await db.commit()


SUBSCRIPTION_KEYWORDS = [
    "netflix", "spotify", "hulu", "disney", "amazon prime", "apple", "google play",
    "youtube", "hbo", "peacock", "paramount", "adobe", "dropbox", "icloud",
    "planet fitness", "gym", "duolingo", "linkedin", "chegg",
]


def _detect_subscription(description: str) -> bool:
    lower = description.lower()
    return any(k in lower for k in SUBSCRIPTION_KEYWORDS)
