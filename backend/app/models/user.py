import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Household(Base):
    __tablename__ = "households"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    users: Mapped[list["User"]] = relationship("User", back_populates="household")
    receipts: Mapped[list["Receipt"]] = relationship("Receipt", back_populates="household")
    pantry_items: Mapped[list["PantryItem"]] = relationship("PantryItem", back_populates="household")
    goals: Mapped[list["FinancialGoal"]] = relationship("FinancialGoal", back_populates="household")
    bank_transactions: Mapped[list["BankTransaction"]] = relationship("BankTransaction", back_populates="household")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("households.id"), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    household: Mapped["Household | None"] = relationship("Household", back_populates="users")
