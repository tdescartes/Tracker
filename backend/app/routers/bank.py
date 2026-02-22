import shutil
import uuid
import os
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models.user import User
from app.models.goal import BankTransaction
from app.models.receipt import Receipt
from app.routers.auth import get_current_user
from datetime import date as date_type, datetime
from app.services.bank_parser import parse_bank_file
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_SUBSCRIPTIONS = [
    "NETFLIX", "SPOTIFY", "HULU", "DISNEY+", "HBO", "AMAZON PRIME",
    "APPLE.COM", "GOOGLE ONE", "MICROSOFT", "GYM", "PLANET FITNESS",
    "CRUNCH", "DROPBOX", "ADOBE", "ZOOM", "SLACK",
]


def get_subscription_keywords() -> list[str]:
    """Returns subscription keywords — user-configurable via KNOWN_SUBSCRIPTIONS env var."""
    custom = getattr(settings, "KNOWN_SUBSCRIPTIONS", "")
    if custom:
        return [s.strip().upper() for s in custom.split(",") if s.strip()]
    return DEFAULT_SUBSCRIPTIONS


@router.post("/upload-statement", status_code=status.HTTP_201_CREATED)
async def upload_statement(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="No household found")

    filename = (file.filename or "").lower()
    content_type = file.content_type or ""

    # Accept PDF, CSV, and image files (for scanned bank statements)
    is_pdf = filename.endswith(".pdf") or "pdf" in content_type
    is_csv = filename.endswith(".csv") or "csv" in content_type
    is_image = any(filename.endswith(e) for e in [".jpg", ".jpeg", ".png", ".tiff", ".bmp"])

    if not (is_pdf or is_csv or is_image):
        raise HTTPException(
            status_code=400,
            detail="Supported formats: PDF, CSV, JPG, PNG bank statements"
        )

    ext = Path(filename).suffix if filename else ".pdf"
    tmp_path = os.path.join(settings.LOCAL_UPLOAD_DIR, f"stmt_{uuid.uuid4()}{ext}")
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # Try AI pipeline first (PaddleOCR + Gemini), fall back to regex
        if settings.GEMINI_API_KEY and (is_pdf or is_image):
            from app.services.ai_document_service import process_bank_document

            logger.info(
                "Starting bank statement processing (user=%s, file=%s)",
                current_user.id, file.filename,
            )

            result = await process_bank_document(tmp_path)
            transactions = result.get("transactions", [])
            method = result.get("_method", "unknown")
            bank_name = result.get("bank_name", "Unknown")

            logger.info(
                "Bank statement processed via %s — bank=%s, transactions=%d",
                method, bank_name, len(transactions),
            )
        else:
            transactions = parse_bank_file(tmp_path, content_type=content_type)
            method = "regex"
            bank_name = "Unknown"
    except Exception as exc:
        logger.error("Bank statement processing failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Statement processing failed: {type(exc).__name__}: {exc}",
        )
    finally:
        os.remove(tmp_path)  # Delete file after parsing (privacy)

    saved = []
    subscriptions = []
    skipped = 0
    for tx in transactions:
        desc = tx.get("description", "")
        amount = tx.get("amount", 0)

        # Parse date — Gemini returns strings, regex returns date objects
        tx_date = tx.get("date")
        if isinstance(tx_date, str):
            try:
                tx_date = datetime.strptime(tx_date, "%Y-%m-%d").date()
            except (ValueError, TypeError):
                tx_date = date_type.today()
        elif tx_date is None:
            tx_date = date_type.today()

        # Duplicate protection — skip if same (date, description, amount) already exists
        dup = await db.execute(
            select(BankTransaction).where(
                and_(
                    BankTransaction.household_id == current_user.household_id,
                    BankTransaction.transaction_date == tx_date,
                    BankTransaction.description == desc,
                    BankTransaction.amount == amount,
                )
            ).limit(1)
        )
        if dup.scalar_one_or_none():
            skipped += 1
            continue

        is_sub = any(sub in desc.upper() for sub in get_subscription_keywords())
        is_income = tx.get("is_income", amount > 0)
        category = tx.get("category", None)

        record = BankTransaction(
            household_id=current_user.household_id,
            transaction_date=tx_date,
            description=desc,
            amount=amount,
            is_subscription=is_sub,
            is_income=is_income,
            category=category,
            raw_description=tx.get("raw_line") or tx.get("raw_description"),
        )
        db.add(record)
        saved.append(record)
        if is_sub:
            subscriptions.append({"description": desc, "amount": amount})

    await db.commit()

    return {
        "transactions_imported": len(saved),
        "duplicates_skipped": skipped,
        "subscriptions_found": subscriptions,
        "parsing_method": method,
        "bank_name": bank_name,
    }


@router.get("/transactions")
async def list_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BankTransaction)
        .where(BankTransaction.household_id == current_user.household_id)
        .order_by(BankTransaction.transaction_date.desc())
        .limit(200)
    )
    txs = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "date": str(t.transaction_date),
            "description": t.description,
            "amount": float(t.amount),
            "category": t.category,
            "is_subscription": t.is_subscription,
            "is_income": t.is_income,
            "linked_receipt_id": str(t.linked_receipt_id) if t.linked_receipt_id else None,
            "source": getattr(t, "source", "upload"),
        }
        for t in txs
    ]


@router.post("/reconcile")
async def reconcile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Try to match bank transactions to scanned receipts by date ± 1 day and amount."""
    from datetime import timedelta

    txs_result = await db.execute(
        select(BankTransaction).where(
            and_(
                BankTransaction.household_id == current_user.household_id,
                BankTransaction.linked_receipt_id == None,
                BankTransaction.is_income == False,
            )
        )
    )
    unmatched_txs = txs_result.scalars().all()

    receipts_result = await db.execute(
        select(Receipt).where(Receipt.household_id == current_user.household_id)
    )
    receipts = receipts_result.scalars().all()

    matched = 0
    for tx in unmatched_txs:
        for receipt in receipts:
            if not receipt.purchase_date or not receipt.total_amount:
                continue
            date_match = abs((tx.transaction_date - receipt.purchase_date).days) <= 1
            amount_match = abs(abs(float(tx.amount)) - float(receipt.total_amount)) < 0.50
            if date_match and amount_match:
                tx.linked_receipt_id = receipt.id
                receipt.is_reconciled = True
                matched += 1
                break

    await db.commit()
    return {"matched": matched, "unmatched": len(unmatched_txs) - matched}
