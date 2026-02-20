import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class HouseholdCreate(BaseModel):
    name: str
    currency_code: str = "USD"


class HouseholdOut(BaseModel):
    id: uuid.UUID
    name: str
    currency_code: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    household_name: str | None = None  # Creates a new household on sign up


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    household_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
