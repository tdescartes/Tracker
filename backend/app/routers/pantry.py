import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models.user import User
from app.models.pantry import PantryItem, PantryStatus
from app.schemas.pantry import PantryItemCreate, PantryItemUpdate, PantryItemOut
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=list[PantryItemOut])
async def get_pantry(
    location: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = [PantryItem.household_id == current_user.household_id]
    if location:
        filters.append(PantryItem.location == location.upper())
    if status:
        filters.append(PantryItem.status == status.upper())
    else:
        # Default: exclude consumed/trashed
        filters.append(PantryItem.status.in_([PantryStatus.UNOPENED, PantryStatus.OPENED]))

    result = await db.execute(
        select(PantryItem).where(and_(*filters)).order_by(PantryItem.expiration_date.asc().nulls_last())
    )
    return [PantryItemOut.model_validate(i) for i in result.scalars()]


@router.get("/expiring-soon", response_model=list[PantryItemOut])
async def expiring_soon(
    days: int = 3,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    threshold = date.today() + timedelta(days=days)
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.household_id == current_user.household_id,
                PantryItem.expiration_date != None,
                PantryItem.expiration_date <= threshold,
                PantryItem.status.in_([PantryStatus.UNOPENED, PantryStatus.OPENED]),
            )
        ).order_by(PantryItem.expiration_date.asc())
    )
    return [PantryItemOut.model_validate(i) for i in result.scalars()]


@router.get("/shopping-list", response_model=list[PantryItemOut])
async def shopping_list(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.household_id == current_user.household_id,
                PantryItem.on_shopping_list == True,
            )
        )
    )
    return [PantryItemOut.model_validate(i) for i in result.scalars()]


@router.post("/", response_model=PantryItemOut, status_code=status.HTTP_201_CREATED)
async def add_item(
    data: PantryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = PantryItem(household_id=current_user.household_id, **data.model_dump())
    db.add(item)
    await db.flush()
    return PantryItemOut.model_validate(item)


@router.patch("/{item_id}", response_model=PantryItemOut)
async def update_item(
    item_id: uuid.UUID,
    data: PantryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PantryItem).where(PantryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item or item.household_id != current_user.household_id:
        raise HTTPException(status_code=404, detail="Item not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(item, field, value)

    # When item is consumed/trashed → ask to add to shopping list
    if data.status in (PantryStatus.CONSUMED, PantryStatus.TRASHED):
        item.on_shopping_list = True

    return PantryItemOut.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PantryItem).where(PantryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item or item.household_id != current_user.household_id:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
