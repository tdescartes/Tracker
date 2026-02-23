import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class ParsedReceiptItem(BaseModel):
    name: str
    price: Decimal
    category: str | None = None
    quantity: Decimal = Decimal("1.0")
    unit: str | None = None


class ReceiptOut(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    uploader_id: uuid.UUID
    image_url: str
    merchant_name: str | None
    total_amount: Decimal | None
    purchase_date: date | None
    processing_status: str
    is_reconciled: bool
    scanned_at: datetime
    items: list[ParsedReceiptItem] = []

    model_config = {"from_attributes": True}


class ReceiptConfirm(BaseModel):
    """Payload sent after user reviews and edits the OCR result."""
    merchant_name: str | None = None
    total_amount: Decimal | None = None
    purchase_date: date | None = None
    items: list[ParsedReceiptItem]


class BudgetSummaryOut(BaseModel):
    month: str          # "2026-02"
    total_spent: Decimal
    confirmed_spent: Decimal       # From scanned receipts
    estimated_spent: Decimal       # From unmatched bank transactions
    budget_limit: Decimal
    remaining: Decimal
    by_category: dict[str, Decimal]  # {"Produce": 45.00, "Snacks": 22.50}
    bank_category_breakdown: dict[str, Decimal] = {}  # From bank transactions
    waste_cost: Decimal              # Total value of trashed items
    daily_pace: Decimal = Decimal("0")     # avg spent per day so far
    on_track: bool = True                  # pace * days_in_month <= limit


class ReportCardOut(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal
    net: Decimal
    vs_last_month_expenses: Decimal       # delta in $
    vs_last_month_pct: Decimal            # delta in %
    biggest_increase_category: str | None = None
    biggest_increase_amount: Decimal = Decimal("0")
    category_breakdown: dict[str, Decimal]
    subscriptions: list[dict]             # [{description, amount, months_seen}]
    subscription_monthly_total: Decimal
    subscription_annual_total: Decimal
    surplus: Decimal


class SurplusOut(BaseModel):
    month: str
    income: Decimal
    total_expenses: Decimal
    surplus: Decimal
    top_cuttable: list[dict]  # [{category, amount, pct_of_expenses}]


class InsightOut(BaseModel):
    screen: str    # home | budget | pantry | goals
    type: str      # info | warning | tip
    title: str
    body: str
    priority: int = 0


class GoalCreate(BaseModel):
    goal_name: str
    target_amount: Decimal
    saved_amount: Decimal = Decimal("0")
    monthly_contribution: Decimal = Decimal("0")
    deadline: date | None = None
    is_loan: bool = False
    interest_rate: Decimal | None = None
    loan_term_months: int | None = None
    linked_category: str | None = None


class GoalUpdate(BaseModel):
    goal_name: str | None = None
    target_amount: Decimal | None = None
    saved_amount: Decimal | None = None
    monthly_contribution: Decimal | None = None
    deadline: date | None = None
    is_loan: bool | None = None
    interest_rate: Decimal | None = None
    loan_term_months: int | None = None
    linked_category: str | None = None


class GoalOut(GoalCreate):
    id: uuid.UUID
    household_id: uuid.UUID
    created_at: datetime
    # Computed fields returned by the calculator
    months_to_goal: int | None = None
    estimated_completion: date | None = None
    monthly_loan_payment: Decimal | None = None
    total_interest: Decimal | None = None
    insight: str | None = None

    model_config = {"from_attributes": True}
