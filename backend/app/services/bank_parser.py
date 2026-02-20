"""
Bank statement parser — supports PDF and CSV formats.
Extracts transactions as { date, description, amount, raw_line }.
Phase 1: PDF parsing.  Phase 2: CSV parsing added.
"""
import re
import csv
import io
import pdfplumber
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path


def parse_bank_file(file_path: str, content_type: str = "") -> list[dict]:
    """
    Auto-detect file format (PDF or CSV) and parse accordingly.
    content_type hint: 'application/pdf' | 'text/csv'
    """
    path = Path(file_path)
    ext = path.suffix.lower()
    if ext == ".csv" or "csv" in content_type:
        with open(file_path, "r", encoding="utf-8-sig") as f:
            return parse_bank_csv(f.read())
    return parse_bank_pdf(file_path)


def parse_bank_pdf(pdf_path: str) -> list[dict]:
    """
    Returns a list of transaction dicts:
      { date, description, amount, raw_line }
    """
    raw_text = _extract_pdf_text(pdf_path)
    return _parse_transactions(raw_text)


def parse_bank_csv(csv_content: str) -> list[dict]:
    """
    Parse a bank CSV export. Supports common column layouts:
      1. Date, Description, Amount
      2. Date, Description, Debit, Credit
      3. Transaction Date, Description, Amount, Balance
    Works with Chase, TD Bank, Bank of America, Capital One exports.
    """
    reader = csv.DictReader(io.StringIO(csv_content.strip()))
    if not reader.fieldnames:
        return []

    headers_lower = [h.lower().strip() for h in reader.fieldnames]
    col_map = _detect_csv_columns(headers_lower)
    if not col_map:
        return []

    transactions = []
    for row in reader:
        raw_date = row.get(reader.fieldnames[col_map["date"]], "").strip()
        description = row.get(reader.fieldnames[col_map["description"]], "").strip()
        parsed_date = _parse_tx_date(raw_date)
        if not parsed_date or not description:
            continue

        # Amount handling: single column or debit/credit split
        if "amount" in col_map:
            raw_amount = row.get(reader.fieldnames[col_map["amount"]], "0").strip()
            amount = _parse_amount(raw_amount)
        else:
            debit = _parse_amount(row.get(reader.fieldnames[col_map.get("debit", 0)], "0").strip())
            credit = _parse_amount(row.get(reader.fieldnames[col_map.get("credit", 0)], "0").strip())
            amount = credit - abs(debit) if debit else credit

        if _is_header_or_noise(description):
            continue

        transactions.append({
            "date": parsed_date,
            "description": description,
            "amount": float(amount),
            "raw_line": ",".join(str(v) for v in row.values()),
        })

    return transactions


CSV_DATE_ALIASES = ["date", "transaction date", "trans date", "posted date", "posting date"]
CSV_DESC_ALIASES = ["description", "memo", "payee", "merchant", "transaction", "details", "name"]
CSV_AMOUNT_ALIASES = ["amount", "transaction amount", "amt"]
CSV_DEBIT_ALIASES = ["debit", "withdrawal", "paid out", "charges"]
CSV_CREDIT_ALIASES = ["credit", "deposit", "paid in", "payments"]


def _detect_csv_columns(headers: list[str]) -> dict[str, int] | None:
    col = {}
    for i, h in enumerate(headers):
        if not col.get("date") and any(alias == h for alias in CSV_DATE_ALIASES):
            col["date"] = i
        elif not col.get("description") and any(alias in h for alias in CSV_DESC_ALIASES):
            col["description"] = i
        elif not col.get("amount") and any(alias == h for alias in CSV_AMOUNT_ALIASES):
            col["amount"] = i
        elif not col.get("debit") and any(alias in h for alias in CSV_DEBIT_ALIASES):
            col["debit"] = i
        elif not col.get("credit") and any(alias in h for alias in CSV_CREDIT_ALIASES):
            col["credit"] = i

    if "date" not in col or "description" not in col:
        return None
    if "amount" not in col and "debit" not in col and "credit" not in col:
        return None
    return col


def _extract_pdf_text(pdf_path: str) -> str:
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts)


def _parse_transactions(raw_text: str) -> list[dict]:
    """
    Detects transaction lines using pattern:
      MM/DD or MM/DD/YY[YY]  <description>  <amount>

    Handles:
      - Positive amounts (deposits/credits, income)
      - Negative amounts (purchases)
      - Parentheses notation: (12.50) = -12.50
    """
    # Pattern: date  description  amount (optional leading -)
    TX_PATTERN = re.compile(
        r"(\d{1,2}/\d{1,2}(?:/\d{2,4})?)"   # Date
        r"\s+"
        r"(.+?)"                              # Description (lazy)
        r"\s+"
        r"(-?\(?\$?[\d,]+\.\d{2}\)?)"        # Amount — allows parentheses for negatives
        r"\s*$",
        re.MULTILINE,
    )

    transactions = []
    for match in TX_PATTERN.finditer(raw_text):
        raw_date_str = match.group(1)
        description = match.group(2).strip()
        raw_amount = match.group(3).strip()

        # Parse date
        parsed_date = _parse_tx_date(raw_date_str)
        if parsed_date is None:
            continue

        # Parse amount
        amount = _parse_amount(raw_amount)

        # Filter noise (balance rows, etc.)
        if _is_header_or_noise(description):
            continue

        transactions.append({
            "date": parsed_date,
            "description": description,
            "amount": float(amount),
            "raw_line": match.group(0).strip(),
        })

    return transactions


def _parse_tx_date(raw: str) -> date | None:
    for fmt in ("%m/%d/%Y", "%m/%d/%y", "%m/%d"):
        try:
            parsed = datetime.strptime(raw, fmt)
            # When year is missing, assume current year
            if fmt == "%m/%d":
                parsed = parsed.replace(year=datetime.now().year)
            return parsed.date()
        except ValueError:
            continue
    return None


def _parse_amount(raw: str) -> Decimal:
    negative = raw.startswith("(") or raw.startswith("-")
    cleaned = re.sub(r"[()$,]", "", raw)
    try:
        value = Decimal(cleaned)
        return -abs(value) if negative else value
    except Exception:
        return Decimal("0.00")


NOISE_PATTERNS = [
    r"^(balance|beginning balance|ending balance|account number)",
    r"^(page \d+|continued|statement period)",
    r"^\d{10,}",  # Long number = account/routing
]


def _is_header_or_noise(desc: str) -> bool:
    lower = desc.lower().strip()
    return any(re.match(p, lower) for p in NOISE_PATTERNS)
