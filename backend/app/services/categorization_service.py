"""
Auto-Categorization Service — Phase 2
Learns item → category mappings from household receipt confirmations.
Future receipts from the same household will use these overrides first.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def record_category_override(
    db: AsyncSession,
    household_id: str,
    item_name: str,
    category: str,
) -> None:
    """
    Save or update a household-specific item→category mapping.
    Called when a user confirms (or edits) a receipt item.
    """
    normalized = item_name.lower().strip()
    await db.execute(
        text("""
            INSERT INTO category_overrides (household_id, item_name, category)
            VALUES (:hid, :name, :category)
            ON CONFLICT (household_id, item_name)
            DO UPDATE SET category = EXCLUDED.category, updated_at = NOW()
        """),
        {"hid": household_id, "name": normalized, "category": category},
    )
    await db.commit()


async def get_learned_mappings(db: AsyncSession, household_id: str) -> dict[str, str]:
    """
    Retrieve all learned item→category overrides for a household.
    Returns a dict suitable for passing to parse_receipt_text() as `learned_mappings`.
    """
    result = await db.execute(
        text("SELECT item_name, category FROM category_overrides WHERE household_id = :hid"),
        {"hid": household_id},
    )
    return {row.item_name: row.category for row in result.fetchall()}


async def bulk_record_overrides(
    db: AsyncSession,
    household_id: str,
    items: list[dict],  # Each dict must have 'name' and 'category'
) -> int:
    """
    Bulk-record overrides from a confirmed receipt. Returns number of rows inserted.
    Skips items categorized as 'Uncategorized'.
    """
    count = 0
    for item in items:
        name = item.get("name", "").strip()
        category = item.get("category", "Uncategorized")
        if name and category != "Uncategorized":
            await record_category_override(db, household_id, name, category)
            count += 1
    return count


async def get_top_categories(db: AsyncSession, household_id: str, limit: int = 10) -> list[dict]:
    """
    Returns the most frequently used categories for a household,
    useful for suggesting categories in the UI.
    """
    result = await db.execute(
        text("""
            SELECT category, COUNT(*) as count
            FROM category_overrides
            WHERE household_id = :hid
            GROUP BY category
            ORDER BY count DESC
            LIMIT :limit
        """),
        {"hid": household_id, "limit": limit},
    )
    return [{"category": r.category, "count": r.count} for r in result.fetchall()]
