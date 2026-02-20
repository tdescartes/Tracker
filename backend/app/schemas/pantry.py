import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel
from app.models.pantry import PantryStatus, PantryLocation


class PantryItemCreate(BaseModel):
    name: str
    brand: str | None = None
    category: str | None = None
    location: PantryLocation = PantryLocation.PANTRY
    quantity: Decimal = Decimal("1.0")
    unit: str | None = None
    purchase_price: Decimal | None = None
    purchase_date: date | None = None
    expiration_date: date | None = None


class PantryItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    location: PantryLocation | None = None
    quantity: Decimal | None = None
    status: PantryStatus | None = None
    expiration_date: date | None = None
    opened_date: date | None = None
    on_shopping_list: bool | None = None


class PantryItemOut(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    receipt_id: uuid.UUID | None
    name: str
    brand: str | None
    category: str | None
    location: PantryLocation
    quantity: Decimal
    unit: str | None
    purchase_price: Decimal | None
    purchase_date: date | None
    expiration_date: date | None
    opened_date: date | None
    status: PantryStatus
    on_shopping_list: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
