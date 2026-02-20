"""
Receipt text parser — extracts merchant, date, items, and total
from raw OCR output using pattern matching.
Phase 2: AI auto-categorization learns from household confirmation history.
"""
import re
from datetime import date, datetime
from decimal import Decimal

# Known high-frequency item → category mappings
CATEGORY_MAP = {
    "milk": "Dairy", "cheese": "Dairy", "butter": "Dairy", "yogurt": "Dairy", "cream": "Dairy",
    "bread": "Bakery", "tortilla": "Bakery", "bun": "Bakery", "roll": "Bakery",
    "apple": "Produce", "banana": "Produce", "orange": "Produce", "lettuce": "Produce",
    "tomato": "Produce", "onion": "Produce", "potato": "Produce", "carrot": "Produce",
    "chicken": "Meat", "beef": "Meat", "pork": "Meat", "fish": "Seafood", "shrimp": "Seafood",
    "egg": "Dairy", "eggs": "Dairy",
    "water": "Beverages", "juice": "Beverages", "soda": "Snacks & Beverages", "beer": "Beverages",
    "chips": "Snacks & Beverages", "cookie": "Snacks & Beverages", "candy": "Snacks & Beverages",
    "soap": "Household", "detergent": "Household", "paper": "Household", "tissue": "Household",
    "shampoo": "Personal Care", "toothpaste": "Personal Care",
    "rice": "Pantry Staples", "pasta": "Pantry Staples", "flour": "Pantry Staples",
    "oil": "Pantry Staples", "sauce": "Pantry Staples", "cereal": "Pantry Staples",
}

# Default shelf life in days (when NOT in product catalog)
DEFAULT_SHELF_LIFE = {
    "Dairy": 7, "Produce": 5, "Meat": 3, "Seafood": 2,
    "Bakery": 5, "Snacks & Beverages": 180, "Beverages": 365,
    "Household": 730, "Personal Care": 730, "Pantry Staples": 365,
}

SKIP_PATTERNS = [
    r"^(tax|subtotal|sub-total|total|change|cash|credit|visa|mastercard|amex|debit|balance)",
    r"^\*+",
    r"^thank you",
    r"^www\.",
    r"^\d{3}[-.\s]\d{3}[-.\s]\d{4}",  # Phone number
]


def _guess_category(name: str, learned: dict[str, str] | None = None) -> str:
    """
    Returns a category for the item name.
    Priority: 1) household-learned override  2) built-in keyword map  3) 'Uncategorized'
    `learned` is a dict of {normalized_item_name: category} built from past confirmations.
    """
    lower = name.lower().strip()
    # Check learned mappings first (exact or substring)
    if learned:
        if lower in learned:
            return learned[lower]
        for keyword, category in learned.items():
            if keyword in lower or lower in keyword:
                return category
    # Fall back to built-in map
    for keyword, category in CATEGORY_MAP.items():
        if keyword in lower:
            return category
    return "Uncategorized"


def _should_skip(line: str) -> bool:
    l = line.strip().lower()
    return any(re.match(p, l) for p in SKIP_PATTERNS)


def _parse_date(text: str) -> date:
    patterns = [
        r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b",   # 01/15/2026 or 1-15-26
        r"\b(\w+ \d{1,2},? \d{4})\b",                   # Jan 15, 2026
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                raw = match.group(0)
                for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%m/%d/%y", "%B %d, %Y", "%b %d, %Y"):
                    try:
                        return datetime.strptime(raw, fmt).date()
                    except ValueError:
                        continue
            except Exception:
                pass
    return date.today()


def parse_receipt_text(raw_text: str, learned_mappings: dict[str, str] | None = None) -> dict:
    """
    Parse raw OCR text into structured receipt data.
    `learned_mappings` is an optional {item_name: category} dict built from
    past household confirmations (Phase 2 auto-categorization).
    """
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    items = []
    total = Decimal("0.00")
    merchant = "Unknown Store"

    # First non-empty line is usually the store name
    for line in lines[:5]:
        if len(line) > 2 and not re.match(r"\d", line):
            merchant = line
            break

    receipt_date = _parse_date(raw_text)

    for line in lines:
        if _should_skip(line):
            # Check if this is the TOTAL line
            if "total" in line.lower():
                total_match = re.search(r"(\d+\.\d{2})", line)
                if total_match:
                    total = Decimal(total_match.group(1))
            continue

        price_match = re.search(r"(\d+\.\d{2})\s*$", line)
        if price_match:
            price = Decimal(price_match.group(1))
            name = line[: price_match.start()].strip()
            name = re.sub(r"\s+\d+\s*@.*$", "", name).strip()  # Remove "2 @ $1.99"

            if not name or price > Decimal("500"):
                continue

            category = _guess_category(name, learned=learned_mappings)
            items.append({
                "name": name,
                "price": price,
                "category": category,
                "quantity": Decimal("1.0"),
                "unit": None,
            })

    # If total not found via TOTAL line, sum items
    if total == Decimal("0.00") and items:
        total = sum(i["price"] for i in items)

    return {
        "merchant": merchant,
        "total": total,
        "date": receipt_date,
        "items": items,
    }
