"""
Financial Goal Calculator
Computes:
  A. Cash strategy — months to save up and buy outright
  B. Loan strategy — monthly amortized payment and total interest
  C. Insight — "cut $50/mo from snacks and get it 3 months sooner"
"""
import math
from datetime import date
from decimal import Decimal


def calculate_goal(
    target_price: float,
    down_payment: float,
    monthly_contribution: float,
    loan_interest_rate: float = 0.0,
    loan_term_months: int = 0,
    cut_amount: float = 50.0,
) -> dict:
    amount_needed = target_price - down_payment

    # ── Cash Strategy ──────────────────────────────────────
    if monthly_contribution > 0:
        months_to_save = math.ceil(amount_needed / monthly_contribution)
    else:
        months_to_save = None

    completion_date = None
    if months_to_save is not None:
        today = date.today()
        total_months = today.month - 1 + months_to_save
        completion_date = date(today.year + total_months // 12, total_months % 12 + 1, 1)

    # ── Loan Strategy ──────────────────────────────────────
    monthly_payment = Decimal("0.00")
    total_interest = Decimal("0.00")

    if loan_interest_rate > 0 and loan_term_months > 0:
        r = (loan_interest_rate / 100) / 12
        n = loan_term_months
        principal = amount_needed
        monthly_payment = Decimal(str(
            principal * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
        )).quantize(Decimal("0.01"))
        total_interest = (monthly_payment * n - Decimal(str(amount_needed))).quantize(Decimal("0.01"))

    # ── Savings Insight ────────────────────────────────────
    insight = None
    if months_to_save is not None and monthly_contribution > 0:
        accelerated = monthly_contribution + cut_amount
        accelerated_months = math.ceil(amount_needed / accelerated)
        time_saved = months_to_save - accelerated_months
        if time_saved > 0:
            insight = (
                f"If you save an extra ${cut_amount:.0f}/month "
                f"(e.g. by cutting snacks or subscriptions), "
                f"you'll reach your goal {time_saved} month{'s' if time_saved > 1 else ''} sooner."
            )

    return {
        "cash_strategy": {"months_to_wait": months_to_save, "completion_date": completion_date},
        "loan_strategy": {"monthly_payment": monthly_payment, "total_interest": total_interest},
        "insight": insight,
    }
