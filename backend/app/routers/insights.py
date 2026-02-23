"""Contextual AI nudges — lightweight SQL-based insights placed on relevant screens."""
import calendar
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, func, and_

from app.database import get_db
from app.models.user import User
from app.models.pantry import PantryItem, PantryStatus
from app.models.goal import BankTransaction, FinancialGoal
from app.models.receipt import Receipt
from app.schemas.receipt import InsightOut
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=list[InsightOut])
async def get_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hid = current_user.household_id
    today = date.today()
    year, month = today.year, today.month
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    insights: list[InsightOut] = []

    # ── 1. Budget pace ───────────────────────────────────────────
    try:
        spent_r = await db.execute(
            select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(and_(
                Receipt.household_id == hid,
                extract("year", Receipt.purchase_date) == year,
                extract("month", Receipt.purchase_date) == month,
            ))
        )
        confirmed = Decimal(str(spent_r.scalar()))

        est_r = await db.execute(
            select(func.coalesce(func.sum(BankTransaction.amount), 0)).where(and_(
                BankTransaction.household_id == hid,
                extract("year", BankTransaction.transaction_date) == year,
                extract("month", BankTransaction.transaction_date) == month,
                BankTransaction.is_income == False,
                BankTransaction.linked_receipt_id == None,
            ))
        )
        estimated = Decimal(str(est_r.scalar()))
        total = confirmed + estimated
        days_in = calendar.monthrange(year, month)[1]
        days_elapsed = max(today.day, 1)
        daily = total / days_elapsed
        projected = daily * days_in

        from app.models.user import Household
        h_r = await db.execute(select(Household).where(Household.id == hid))
        hh = h_r.scalar_one_or_none()
        limit = Decimal(str(hh.budget_limit)) if hh and hh.budget_limit else Decimal("600")

        pct = (total / limit * 100) if limit else Decimal("0")
        if pct >= Decimal("100"):
            insights.append(InsightOut(
                screen="budget", type="warning", priority=10,
                title="Over budget",
                body=f"You've spent ${total:.0f} of ${limit:.0f} — {pct:.0f}% used with {days_in - days_elapsed} days left.",
            ))
        elif pct >= Decimal("80"):
            insights.append(InsightOut(
                screen="budget", type="warning", priority=8,
                title="Budget running hot",
                body=f"${total:.0f} of ${limit:.0f} spent ({pct:.0f}%). At this pace you'll hit ${projected:.0f} by month-end.",
            ))
        elif total > 0:
            insights.append(InsightOut(
                screen="budget", type="info", priority=3,
                title="On track",
                body=f"${total:.0f} of ${limit:.0f} spent — ${daily:.0f}/day, projecting ${projected:.0f} by month-end.",
            ))
    except Exception:
        pass

    # ── 2. Category spending vs last month ───────────────────────
    try:
        cur_cats = await db.execute(
            select(BankTransaction.category, func.sum(BankTransaction.amount)).where(and_(
                BankTransaction.household_id == hid,
                extract("year", BankTransaction.transaction_date) == year,
                extract("month", BankTransaction.transaction_date) == month,
                BankTransaction.is_income == False,
            )).group_by(BankTransaction.category)
        )
        cur_map = {(r[0] or "Other"): Decimal(str(r[1])) for r in cur_cats}

        prev_cats = await db.execute(
            select(BankTransaction.category, func.sum(BankTransaction.amount)).where(and_(
                BankTransaction.household_id == hid,
                extract("year", BankTransaction.transaction_date) == prev_year,
                extract("month", BankTransaction.transaction_date) == prev_month,
                BankTransaction.is_income == False,
            )).group_by(BankTransaction.category)
        )
        prev_map = {(r[0] or "Other"): Decimal(str(r[1])) for r in prev_cats}

        for cat, amt in cur_map.items():
            prev_amt = prev_map.get(cat, Decimal("0"))
            if prev_amt > 0:
                change_pct = ((amt - prev_amt) / prev_amt * 100)
                if change_pct >= 15:
                    insights.append(InsightOut(
                        screen="budget", type="tip", priority=6,
                        title=f"{cat} spending up",
                        body=f"{cat} is up {change_pct:.0f}% vs last month (${prev_amt:.0f} → ${amt:.0f}).",
                    ))
    except Exception:
        pass

    # ── 3. Expiring items (pantry) ───────────────────────────────
    try:
        three_days = today + timedelta(days=3)
        exp_r = await db.execute(
            select(
                func.count(),
                func.coalesce(func.sum(PantryItem.purchase_price), 0),
            ).where(and_(
                PantryItem.household_id == hid,
                PantryItem.status.in_([PantryStatus.UNOPENED, PantryStatus.OPENED]),
                PantryItem.expiration_date != None,
                PantryItem.expiration_date <= three_days,
                PantryItem.expiration_date >= today,
            ))
        )
        row = exp_r.one()
        count, value = int(row[0]), Decimal(str(row[1]))
        if count > 0:
            insights.append(InsightOut(
                screen="pantry", type="warning", priority=9,
                title=f"{count} item{'s' if count > 1 else ''} expiring soon",
                body=f"Worth ${value:.2f} — use them before they go to waste.",
            ))
    except Exception:
        pass

    # ── 4. Waste cost this month ─────────────────────────────────
    try:
        waste_r = await db.execute(
            select(func.coalesce(func.sum(PantryItem.purchase_price), 0)).where(and_(
                PantryItem.household_id == hid,
                PantryItem.status == PantryStatus.TRASHED,
                extract("year", PantryItem.updated_at) == year,
                extract("month", PantryItem.updated_at) == month,
            ))
        )
        waste = Decimal(str(waste_r.scalar()))
        if waste > 0:
            insights.append(InsightOut(
                screen="home", type="tip", priority=7,
                title="Food waste this month",
                body=f"${waste:.2f} in trashed items. That's about ${waste * 12:.0f}/year.",
            ))
    except Exception:
        pass

    # ── 5. Surplus → Goals ───────────────────────────────────────
    try:
        inc_r = await db.execute(
            select(func.coalesce(func.sum(BankTransaction.amount), 0)).where(and_(
                BankTransaction.household_id == hid,
                extract("year", BankTransaction.transaction_date) == year,
                extract("month", BankTransaction.transaction_date) == month,
                BankTransaction.is_income == True,
            ))
        )
        income = Decimal(str(inc_r.scalar()))
        exp_r2 = await db.execute(
            select(func.coalesce(func.sum(BankTransaction.amount), 0)).where(and_(
                BankTransaction.household_id == hid,
                extract("year", BankTransaction.transaction_date) == year,
                extract("month", BankTransaction.transaction_date) == month,
                BankTransaction.is_income == False,
            ))
        )
        expenses = Decimal(str(exp_r2.scalar()))
        surplus = income - expenses

        if surplus > 0:
            # Check if they have any goals
            goal_r = await db.execute(
                select(func.count()).select_from(FinancialGoal)
                .where(FinancialGoal.household_id == hid)
            )
            goal_count = goal_r.scalar()
            if goal_count and goal_count > 0:
                insights.append(InsightOut(
                    screen="goals", type="tip", priority=5,
                    title=f"${surplus:.0f} surplus this month",
                    body=f"You have ${surplus:.0f} left over. Consider allocating it toward your goals.",
                ))
            else:
                insights.append(InsightOut(
                    screen="home", type="info", priority=4,
                    title=f"${surplus:.0f} surplus",
                    body=f"You earned ${income:.0f} and spent ${expenses:.0f}. Set a savings goal to put the surplus to work.",
                ))
    except Exception:
        pass

    # ── 6. Subscription total ────────────────────────────────────
    try:
        sub_r = await db.execute(
            select(func.coalesce(func.sum(BankTransaction.amount), 0)).where(and_(
                BankTransaction.household_id == hid,
                BankTransaction.is_subscription == True,
                extract("year", BankTransaction.transaction_date) == year,
                extract("month", BankTransaction.transaction_date) == month,
            ))
        )
        sub_total = Decimal(str(sub_r.scalar()))
        if sub_total > 20:
            insights.append(InsightOut(
                screen="home", type="info", priority=4,
                title="Subscriptions",
                body=f"${sub_total:.0f}/mo in recurring charges — that's ${sub_total * 12:.0f}/year.",
            ))
    except Exception:
        pass

    # Sort by priority descending (most important first)
    insights.sort(key=lambda i: i.priority, reverse=True)
    return insights
