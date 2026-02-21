"""
Recipes router — Phase 2
GET /api/recipes/suggestions  → suggest recipes from current pantry
GET /api/recipes/search       → search by ingredient or name
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.recipe_service import suggest_recipes, suggest_recipes_spoonacular
from app.config import settings

router = APIRouter()


@router.get("/suggestions")
async def get_recipe_suggestions(
    limit: int = Query(default=5, ge=1, le=20),
    expiring_first: bool = Query(default=True, description="Prioritize expiring items"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns recipe suggestions based on the household's current pantry.
    When expiring_first=true, expiring items are weighted more heavily so
    the app suggests recipes that use them up first.
    """
    # Fetch active pantry items
    query = text("""
        SELECT pi.name, pi.expiration_date, pi.status
        FROM pantry_items pi
        WHERE pi.household_id = :hid
          AND pi.status IN ('UNOPENED', 'OPENED')
        ORDER BY pi.expiration_date ASC NULLS LAST
    """)
    result = await db.execute(query, {"hid": current_user.household_id})
    rows = result.fetchall()

    if not rows:
        return {"suggestions": [], "pantry_item_count": 0}

    # Build item name list — if expiring_first, repeat expiring items to boost weight
    from datetime import date, timedelta
    today = date.today()
    item_names = []
    for r in rows:
        item_names.append(r.name)
        # Double-weight items expiring within 4 days
        if expiring_first and r.expiration_date and r.expiration_date <= today + timedelta(days=4):
            item_names.append(r.name)

    # Use Spoonacular if configured, else fallback to builtin
    api_key = getattr(settings, "SPOONACULAR_API_KEY", None)
    if api_key:
        suggestions = await suggest_recipes_spoonacular(item_names, limit=limit, api_key=api_key)
    else:
        suggestions = suggest_recipes(item_names, limit=limit)

    return {
        "suggestions": suggestions,
        "pantry_item_count": len(rows),
        "expiring_first": expiring_first,
    }


@router.get("/search")
async def search_recipes(
    q: str = Query(..., min_length=2, description="Ingredient or recipe name"),
    limit: int = Query(default=5, ge=1, le=10),
    current_user: User = Depends(get_current_user),
):
    """Search built-in recipes by ingredient or name."""
    from app.services.recipe_service import BUILTIN_RECIPES
    q_lower = q.lower()
    matches = [
        {**r, "matched_count": 0, "missing": [], "match_score": 100.0}
        for r in BUILTIN_RECIPES
        if q_lower in r["name"].lower() or any(q_lower in ing for ing in r["ingredients"])
    ]
    return {"results": matches[:limit], "query": q}
