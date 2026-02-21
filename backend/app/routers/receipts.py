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
        # TODO: upload to S3-compatible storage (MinIO) — coming soon
        raise HTTPException(status_code=501, detail="Remote storage (MinIO) not configured yet. Set USE_LOCAL_STORAGE=true.")

    # 2. Create receipt record with PROCESSING status
    receipt = Receipt(
        household_id=current_user.household_id,
        uploader_id=current_user.id,
        image_url=image_url,
        processing_status="PROCESSING",
    )
    db.add(receipt)
    await db.flush()

    # 3. Run AI document pipeline (PaddleOCR + Gemini) with regex fallback
    try:
        from app.services.ai_document_service import process_receipt_document
        parsed = await process_receipt_document(
            save_path if settings.USE_LOCAL_STORAGE else image_url
        )

        raw_text = parsed.get("_raw_text", "")
        method = parsed.get("_method", "unknown")

        receipt.raw_ocr_text = raw_text
        receipt.merchant_name = parsed.get("merchant", "Unknown Store")
        receipt.total_amount = parsed.get("total")
        receipt.processing_status = "DONE"

        # Handle date (Gemini returns string, regex returns date object)
        receipt_date = parsed.get("date")
        if isinstance(receipt_date, str):
            from datetime import date as date_type, datetime
            try:
                receipt.purchase_date = datetime.strptime(receipt_date, "%Y-%m-%d").date()
            except (ValueError, TypeError):
                receipt.purchase_date = date_type.today()
        else:
            receipt.purchase_date = receipt_date

        # Build items list — Gemini returns different format than regex
        items = []
        for item in parsed.get("items", []):
            items.append(ParsedReceiptItem(
                name=item.get("name", "Unknown"),
                price=item.get("price", 0),
                category=item.get("category"),
                quantity=item.get("quantity", 1),
                unit=item.get("unit"),
            ))

    except Exception as exc:
        receipt.processing_status = "FAILED"
        await db.flush()
        raise HTTPException(status_code=500, detail=f"Document processing failed: {exc}")

    await db.flush()

    # 4. Return the receipt + parsed items for user review (items NOT saved yet)
    out = ReceiptOut.model_validate(receipt)
    out.items = items
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
