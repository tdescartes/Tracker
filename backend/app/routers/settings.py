"""
Settings router — user profile, household management, password reset, data export.
"""
import uuid
import secrets
import csv
import io
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.user import User, Household
from app.models.pantry import PantryItem
from app.models.receipt import Receipt
from app.models.goal import FinancialGoal, BankTransaction
from app.routers.auth import get_current_user, hash_password, verify_password

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class HouseholdUpdate(BaseModel):
    name: str | None = None
    currency_code: str | None = None
    budget_limit: Decimal | None = None


class HouseholdOut(BaseModel):
    id: uuid.UUID
    name: str
    currency_code: str
    budget_limit: Decimal
    invite_code: str | None
    member_count: int

    model_config = {"from_attributes": True}


class JoinHouseholdRequest(BaseModel):
    invite_code: str


# ── Profile ────────────────────────────────────────────────

@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    household = None
    member_count = 0
    if current_user.household_id:
        h_result = await db.execute(select(Household).where(Household.id == current_user.household_id))
        household = h_result.scalar_one_or_none()
        if household:
            m_result = await db.execute(
                select(User).where(User.household_id == household.id)
            )
            member_count = len(m_result.scalars().all())

    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
            "created_at": current_user.created_at.isoformat(),
        },
        "household": {
            "id": str(household.id),
            "name": household.name,
            "currency_code": household.currency_code,
            "budget_limit": float(household.budget_limit),
            "invite_code": household.invite_code,
            "member_count": member_count,
        } if household else None,
    }


@router.patch("/profile")
async def update_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.email and data.email != current_user.email:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = data.email
    if data.full_name is not None:
        current_user.full_name = data.full_name
    await db.commit()
    return {"message": "Profile updated"}


@router.post("/change-password", status_code=204)
async def change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(data.new_password)
    await db.commit()


# ── Household ──────────────────────────────────────────────

@router.patch("/household")
async def update_household(
    data: HouseholdUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="Not in a household")
    result = await db.execute(select(Household).where(Household.id == current_user.household_id))
    household = result.scalar_one_or_none()
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(household, field, value)
    await db.commit()
    return {"message": "Household updated"}


@router.post("/household/generate-invite")
async def generate_invite_code(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="Not in a household")
    result = await db.execute(select(Household).where(Household.id == current_user.household_id))
    household = result.scalar_one_or_none()
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")

    household.invite_code = secrets.token_urlsafe(8)[:12].upper()
    await db.commit()
    return {"invite_code": household.invite_code}


@router.post("/household/join")
async def join_household(
    data: JoinHouseholdRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Household).where(Household.invite_code == data.invite_code.upper())
    )
    household = result.scalar_one_or_none()
    if not household:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    current_user.household_id = household.id
    await db.commit()
    return {"message": f"Joined household '{household.name}'", "household_id": str(household.id)}


@router.get("/household/members")
async def list_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="Not in a household")
    result = await db.execute(
        select(User).where(User.household_id == current_user.household_id)
    )
    members = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "email": m.email,
            "full_name": m.full_name,
            "joined": m.created_at.isoformat(),
        }
        for m in members
    ]


# ── Data Export ────────────────────────────────────────────

@router.get("/export/pantry")
async def export_pantry_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PantryItem).where(PantryItem.household_id == current_user.household_id)
    )
    items = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Category", "Location", "Quantity", "Unit", "Price", "Purchase Date", "Expiration", "Status"])
    for i in items:
        writer.writerow([
            i.name, i.category or "", i.location.value, float(i.quantity),
            i.unit or "", float(i.purchase_price or 0), str(i.purchase_date or ""),
            str(i.expiration_date or ""), i.status.value,
        ])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=pantry_export_{date.today()}.csv"},
    )


@router.get("/export/transactions")
async def export_transactions_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BankTransaction).where(BankTransaction.household_id == current_user.household_id)
    )
    txs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Amount", "Is Subscription", "Is Income"])
    for t in txs:
        writer.writerow([str(t.transaction_date), t.description, float(t.amount), t.is_subscription, t.is_income])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=transactions_export_{date.today()}.csv"},
    )
