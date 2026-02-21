from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, func, and_

from app.database import get_db
from app.models.user import User, Household
from app.models.pantry import PantryItem, PantryStatus
from app.models.receipt import Receipt
from app.schemas.receipt import BudgetSummaryOut
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/summary/{year}/{month}", response_model=BudgetSummaryOut)
async def budget_summary(
    year: int,
    month: int,
    budget_limit: Decimal | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hid = current_user.household_id

    # Use persisted household budget_limit if not overridden by query param
    if budget_limit is None:
        h_result = await db.execute(select(Household).where(Household.id == hid))
        household = h_result.scalar_one_or_none()
        budget_limit = Decimal(str(household.budget_limit)) if household else Decimal("600.00")

    # Total spent from receipts that month
    spent_result = await db.execute(
        select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(
            and_(
                Receipt.household_id == hid,
                extract("year", Receipt.purchase_date) == year,
                extract("month", Receipt.purchase_date) == month,
            )
        )
    )
    total_spent = Decimal(str(spent_result.scalar()))

    # Spending by category (from pantry items linked to receipts)
    category_result = await db.execute(
        select(PantryItem.category, func.sum(PantryItem.purchase_price)).where(
            and_(
                PantryItem.household_id == hid,
                extract("year", PantryItem.purchase_date) == year,
                extract("month", PantryItem.purchase_date) == month,
                PantryItem.category != None,
            )
        ).group_by(PantryItem.category)
    )
    by_category = {row[0]: Decimal(str(row[1] or 0)) for row in category_result}

    # Waste cost: trashed items that month
    waste_result = await db.execute(
        select(func.coalesce(func.sum(PantryItem.purchase_price), 0)).where(
            and_(
                PantryItem.household_id == hid,
                PantryItem.status == PantryStatus.TRASHED,
                extract("year", PantryItem.updated_at) == year,
                extract("month", PantryItem.updated_at) == month,
            )
        )
    )
    waste_cost = Decimal(str(waste_result.scalar()))

    return BudgetSummaryOut(
        month=f"{year}-{month:02d}",
        total_spent=total_spent,
        budget_limit=budget_limit,
        remaining=budget_limit - total_spent,
        by_category=by_category,
        waste_cost=waste_cost,
    )


@router.get("/inflation/{item_name}")
async def inflation_tracker(
    item_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns price history for a specific item across all scanned receipts."""
    result = await db.execute(
        select(
            PantryItem.purchase_date,
            func.avg(PantryItem.purchase_price).label("avg_price"),
        ).where(
            and_(
                PantryItem.household_id == current_user.household_id,
                PantryItem.name.ilike(f"%{item_name}%"),
                PantryItem.purchase_price != None,
            )
        ).group_by(PantryItem.purchase_date)
        .order_by(PantryItem.purchase_date)
    )
    rows = result.all()
    return [{"date": str(r[0]), "avg_price": float(r[1])} for r in rows]
