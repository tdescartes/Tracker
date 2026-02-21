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
    budget_limit: Decimal
    remaining: Decimal
    by_category: dict[str, Decimal]  # {"Produce": 45.00, "Snacks": 22.50}
    waste_cost: Decimal              # Total value of trashed items


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
