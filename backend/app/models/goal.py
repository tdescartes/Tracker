import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, ForeignKey, DateTime, Date, Numeric, Boolean, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("households.id"), nullable=False)

    goal_name: Mapped[str] = mapped_column(String(255), nullable=False)  # "Toyota Camry"
    target_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    saved_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    monthly_contribution: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    deadline: Mapped[date | None] = mapped_column(Date)

    # Loan scenario
    is_loan: Mapped[bool] = mapped_column(Boolean, default=False)
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))   # 5.25
    loan_term_months: Mapped[int | None]

    # Optional: link to a budget category to show "if you cut this…" insight
    linked_category: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    household: Mapped["Household"] = relationship("Household", back_populates="goals")


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("households.id"), nullable=False)

    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))

    is_subscription: Mapped[bool] = mapped_column(Boolean, default=False)
    is_income: Mapped[bool] = mapped_column(Boolean, default=False)
    linked_receipt_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("receipts.id"), nullable=True)

    raw_description: Mapped[str | None] = mapped_column(Text)  # Original text from PDF
    source: Mapped[str] = mapped_column(String(20), default="upload")  # upload | plaid | manual
    plaid_transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    household: Mapped["Household"] = relationship("Household", back_populates="bank_transactions")
