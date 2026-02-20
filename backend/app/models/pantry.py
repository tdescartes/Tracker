import uuid
import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, ForeignKey, DateTime, Date, Numeric, Enum, func, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PantryStatus(str, enum.Enum):
    UNOPENED = "UNOPENED"
    OPENED = "OPENED"
    CONSUMED = "CONSUMED"
    TRASHED = "TRASHED"


class PantryLocation(str, enum.Enum):
    FRIDGE = "FRIDGE"
    FREEZER = "FREEZER"
    PANTRY = "PANTRY"


class PantryItem(Base):
    __tablename__ = "pantry_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("households.id"), nullable=False)
    receipt_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("receipts.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[str | None] = mapped_column(String(100))  # Dairy, Produce, Snacks…
    location: Mapped[PantryLocation] = mapped_column(Enum(PantryLocation), default=PantryLocation.PANTRY)

    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=1.0)
    unit: Mapped[str | None] = mapped_column(String(50))  # kg, lbs, box, liter…

    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    purchase_date: Mapped[date | None] = mapped_column(Date)
    expiration_date: Mapped[date | None] = mapped_column(Date)
    opened_date: Mapped[date | None] = mapped_column(Date)       # Triggers shorter expiry window

    status: Mapped[PantryStatus] = mapped_column(Enum(PantryStatus), default=PantryStatus.UNOPENED)
    on_shopping_list: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    household: Mapped["Household"] = relationship("Household", back_populates="pantry_items")
    receipt: Mapped["Receipt | None"] = relationship("Receipt", back_populates="pantry_items")


class ProductCatalog(Base):
    """Shared master product database — grows as users scan more items."""
    __tablename__ = "product_catalog"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    default_category: Mapped[str | None] = mapped_column(String(100))
    avg_shelf_life_days: Mapped[int] = mapped_column(Integer, default=30)
    opened_shelf_life_days: Mapped[int | None] = mapped_column(Integer)  # e.g., salsa: 14 days once opened
