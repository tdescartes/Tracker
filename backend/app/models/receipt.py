import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, ForeignKey, DateTime, Date, Numeric, Text, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("households.id"), nullable=False)
    uploader_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    merchant_name: Mapped[str | None] = mapped_column(String(255))
    total_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    purchase_date: Mapped[date | None] = mapped_column(Date)

    raw_ocr_text: Mapped[str | None] = mapped_column(Text)      # Raw OCR output — useful for debugging
    is_reconciled: Mapped[bool] = mapped_column(Boolean, default=False)  # Matched to bank statement?
    processing_status: Mapped[str] = mapped_column(String(50), default="PENDING")
    # PENDING | PROCESSING | DONE | FAILED

    scanned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    household: Mapped["Household"] = relationship("Household", back_populates="receipts")
    pantry_items: Mapped[list["PantryItem"]] = relationship("PantryItem", back_populates="receipt")
