"""
AI Document Service — Hybrid OCR + LLM Structuring Pipeline
============================================================
Engine : PaddleOCR (CPU) → Gemini Flash for JSON structuring.
Strategy: Extract raw text from any financial document, then ask an LLM to
          produce clean, structured JSON.

Ported from the **working** standalone script (fix/main.py).
Key design decisions:
  • Gemini is called with the SYNCHRONOUS `generate_content()` method (proven
    reliable) and wrapped in `run_in_executor` so it never blocks FastAPI.
  • A self-correction retry loop feeds JSON parse errors back to Gemini.
  • PaddleOCR and the Gemini model are lazy singletons behind a threading lock.

Supported document types:
  • Store receipts  (image or PDF)
  • Bank statements (PDF, CSV, or image scan)

Fallback chain:
  1. pdfplumber   (digital PDFs — no OCR needed)
  2. PaddleOCR    (scanned images / image-based PDFs)
  3. Tesseract    (last-resort fallback)

Structuring chain:
  1. Gemini Flash  (with self-correction retry loop)
  2. Regex heuristics (offline fallback)
"""

import os
import json
import logging
import asyncio
import time
import threading
from typing import Literal
from concurrent.futures import ThreadPoolExecutor

from app.config import settings

logger = logging.getLogger(__name__)

DocumentType = Literal["receipt", "bank_statement", "auto"]

# ── Gemini Model Singleton (thread-safe) ──────────────────────────────────────
# Mirror the pattern from fix/main.py: configure once at module level, reuse.

_gemini_model = None
_gemini_lock = threading.Lock()


def _get_gemini_model():
    """
    Lazy, thread-safe singleton for the Gemini GenerativeModel.
    Uses the SYNCHRONOUS SDK — all calls go through generate_content(),
    which is the pattern proven to work in fix/main.py.
    """
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    with _gemini_lock:
        if _gemini_model is not None:          # double-check after acquiring lock
            return _gemini_model
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured — cannot use AI structuring")
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_API_MODEL)
        logger.info("Gemini model initialised: %s", settings.GEMINI_API_MODEL)
    return _gemini_model


# ── Thread Pools ──────────────────────────────────────────────────────────────
# Separate pools for OCR (CPU) and Gemini (network) so one doesn't starve the other.

_ocr_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ocr")
_gemini_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="gemini")


# ── Raw Text Extraction (delegates to ocr_service for OCR) ──────────────────

def extract_text_from_file(file_path: str) -> str:
    """
    Extract raw text from a file.  Priority:
      1. pdfplumber for digital PDFs
      2. PaddleOCR for scanned PDFs / images (via ocr_service)
      3. Tesseract as last resort (via ocr_service)
    """
    ext = os.path.splitext(file_path)[1].lower()

    # Try digital PDF extraction first
    if ext == ".pdf":
        text = _extract_pdf_text(file_path)
        if text and len(text.strip()) > 50:
            logger.info("PDF had embedded text (%d chars), skipping OCR", len(text))
            return text

    # Image or scanned PDF — delegate to ocr_service (singleton PaddleOCR)
    logger.info("Running PaddleOCR on %s …", os.path.basename(file_path))
    from app.services.ocr_service import run_ocr_sync
    text = run_ocr_sync(file_path)
    logger.info("OCR extracted %d chars from %s", len(text), os.path.basename(file_path))
    return text


def _extract_pdf_text(pdf_path: str) -> str:
    """Extract embedded text from a digital PDF using pdfplumber."""
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        return "\n".join(pages)
    except Exception as exc:
        logger.warning("pdfplumber failed on %s: %s", pdf_path, exc)
        return ""


async def extract_text_from_file_async(file_path: str) -> str:
    """Non-blocking wrapper — runs CPU-bound OCR in a thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_ocr_executor, extract_text_from_file, file_path)


# ── Document Classification ──────────────────────────────────────────────────

def classify_document(raw_text: str) -> DocumentType:
    """Classify document as receipt or bank statement using keyword heuristics."""
    lower = raw_text.lower()
    bank_signals = ["statement", "balance", "account number", "routing", "iban",
                    "opening balance", "closing balance", "transactions"]
    receipt_signals = ["subtotal", "tax", "total", "qty", "item", "cashier",
                       "thank you", "change due"]

    bank_score = sum(1 for kw in bank_signals if kw in lower)
    receipt_score = sum(1 for kw in receipt_signals if kw in lower)

    if bank_score > receipt_score:
        return "bank_statement"
    return "receipt"


# ── LLM Structuring (Gemini) — Sync calls in thread pool ─────────────────────
# This is the CRITICAL section.  We use the SYNCHRONOUS generate_content() method
# (exactly as fix/main.py does) and run it in a dedicated thread pool so it never
# blocks FastAPI's event loop.

MAX_RETRIES = 3


def _call_gemini_sync(prompt: str) -> str:
    """
    Call Gemini synchronously — this runs in a ThreadPoolExecutor.
    Returns the raw response text.
    Matches fix/main.py: `response = model.generate_content(current_prompt)`
    """
    model = _get_gemini_model()
    response = model.generate_content(prompt)
    return response.text


async def structure_with_gemini(
    raw_text: str,
    doc_type: DocumentType,
    learned_mappings: dict[str, str] | None = None,
) -> dict:
    """
    Use Gemini Flash to convert raw OCR text into structured JSON.
    Includes a self-correction retry loop (ported from fix/main.py):
    if Gemini returns malformed JSON, the error is fed back to Gemini
    so it can fix its own output.

    KEY: Uses sync generate_content() in a thread executor (proven to work).
    """
    if doc_type == "bank_statement":
        base_prompt = _bank_statement_prompt(raw_text)
        schema_example = _bank_schema_example()
    else:
        base_prompt = _receipt_prompt(raw_text, learned_mappings=learned_mappings)
        schema_example = _receipt_schema_example()

    current_prompt = base_prompt
    loop = asyncio.get_running_loop()
    cleaned = ""

    for attempt in range(MAX_RETRIES):
        try:
            logger.info("Gemini attempt %d/%d for %s", attempt + 1, MAX_RETRIES, doc_type)

            # Run sync Gemini call in thread pool (60s timeout per attempt)
            raw_response = await asyncio.wait_for(
                loop.run_in_executor(_gemini_executor, _call_gemini_sync, current_prompt),
                timeout=60.0,
            )

            # Strip markdown code fences (Gemini often wraps JSON in ```json ... ```)
            cleaned = raw_response.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
            logger.info("Gemini returned valid JSON on attempt %d", attempt + 1)
            return data

        except json.JSONDecodeError as e:
            logger.warning(
                "Gemini JSON parse error (attempt %d/%d): %s",
                attempt + 1, MAX_RETRIES, e,
            )
            if attempt < MAX_RETRIES - 1:
                # Self-correction: feed error back to Gemini (same as fix/main.py)
                current_prompt = (
                    f"Previous output was invalid JSON. Error: {e}\n"
                    f"Incorrect Output: {cleaned[:1000]}\n\n"
                    f"Fix the syntax and return ONLY the valid JSON object.\n"
                    f"Original Schema: {schema_example}"
                )
            else:
                raise ValueError(
                    f"AI returned unparseable JSON after {MAX_RETRIES} attempts"
                )

        except asyncio.TimeoutError:
            logger.warning("Gemini timeout (attempt %d/%d)", attempt + 1, MAX_RETRIES)
            if attempt >= MAX_RETRIES - 1:
                raise ValueError("AI structuring timed out after retries")

        except Exception as exc:
            logger.warning(
                "Gemini API error (attempt %d/%d): %s", attempt + 1, MAX_RETRIES, exc
            )
            if attempt >= MAX_RETRIES - 1:
                raise
            time.sleep(2)  # Brief pause before retry (matches fix/main.py)

    raise ValueError("AI structuring failed after all retries")


def _receipt_schema_example() -> str:
    return '{"merchant":"Store","date":"YYYY-MM-DD","total":45.99,"tax":3.20,"items":[{"name":"Item","price":4.99,"quantity":1,"category":"Produce"}]}'


def _bank_schema_example() -> str:
    return '{"bank_name":"Bank","account_number_last4":"1234","transactions":[{"date":"YYYY-MM-DD","description":"Desc","amount":-5.50,"category":"Dining","is_income":false}]}'


def _receipt_prompt(raw_text: str, learned_mappings: dict[str, str] | None = None) -> str:
    learned_hint = ""
    if learned_mappings:
        examples = ", ".join(f'"{k}" → {v}' for k, v in list(learned_mappings.items())[:20])
        learned_hint = f"\n7. This household previously categorized: {examples}. Prefer these mappings."

    return f"""You are a precise receipt parser.

Given the raw OCR text of a store receipt, extract structured data.

Return ONLY a JSON object with this exact schema:
{{
  "merchant": "Store Name",
  "date": "YYYY-MM-DD",
  "total": 45.99,
  "tax": 3.20,
  "items": [
    {{"name": "Item Name", "price": 4.99, "quantity": 1, "category": "Produce"}}
  ]
}}

Rules:
1. No currency symbols in numbers (use 10.50 not $10.50).
2. Dates MUST be YYYY-MM-DD format.
3. Fix obvious OCR typos (e.g., 'S10.00' → 10.00, '0range' → 'Orange').
4. Categorize each item into one of: Dairy, Bakery, Produce, Meat, Seafood,
   Beverages, Snacks, Household, Personal Care, Pantry Staples, Frozen, Deli, Other.
5. If total is missing, sum the item prices.
6. If date is missing, use null.{learned_hint}

RAW TEXT:
{raw_text}"""


def _bank_statement_prompt(raw_text: str) -> str:
    return f"""You are a precise bank statement parser.

Given the raw OCR text of a bank statement, extract ALL transactions.

Return ONLY a JSON object with this exact schema:
{{
  "bank_name": "Bank Name",
  "account_number_last4": "1234",
  "statement_period": {{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}},
  "opening_balance": 1200.00,
  "closing_balance": 980.50,
  "transactions": [
    {{
      "date": "YYYY-MM-DD",
      "description": "STARBUCKS #12345",
      "amount": -5.50,
      "category": "Dining",
      "is_income": false
    }}
  ]
}}

Rules:
1. No currency symbols in numbers.
2. Dates MUST be YYYY-MM-DD format.
3. Debits/purchases are NEGATIVE amounts. Credits/deposits are POSITIVE.
4. Fix OCR typos in merchant names.
5. Categorize each transaction into one of: Groceries, Dining, Transport,
   Utilities, Entertainment, Shopping, Healthcare, Insurance, Subscriptions,
   Transfer, Income, ATM, Fees, Other.
6. Set is_income=true for credits/deposits/salary/payment received.

RAW TEXT:
{raw_text}"""


# ── High-Level Pipelines ─────────────────────────────────────────────────────

async def process_receipt_document(file_path: str, learned_mappings: dict[str, str] | None = None, *, raw_text: str | None = None) -> dict:
    """
    Full pipeline: Extract text → Classify → Structure receipt.
    Returns: { merchant, date, total, tax, items: [...] }
    Tries Gemini first, falls back to regex parser.
    If raw_text is provided, skips OCR (avoids double extraction).
    """
    start = time.monotonic()
    if raw_text is None:
        raw_text = await extract_text_from_file_async(file_path)

    method = "regex"
    error_msg = None

    if settings.GEMINI_API_KEY:
        try:
            result = await structure_with_gemini(raw_text, "receipt", learned_mappings=learned_mappings)
            result["_raw_text"] = raw_text
            result["_method"] = "gemini"
            method = "gemini"
            await _log_processing(file_path, "receipt", method, True, time.monotonic() - start)
            return result
        except Exception as exc:
            error_msg = str(exc)
            logger.warning("Gemini receipt parsing failed, falling back to regex: %s", exc)

    # Regex fallback — use existing receipt_parser
    from app.services.receipt_parser import parse_receipt_text
    parsed = parse_receipt_text(raw_text, learned_mappings=learned_mappings)
    parsed["_raw_text"] = raw_text
    parsed["_method"] = "regex"
    await _log_processing(file_path, "receipt", method, error_msg is None, time.monotonic() - start, error_msg)
    return parsed


async def process_bank_document(file_path: str, *, raw_text: str | None = None) -> dict:
    """
    Full pipeline: Extract text → Structure bank statement.
    Returns: { bank_name, transactions: [...], ... }
    Tries Gemini first, falls back to regex parser.
    If raw_text is provided, skips OCR (avoids double extraction).
    """
    start = time.monotonic()
    if raw_text is None:
        raw_text = await extract_text_from_file_async(file_path)

    method = "regex"
    error_msg = None

    if settings.GEMINI_API_KEY:
        try:
            result = await structure_with_gemini(raw_text, "bank_statement")
            result["_raw_text"] = raw_text
            result["_method"] = "gemini"
            method = "gemini"
            # Normalize transactions
            for tx in result.get("transactions", []):
                tx.setdefault("is_income", tx.get("amount", 0) > 0)
                tx.setdefault("category", "Other")
            await _log_processing(file_path, "bank_statement", method, True, time.monotonic() - start)
            return result
        except Exception as exc:
            error_msg = str(exc)
            logger.warning("Gemini bank parsing failed, falling back to regex: %s", exc)

    # Regex fallback
    from app.services.bank_parser import parse_bank_file
    transactions = parse_bank_file(file_path)
    await _log_processing(file_path, "bank_statement", method, error_msg is None, time.monotonic() - start, error_msg)
    return {
        "bank_name": "Unknown",
        "transactions": transactions,
        "_raw_text": raw_text,
        "_method": "regex",
    }


async def process_document_auto(file_path: str) -> dict:
    """
    Auto-detect document type and process accordingly.
    Extracts text ONCE and passes it to sub-functions (no double OCR).
    Returns structured data with a '_doc_type' field.
    """
    raw_text = await extract_text_from_file_async(file_path)
    doc_type = classify_document(raw_text)

    if doc_type == "bank_statement":
        result = await process_bank_document(file_path, raw_text=raw_text)
    else:
        result = await process_receipt_document(file_path, raw_text=raw_text)

    result["_doc_type"] = doc_type
    return result


# ── Processing Log ────────────────────────────────────────────────────────────

async def _log_processing(
    file_path: str,
    doc_type: str,
    method: str,
    success: bool,
    duration_seconds: float,
    error_message: str | None = None,
) -> None:
    """Write a row to document_processing_log (best-effort, never raises)."""
    try:
        from sqlalchemy import text as sa_text
        from app.database import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            await session.execute(
                sa_text("""
                    INSERT INTO document_processing_log
                        (file_name, document_type, processing_method, success,
                         processing_duration_ms, error_message)
                    VALUES (:fname, :dtype, :method, :success, :dur_ms, :err)
                """),
                {
                    "fname": os.path.basename(file_path),
                    "dtype": doc_type,
                    "method": method,
                    "success": success,
                    "dur_ms": int(duration_seconds * 1000),
                    "err": error_message,
                },
            )
            await session.commit()
    except Exception as exc:
        # Never let logging failures break the main pipeline
        logger.debug("Could not write processing log: %s", exc)
