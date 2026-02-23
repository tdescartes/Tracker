import calendar
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, func, and_

from app.database import get_db
from app.models.user import User, Household
from app.models.pantry import PantryItem, PantryStatus
from app.models.receipt import Receipt
from app.models.goal import BankTransaction
from app.schemas.receipt import BudgetSummaryOut, ReportCardOut, SurplusOut
from app.routers.auth import get_current_user

router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────
async def _month_income_expenses(db: AsyncSession, hid, year: int, month: int):
    """Return (income, expenses) from bank_transactions for a given month."""
    base = and_(
        BankTransaction.household_id == hid,
        extract("year", BankTransaction.transaction_date) == year,
        extract("month", BankTransaction.transaction_date) == month,
    )
    inc = await db.execute(
        select(func.coalesce(func.sum(BankTransaction.amount), 0))
        .where(and_(base, BankTransaction.is_income == True))
    )
    exp = await db.execute(
        select(func.coalesce(func.sum(BankTransaction.amount), 0))
        .where(and_(base, BankTransaction.is_income == False))
    )
    return Decimal(str(inc.scalar())), Decimal(str(exp.scalar()))


async def _category_sums(db: AsyncSession, hid, year: int, month: int):
    """Return bank-transaction spending grouped by category."""
    result = await db.execute(
        select(BankTransaction.category, func.sum(BankTransaction.amount))
        .where(and_(
            BankTransaction.household_id == hid,
            extract("year", BankTransaction.transaction_date) == year,
            extract("month", BankTransaction.transaction_date) == month,
            BankTransaction.is_income == False,
        ))
        .group_by(BankTransaction.category)
    )
    return {(row[0] or "Uncategorized"): Decimal(str(row[1] or 0)) for row in result}


# ── 1. Honest budget summary ────────────────────────────────────
@router.get("/summary/{year}/{month}", response_model=BudgetSummaryOut)
async def budget_summary(
    year: int,
    month: int,
    budget_limit: Decimal | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hid = current_user.household_id

    # Household budget limit fallback
    if budget_limit is None:
        h_result = await db.execute(select(Household).where(Household.id == hid))
        household = h_result.scalar_one_or_none()
        budget_limit = Decimal(str(household.budget_limit)) if household else Decimal("600.00")

    # ── Confirmed: receipt totals ────────────────────────────────
    spent_result = await db.execute(
        select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(
            and_(
                Receipt.household_id == hid,
                extract("year", Receipt.purchase_date) == year,
                extract("month", Receipt.purchase_date) == month,
            )
        )
    )
    confirmed_spent = Decimal(str(spent_result.scalar()))

    # ── Estimated: bank transactions NOT linked to any receipt ───
    estimated_result = await db.execute(
        select(func.coalesce(func.sum(BankTransaction.amount), 0)).where(
            and_(
                BankTransaction.household_id == hid,
                extract("year", BankTransaction.transaction_date) == year,
                extract("month", BankTransaction.transaction_date) == month,
                BankTransaction.is_income == False,
                BankTransaction.linked_receipt_id == None,
            )
        )
    )
    estimated_spent = Decimal(str(estimated_result.scalar()))

    total_spent = confirmed_spent + estimated_spent

    # ── Category breakdown (pantry items from receipts) ──────────
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

    # ── Bank category breakdown (unmatched transactions) ─────────
    bank_cat = await db.execute(
        select(BankTransaction.category, func.sum(BankTransaction.amount)).where(
            and_(
                BankTransaction.household_id == hid,
                extract("year", BankTransaction.transaction_date) == year,
                extract("month", BankTransaction.transaction_date) == month,
                BankTransaction.is_income == False,
                BankTransaction.linked_receipt_id == None,
            )
        ).group_by(BankTransaction.category)
    )
    bank_category_breakdown = {(r[0] or "Uncategorized"): Decimal(str(r[1] or 0)) for r in bank_cat}

    # ── Waste cost ───────────────────────────────────────────────
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

    # ── Pace calculation ─────────────────────────────────────────
    today = date.today()
    if year == today.year and month == today.month:
        days_elapsed = max(today.day, 1)
    else:
        days_elapsed = calendar.monthrange(year, month)[1]
    days_in_month = calendar.monthrange(year, month)[1]

    daily_pace = total_spent / days_elapsed if days_elapsed else Decimal("0")
    projected = daily_pace * days_in_month
    on_track = projected <= budget_limit

    return BudgetSummaryOut(
        month=f"{year}-{month:02d}",
        total_spent=total_spent,
        confirmed_spent=confirmed_spent,
        estimated_spent=estimated_spent,
        budget_limit=budget_limit,
        remaining=budget_limit - total_spent,
        by_category=by_category,
        bank_category_breakdown=bank_category_breakdown,
        waste_cost=waste_cost,
        daily_pace=daily_pace.quantize(Decimal("0.01")),
        on_track=on_track,
    )


# ── 2. Monthly Report Card ──────────────────────────────────────
@router.get("/report-card/{year}/{month}", response_model=ReportCardOut)
async def report_card(
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hid = current_user.household_id

    # Current month aggregates
    income, expenses = await _month_income_expenses(db, hid, year, month)
    net = income - expenses
    cat_breakdown = await _category_sums(db, hid, year, month)

    # Previous month for comparison
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    _, prev_expenses = await _month_income_expenses(db, hid, prev_year, prev_month)
    prev_cats = await _category_sums(db, hid, prev_year, prev_month)

    delta = expenses - prev_expenses
    delta_pct = (delta / prev_expenses * 100) if prev_expenses else Decimal("0")

    # Biggest category increase
    biggest_cat = None
    biggest_amt = Decimal("0")
    for cat, amt in cat_breakdown.items():
        prev_amt = prev_cats.get(cat, Decimal("0"))
        increase = amt - prev_amt
        if increase > biggest_amt:
            biggest_amt = increase
            biggest_cat = cat

    # Subscriptions
    sub_result = await db.execute(
        select(
            BankTransaction.description,
            func.sum(BankTransaction.amount).label("total"),
            func.count().label("count"),
        ).where(and_(
            BankTransaction.household_id == hid,
            BankTransaction.is_subscription == True,
            extract("year", BankTransaction.transaction_date) == year,
            extract("month", BankTransaction.transaction_date) == month,
        )).group_by(BankTransaction.description)
    )
    subscriptions = []
    sub_monthly = Decimal("0")
    for row in sub_result:
        amt = Decimal(str(row[1] or 0))
        subscriptions.append({
            "description": row[0],
            "amount": float(amt),
            "months_seen": int(row[2]),
        })
        sub_monthly += amt

    return ReportCardOut(
        month=f"{year}-{month:02d}",
        income=income,
        expenses=expenses,
        net=net,
        vs_last_month_expenses=delta,
        vs_last_month_pct=delta_pct.quantize(Decimal("0.1")),
        biggest_increase_category=biggest_cat,
        biggest_increase_amount=biggest_amt,
        category_breakdown=cat_breakdown,
        subscriptions=subscriptions,
        subscription_monthly_total=sub_monthly,
        subscription_annual_total=sub_monthly * 12,
        surplus=net,
    )


# ── 3. Surplus ───────────────────────────────────────────────────
@router.get("/surplus/{year}/{month}", response_model=SurplusOut)
async def surplus(
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hid = current_user.household_id
    income, expenses = await _month_income_expenses(db, hid, year, month)
    cat_breakdown = await _category_sums(db, hid, year, month)

    # Top cuttable = biggest non-essential categories
    essentials = {"Housing", "Utilities", "Insurance", "Medical"}
    cuttable = []
    for cat, amt in sorted(cat_breakdown.items(), key=lambda x: x[1], reverse=True):
        if cat not in essentials and expenses > 0:
            cuttable.append({
                "category": cat,
                "amount": float(amt),
                "pct_of_expenses": float((amt / expenses * 100).quantize(Decimal("0.1"))),
            })
    return SurplusOut(
        month=f"{year}-{month:02d}",
        income=income,
        total_expenses=expenses,
        surplus=income - expenses,
        top_cuttable=cuttable[:5],
    )


# ── 4. Inflation tracker ────────────────────────────────────────
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
