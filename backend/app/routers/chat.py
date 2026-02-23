"""
AI Chat endpoint — ask anything about spending, pantry, or goals.
Uses Gemini to answer with household context.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, func, and_

from app.database import get_db
from app.models.user import User, Household
from app.models.pantry import PantryItem, PantryStatus
from app.models.receipt import Receipt
from app.models.goal import FinancialGoal, BankTransaction
from app.routers.auth import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Lazy Gemini singleton ─────────────────────────────────────
_gemini_model = None


def _get_gemini_model():
    global _gemini_model
    if _gemini_model is None:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_API_MODEL)
    return _gemini_model


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


async def _build_household_context(db: AsyncSession, household_id) -> str:
    """Build a summary of the household's data for the AI to use as context."""
    today = date.today()
    year, month = today.year, today.month

    # Household budget limit
    h_result = await db.execute(select(Household).where(Household.id == household_id))
    household = h_result.scalar_one_or_none()
    budget_limit = float(household.budget_limit) if household else 600.0

    # Pantry summary — ACTIVE = UNOPENED or OPENED
    active_filter = PantryItem.status.in_([PantryStatus.UNOPENED, PantryStatus.OPENED])
    pantry_result = await db.execute(
        select(
            func.count(),
            func.count().filter(active_filter),
        ).where(PantryItem.household_id == household_id)
    )
    total_items, active_items = pantry_result.one()

    # Expiring soon (use correct column name: expiration_date)
    expiring = await db.execute(
        select(PantryItem.name, PantryItem.expiration_date)
        .where(and_(
            PantryItem.household_id == household_id,
            active_filter,
            PantryItem.expiration_date != None,
            PantryItem.expiration_date <= today + timedelta(days=3),
            PantryItem.expiration_date >= today,
        ))
        .limit(10)
    )
    expiring_items = [f"{r[0]} (expires {r[1]})" for r in expiring]

    # Budget: receipts this month
    receipt_total = await db.execute(
        select(func.coalesce(func.sum(Receipt.total_amount), 0))
        .where(and_(
            Receipt.household_id == household_id,
            extract("year", Receipt.purchase_date) == year,
            extract("month", Receipt.purchase_date) == month,
        ))
    )
    month_receipt_spend = float(receipt_total.scalar() or 0)

    # Bank transactions this month
    bank_result = await db.execute(
        select(
            func.coalesce(func.sum(BankTransaction.amount).filter(BankTransaction.is_income == True), 0),
            func.coalesce(func.sum(BankTransaction.amount).filter(BankTransaction.is_income == False), 0),
        ).where(and_(
            BankTransaction.household_id == household_id,
            extract("year", BankTransaction.transaction_date) == year,
            extract("month", BankTransaction.transaction_date) == month,
        ))
    )
    income, expenses = bank_result.one()
    income, expenses = float(income or 0), float(expenses or 0)

    # Goals
    goals_result = await db.execute(
        select(FinancialGoal.goal_name, FinancialGoal.target_amount, FinancialGoal.saved_amount)
        .where(FinancialGoal.household_id == household_id)
    )
    goals_list = [f"{r[0]}: ${float(r[2]):.0f} / ${float(r[1]):.0f}" for r in goals_result]

    # Waste
    waste_result = await db.execute(
        select(func.coalesce(func.sum(PantryItem.purchase_price), 0))
        .where(and_(
            PantryItem.household_id == household_id,
            PantryItem.status == PantryStatus.TRASHED,
            extract("year", PantryItem.updated_at) == year,
            extract("month", PantryItem.updated_at) == month,
        ))
    )
    waste_cost = float(waste_result.scalar() or 0)

    # Top spending categories
    cat_result = await db.execute(
        select(PantryItem.category, func.sum(PantryItem.purchase_price))
        .where(and_(
            PantryItem.household_id == household_id,
            extract("year", PantryItem.purchase_date) == year,
            extract("month", PantryItem.purchase_date) == month,
            PantryItem.category != None,
        ))
        .group_by(PantryItem.category)
        .order_by(func.sum(PantryItem.purchase_price).desc())
        .limit(5)
    )
    top_cats = [f"{r[0]}: ${float(r[1]):.2f}" for r in cat_result]

    lines = [
        f"Date: {today}",
        f"Monthly budget limit: ${budget_limit:.2f}",
        f"Pantry: {active_items} active items out of {total_items} total",
        f"Expiring soon: {', '.join(expiring_items) if expiring_items else 'None'}",
        f"This month's receipt spending: ${month_receipt_spend:.2f}",
        f"Budget used: {month_receipt_spend / budget_limit * 100:.0f}% of limit" if budget_limit else "",
        f"Bank income this month: ${income:.2f}",
        f"Bank expenses this month: ${expenses:.2f}",
        f"Net: ${income - expenses:.2f}",
        f"Food waste cost this month: ${waste_cost:.2f}",
        f"Top spending categories: {', '.join(top_cats) if top_cats else 'No data'}",
        f"Savings goals: {'; '.join(goals_list) if goals_list else 'None set'}",
    ]
    return "\n".join(line for line in lines if line)


@router.post("/", response_model=ChatResponse)
async def chat(
    request: Request,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if not settings.GEMINI_API_KEY:
        return ChatResponse(
            reply="AI chat requires a Gemini API key. Check your insights on the dashboard for spending analysis!"
        )

    context = await _build_household_context(db, current_user.household_id)

    try:
        model = _get_gemini_model()

        prompt = f"""You are a helpful household finance assistant for a budget tracking app.
Answer the user's question based on their household data below.
Be concise (2-4 sentences max), friendly, and actionable.
If you suggest cutting spending, be specific about which category.
If you don't have enough data to answer, say so honestly.

HOUSEHOLD DATA:
{context}

USER QUESTION: {body.message}"""

        response = model.generate_content(prompt)
        reply = response.text.strip() if response.text else "I couldn't generate a response. Try asking differently!"
        return ChatResponse(reply=reply)

    except Exception as e:
        logger.error("Chat AI error: %s", e, exc_info=True)
        return ChatResponse(
            reply="Sorry, I had trouble processing that. Try asking about your spending, pantry items, or savings goals!"
        )
