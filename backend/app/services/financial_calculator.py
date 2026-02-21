"""
Financial Calculator — reverse-goal and loan amortization logic.
"""
import math
from datetime import date, datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta


def calculate_goal(
    target_price: float,
    down_payment: float,
    monthly_contribution: float,
    loan_interest_rate: float = 0.0,
    loan_term_months: int = 60,
    insight_cut_amount: float | None = None,
) -> dict:
    """
    Returns:
      cash_strategy:   months_to_wait, completion_date
      loan_strategy:   monthly_payment, total_interest
      insight:         plain-English suggestion
    """
    # Dynamic: suggest cutting ~15% of monthly contribution (min $25, max $200)
    if insight_cut_amount is None:
        insight_cut_amount = max(25.0, min(200.0, round(monthly_contribution * 0.15, 0))) if monthly_contribution > 0 else 50.0

    principal = max(target_price - down_payment, 0.0)

    # ── Cash Strategy ─────────────────────────────────────────
    if monthly_contribution > 0:
        months_to_wait = math.ceil(principal / monthly_contribution)
    else:
        months_to_wait = 9999  # Never if saving $0

    completion_date = _add_months(date.today(), months_to_wait) if months_to_wait < 9999 else None

    # ── Loan Strategy ─────────────────────────────────────────
    monthly_payment = Decimal("0.00")
    total_interest = Decimal("0.00")

    if loan_interest_rate > 0 and loan_term_months > 0 and principal > 0:
        r = (loan_interest_rate / 100) / 12        # Monthly rate
        n = loan_term_months
        mp = principal * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
        monthly_payment = Decimal(str(round(mp, 2)))
        total_interest = Decimal(str(round(mp * n - principal, 2)))

    # ── Insight (The "what if you cut luxuries?") ─────────────
    insight = ""
    if monthly_contribution > 0 and months_to_wait < 9999:
        accelerated = monthly_contribution + insight_cut_amount
        acc_months = math.ceil(principal / accelerated)
        time_saved = months_to_wait - acc_months
        if time_saved > 0:
            insight = (
                f"If you reduce discretionary spending by ${insight_cut_amount:.0f}/month, "
                f"you reach this goal {time_saved} month{'s' if time_saved > 1 else ''} sooner"
                + (f" — by {_add_months(date.today(), acc_months).strftime('%B %Y')}." if acc_months < 9999 else ".")
            )

    return {
        "cash_strategy": {
            "months_to_wait": months_to_wait if months_to_wait < 9999 else None,
            "completion_date": completion_date,
        },
        "loan_strategy": {
            "monthly_payment": monthly_payment,
            "total_interest": total_interest,
        },
        "insight": insight,
    }


def _add_months(d: date, months: int) -> date:
    return d + relativedelta(months=months)
