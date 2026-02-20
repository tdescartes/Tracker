import shutil
import uuid
import os
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models.user import User
from app.models.goal import BankTransaction
from app.models.receipt import Receipt
from app.routers.auth import get_current_user
from app.services.bank_parser import parse_bank_file
from app.config import settings

router = APIRouter()

KNOWN_SUBSCRIPTIONS = [
    "NETFLIX", "SPOTIFY", "HULU", "DISNEY+", "HBO", "AMAZON PRIME",
    "APPLE.COM", "GOOGLE ONE", "MICROSOFT", "GYM", "PLANET FITNESS",
    "CRUNCH", "DROPBOX", "ADOBE", "ZOOM", "SLACK",
]


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
    if not (filename.endswith(".pdf") or filename.endswith(".csv") or "csv" in content_type or "pdf" in content_type):
        raise HTTPException(status_code=400, detail="Only PDF or CSV bank statements are supported")

    ext = ".csv" if (filename.endswith(".csv") or "csv" in content_type) else ".pdf"
    tmp_path = os.path.join(settings.LOCAL_UPLOAD_DIR, f"stmt_{uuid.uuid4()}{ext}")
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        transactions = parse_bank_file(tmp_path, content_type=content_type)
    finally:
        os.remove(tmp_path)  # Delete file after parsing (privacy)

    saved = []
    subscriptions = []
    for tx in transactions:
        is_sub = any(sub in tx["description"].upper() for sub in KNOWN_SUBSCRIPTIONS)
        is_income = tx["amount"] > 0

        record = BankTransaction(
            household_id=current_user.household_id,
            transaction_date=tx["date"],
            description=tx["description"],
            amount=tx["amount"],
            is_subscription=is_sub,
            is_income=is_income,
            raw_description=tx.get("raw_line"),
        )
        db.add(record)
        saved.append(record)
        if is_sub:
            subscriptions.append({"description": tx["description"], "amount": tx["amount"]})

    await db.flush()

    return {
        "transactions_imported": len(saved),
        "subscriptions_found": subscriptions,
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
            "is_subscription": t.is_subscription,
            "is_income": t.is_income,
            "linked_receipt_id": str(t.linked_receipt_id) if t.linked_receipt_id else None,
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

    return {"matched": matched, "unmatched": len(unmatched_txs) - matched}
