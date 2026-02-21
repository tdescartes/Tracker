"""
AI Document Service — Hybrid OCR + LLM Structuring Pipeline
============================================================
Engine: PaddleOCR (CPU, Mobile v4) → Gemini 1.5 Flash for structuring.
Strategy: Extract raw text from any financial document, then ask an LLM to
          produce clean, structured JSON.

Supported document types:
  • Store receipts (image or PDF)
  • Bank statements (PDF or image scan)

Fallback chain:
  1. pdfplumber (digital PDFs — no OCR needed)
  2. PaddleOCR (scanned images / image-based PDFs)
  3. Tesseract (legacy fallback)

Structuring chain:
  1. Gemini 1.5 Flash (best quality)
  2. Regex heuristics (offline fallback)
"""

import os
import json
import logging
from typing import Literal

from app.config import settings

logger = logging.getLogger(__name__)

DocumentType = Literal["receipt", "bank_statement", "auto"]


# ── Raw Text Extraction ──────────────────────────────────────────────────────

def extract_text_from_file(file_path: str) -> str:
    """
    Extract raw text from a file.  Priority:
      1. pdfplumber for digital PDFs
      2. PaddleOCR for scanned PDFs / images
      3. Tesseract as last resort
    """
    ext = os.path.splitext(file_path)[1].lower()

    # Try digital PDF extraction first
    if ext == ".pdf":
        text = _extract_pdf_text(file_path)
        if text and len(text.strip()) > 50:
            logger.info("PDF had embedded text (%d chars), skipping OCR", len(text))
            return text

    # Image or scanned PDF — run OCR
    if settings.USE_PADDLEOCR:
        try:
            return _paddleocr_extract(file_path)
        except Exception as exc:
            logger.warning("PaddleOCR failed, falling back to Tesseract: %s", exc)

    return _tesseract_extract(file_path)


def _extract_pdf_text(pdf_path: str) -> str:
    """Extract embedded text from a digital PDF using pdfplumber."""
    import pdfplumber
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                pages.append(t)
    return "\n".join(pages)


def _paddleocr_extract(file_path: str) -> str:
    """Run PaddleOCR (CPU, no GPU required) on an image or scanned PDF."""
    from paddleocr import PaddleOCR  # Lazy import — heavy library

    ocr = PaddleOCR(use_angle_cls=True, lang="en", use_gpu=False, show_log=False)
    result = ocr.ocr(file_path, cls=True)
    if not result:
        return ""
    lines = []
    for page in result:
        if page:
            for line in page:
                lines.append(line[1][0])
    return "\n".join(lines)


def _tesseract_extract(file_path: str) -> str:
    """Legacy Tesseract OCR fallback."""
    import pytesseract
    from PIL import Image
    img = Image.open(file_path)
    return pytesseract.image_to_string(img)


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


# ── LLM Structuring (Gemini) ─────────────────────────────────────────────────

async def structure_with_gemini(raw_text: str, doc_type: DocumentType) -> dict:
    """
    Use Gemini 1.5 Flash to convert raw OCR text into structured JSON.
    Returns a dict matching the expected schema for the document type.
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured — cannot use AI structuring")

    import google.generativeai as genai  # Lazy import

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model_name = settings.GEMINI_API_MODEL or "gemini-2.0-flash"
    model = genai.GenerativeModel(model_name)

    if doc_type == "bank_statement":
        prompt = _bank_statement_prompt(raw_text)
    else:
        prompt = _receipt_prompt(raw_text)

    response = model.generate_content(prompt)
    text = response.text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error("Gemini returned invalid JSON: %s", text[:500])
        raise ValueError("AI returned unparseable response")


def _receipt_prompt(raw_text: str) -> str:
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
6. If date is missing, use null.

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

async def process_receipt_document(file_path: str) -> dict:
    """
    Full pipeline: Extract text → Classify → Structure receipt.
    Returns: { merchant, date, total, tax, items: [...] }
    Tries Gemini first, falls back to regex parser.
    """
    raw_text = extract_text_from_file(file_path)

    if settings.GEMINI_API_KEY:
        try:
            result = await structure_with_gemini(raw_text, "receipt")
            result["_raw_text"] = raw_text
            result["_method"] = "gemini"
            return result
        except Exception as exc:
            logger.warning("Gemini receipt parsing failed, falling back to regex: %s", exc)

    # Regex fallback — use existing receipt_parser
    from app.services.receipt_parser import parse_receipt_text
    parsed = parse_receipt_text(raw_text)
    parsed["_raw_text"] = raw_text
    parsed["_method"] = "regex"
    return parsed


async def process_bank_document(file_path: str) -> dict:
    """
    Full pipeline: Extract text → Structure bank statement.
    Returns: { bank_name, transactions: [...], ... }
    Tries Gemini first, falls back to regex parser.
    """
    raw_text = extract_text_from_file(file_path)

    if settings.GEMINI_API_KEY:
        try:
            result = await structure_with_gemini(raw_text, "bank_statement")
            result["_raw_text"] = raw_text
            result["_method"] = "gemini"
            # Normalize transactions
            for tx in result.get("transactions", []):
                tx.setdefault("is_income", tx.get("amount", 0) > 0)
                tx.setdefault("category", "Other")
            return result
        except Exception as exc:
            logger.warning("Gemini bank parsing failed, falling back to regex: %s", exc)

    # Regex fallback
    from app.services.bank_parser import parse_bank_file
    transactions = parse_bank_file(file_path)
    return {
        "bank_name": "Unknown",
        "transactions": transactions,
        "_raw_text": raw_text,
        "_method": "regex",
    }


async def process_document_auto(file_path: str) -> dict:
    """
    Auto-detect document type and process accordingly.
    Returns structured data with a '_doc_type' field.
    """
    raw_text = extract_text_from_file(file_path)
    doc_type = classify_document(raw_text)

    if doc_type == "bank_statement":
        result = await process_bank_document(file_path)
    else:
        result = await process_receipt_document(file_path)

    result["_doc_type"] = doc_type
    return result
