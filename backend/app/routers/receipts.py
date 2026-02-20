import uuid
import shutil
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.receipt import Receipt
from app.models.pantry import PantryItem
from app.schemas.receipt import ReceiptOut, ReceiptConfirm, ParsedReceiptItem
from app.routers.auth import get_current_user
from app.services.ocr_service import run_ocr
from app.services.receipt_parser import parse_receipt_text
from app.services.categorization_service import bulk_record_overrides, get_learned_mappings
from app.config import settings

router = APIRouter()


@router.post("/upload", response_model=ReceiptOut, status_code=status.HTTP_201_CREATED)
async def upload_receipt(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User is not in a household")

    # 1. Save image to disk (local dev) or S3 (production)
    ext = Path(file.filename).suffix if file.filename else ".jpg"
    filename = f"{uuid.uuid4()}{ext}"

    if settings.USE_LOCAL_STORAGE:
        save_path = os.path.join(settings.LOCAL_UPLOAD_DIR, filename)
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        image_url = f"/uploads/{filename}"
    else:
        # TODO: upload to S3 using boto3 — placeholder
        image_url = f"https://{settings.AWS_BUCKET_NAME}.s3.amazonaws.com/{filename}"

    # 2. Create receipt record with PENDING status
    receipt = Receipt(
        household_id=current_user.household_id,
        uploader_id=current_user.id,
        image_url=image_url,
        processing_status="PROCESSING",
    )
    db.add(receipt)
    await db.flush()

    # 3. Run OCR
    try:
        raw_text = await run_ocr(save_path if settings.USE_LOCAL_STORAGE else image_url)
        # Phase 2: use household's learned category mappings
        learned = await get_learned_mappings(db, str(current_user.household_id))
        parsed = parse_receipt_text(raw_text, learned_mappings=learned)

        receipt.raw_ocr_text = raw_text
        receipt.merchant_name = parsed["merchant"]
        receipt.total_amount = parsed["total"]
        receipt.purchase_date = parsed["date"]
        receipt.processing_status = "DONE"
    except Exception as exc:
        receipt.processing_status = "FAILED"
        await db.flush()
        raise HTTPException(status_code=500, detail=f"OCR failed: {exc}")

    await db.flush()

    # 4. Return the receipt + parsed items for user review (items NOT saved yet)
    out = ReceiptOut.model_validate(receipt)
    out.items = [ParsedReceiptItem(**item) for item in parsed["items"]]
    return out


@router.post("/{receipt_id}/confirm", response_model=ReceiptOut)
async def confirm_receipt(
    receipt_id: uuid.UUID,
    payload: ReceiptConfirm,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """User has reviewed and edited the OCR output — save pantry items now."""
    result = await db.execute(select(Receipt).where(Receipt.id == receipt_id))
    receipt = result.scalar_one_or_none()
    if not receipt or receipt.household_id != current_user.household_id:
        raise HTTPException(status_code=404, detail="Receipt not found")

    # Update receipt metadata if user changed anything
    if payload.merchant_name:
        receipt.merchant_name = payload.merchant_name
    if payload.total_amount:
        receipt.total_amount = payload.total_amount
    if payload.purchase_date:
        receipt.purchase_date = payload.purchase_date

    # Create pantry items from confirmed list
    for item_data in payload.items:
        pantry_item = PantryItem(
            household_id=current_user.household_id,
            receipt_id=receipt.id,
            name=item_data.name,
            category=item_data.category,
            quantity=item_data.quantity,
            unit=item_data.unit,
            purchase_price=item_data.price,
            purchase_date=receipt.purchase_date,
        )
        db.add(pantry_item)

    # Phase 2: Learn from this confirmation
    await bulk_record_overrides(
        db,
        str(current_user.household_id),
        [{"name": i.name, "category": i.category} for i in payload.items],
    )

    await db.commit()

    # Phase 3: Broadcast real-time update to household WebSocket room
    try:
        from app.routers.ws import broadcast_to_household
        await broadcast_to_household(
            str(current_user.household_id),
            "receipt_confirmed",
            {"receipt_id": str(receipt.id), "merchant": receipt.merchant_name, "item_count": len(payload.items)},
        )
    except Exception:
        pass  # Never fail a request over a WebSocket broadcast error

    return ReceiptOut.model_validate(receipt)


@router.get("/", response_model=list[ReceiptOut])
async def list_receipts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Receipt)
        .where(Receipt.household_id == current_user.household_id)
        .order_by(Receipt.scanned_at.desc())
        .limit(50)
    )
    return [ReceiptOut.model_validate(r) for r in result.scalars()]
