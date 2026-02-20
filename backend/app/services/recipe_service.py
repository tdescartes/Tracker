"""
Recipe Suggestions Service — Phase 2
Matches pantry items against a curated recipe database.
Falls back to keyword matching when no external API is configured.
Optionally integrates with Spoonacular API if SPOONACULAR_API_KEY is set.
"""
import httpx
from typing import Optional
from app.config import settings

# ---------------------------------------------------------------------------
# Built-in recipe database (keyword → recipe)
# ---------------------------------------------------------------------------
BUILTIN_RECIPES: list[dict] = [
    {
        "name": "Classic Pasta Marinara",
        "time_minutes": 20,
        "ingredients": ["pasta", "tomato", "garlic", "olive oil", "basil"],
        "instructions": "Cook pasta. Sauté garlic in oil, add crushed tomatoes, simmer 10 min. Toss with pasta. Top with basil.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Chicken Stir-Fry",
        "time_minutes": 25,
        "ingredients": ["chicken", "soy sauce", "garlic", "ginger", "broccoli", "bell pepper", "rice"],
        "instructions": "Slice chicken, stir-fry with garlic and ginger, add vegetables and soy sauce. Serve over rice.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Veggie Omelette",
        "time_minutes": 10,
        "ingredients": ["egg", "milk", "cheese", "bell pepper", "onion", "spinach"],
        "instructions": "Whisk eggs with milk, pour into buttered pan, add veggies and cheese, fold and serve.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Avocado Toast",
        "time_minutes": 5,
        "ingredients": ["bread", "avocado", "lemon", "salt", "egg"],
        "instructions": "Toast bread, mash avocado with lemon juice and salt, top with optional fried egg.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Tuna Salad",
        "time_minutes": 10,
        "ingredients": ["tuna", "mayonnaise", "celery", "onion", "lemon"],
        "instructions": "Flake tuna, mix with mayo, diced celery, and onion, season with lemon and pepper.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Vegetable Soup",
        "time_minutes": 35,
        "ingredients": ["carrot", "celery", "onion", "potato", "tomato", "broth", "garlic"],
        "instructions": "Dice all vegetables, sauté onion and garlic, add rest with broth, simmer 25 minutes.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Banana Smoothie",
        "time_minutes": 5,
        "ingredients": ["banana", "milk", "yogurt", "honey"],
        "instructions": "Blend banana, milk, yogurt, and honey until smooth. Serve chilled.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Grilled Cheese Sandwich",
        "time_minutes": 8,
        "ingredients": ["bread", "cheese", "butter"],
        "instructions": "Butter bread slices, fill with cheese, cook in pan on medium heat until golden each side.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Egg Fried Rice",
        "time_minutes": 15,
        "ingredients": ["rice", "egg", "soy sauce", "garlic", "onion", "peas", "carrot"],
        "instructions": "Heat oil, scramble eggs, add day-old rice, soy sauce, and vegetables. Toss until hot.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Bean & Cheese Quesadillas",
        "time_minutes": 10,
        "ingredients": ["tortilla", "bean", "cheese", "salsa", "sour cream"],
        "instructions": "Layer beans and cheese on tortilla, fold and cook in dry pan until crispy. Serve with salsa.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Overnight Oats",
        "time_minutes": 5,
        "ingredients": ["oat", "milk", "yogurt", "banana", "honey", "berry"],
        "instructions": "Mix oats, milk, and yogurt in jar. Refrigerate overnight. Top with fruit and honey.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Tomato Basil Soup",
        "time_minutes": 30,
        "ingredients": ["tomato", "basil", "garlic", "onion", "cream", "broth"],
        "instructions": "Sauté onion and garlic, add tomatoes and broth, simmer 20 min, blend smooth, stir in cream.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Peanut Butter Banana Toast",
        "time_minutes": 3,
        "ingredients": ["bread", "peanut butter", "banana", "honey"],
        "instructions": "Toast bread, spread peanut butter, top with banana slices and drizzle honey.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Lemon Garlic Salmon",
        "time_minutes": 20,
        "ingredients": ["salmon", "lemon", "garlic", "butter", "herb"],
        "instructions": "Season salmon, sear in butter with garlic 4 min per side, finish with lemon juice.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Greek Salad",
        "time_minutes": 10,
        "ingredients": ["cucumber", "tomato", "olive", "feta", "onion", "olive oil", "oregano"],
        "instructions": "Chop vegetables, toss with olives, feta, olive oil, and oregano.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Potato Hash",
        "time_minutes": 20,
        "ingredients": ["potato", "onion", "bell pepper", "egg", "butter"],
        "instructions": "Dice and pan-fry potatoes until crispy, add onion and pepper, top with fried eggs.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Turkey & Cheese Wrap",
        "time_minutes": 5,
        "ingredients": ["tortilla", "turkey", "cheese", "lettuce", "tomato", "mayonnaise"],
        "instructions": "Lay tortilla, spread mayo, layer turkey, cheese, lettuce, tomato, roll tight.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "French Toast",
        "time_minutes": 15,
        "ingredients": ["bread", "egg", "milk", "cinnamon", "vanilla", "butter", "maple syrup"],
        "instructions": "Whisk egg, milk, cinnamon, vanilla. Soak bread, cook in buttered pan. Serve with syrup.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Chickpea Curry",
        "time_minutes": 30,
        "ingredients": ["chickpea", "tomato", "onion", "garlic", "ginger", "curry powder", "coconut milk", "rice"],
        "instructions": "Sauté onion, garlic, ginger, add curry powder, tomatoes, chickpeas, coconut milk, simmer 20 min.",
        "image_url": None,
        "source": "builtin",
    },
    {
        "name": "Caprese Salad",
        "time_minutes": 5,
        "ingredients": ["tomato", "mozzarella", "basil", "olive oil", "balsamic"],
        "instructions": "Layer tomato and mozzarella slices, top with basil, drizzle with olive oil and balsamic.",
        "image_url": None,
        "source": "builtin",
    },
]


def suggest_recipes(pantry_item_names: list[str], limit: int = 5) -> list[dict]:
    """
    Given a list of pantry item names, return recipes that can be made
    using the most available ingredients.

    Each returned recipe includes:
      - name, time_minutes, ingredients, instructions
      - matched_count: how many pantry items match
      - missing: list of ingredients not in pantry
      - match_score: percentage of recipe ingredients available
    """
    normalized_pantry = {_normalize(n) for n in pantry_item_names}

    scored: list[tuple[float, dict]] = []
    for recipe in BUILTIN_RECIPES:
        matched = [i for i in recipe["ingredients"] if any(
            _normalize(i) in norm or norm in _normalize(i)
            for norm in normalized_pantry
        )]
        missing = [i for i in recipe["ingredients"] if i not in matched]
        score = len(matched) / len(recipe["ingredients"]) if recipe["ingredients"] else 0

        if score > 0:  # Only suggest if at least one ingredient matches
            scored.append((score, {
                **recipe,
                "matched_count": len(matched),
                "missing": missing,
                "match_score": round(score * 100, 1),
            }))

    # Sort by score descending
    scored.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in scored[:limit]]


async def suggest_recipes_spoonacular(
    pantry_item_names: list[str],
    limit: int = 5,
    api_key: Optional[str] = None,
) -> list[dict]:
    """
    Uses Spoonacular's 'findByIngredients' endpoint when an API key is available.
    Falls back to builtin on any error.
    """
    key = api_key or getattr(settings, "SPOONACULAR_API_KEY", None)
    if not key:
        return suggest_recipes(pantry_item_names, limit)

    ingredients = ",".join(pantry_item_names[:20])  # API max
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.spoonacular.com/recipes/findByIngredients",
                params={
                    "ingredients": ingredients,
                    "number": limit,
                    "ranking": 2,  # Minimize missing ingredients
                    "ignorePantry": True,
                    "apiKey": key,
                },
            )
            if resp.status_code != 200:
                return suggest_recipes(pantry_item_names, limit)

            data = resp.json()
            results = []
            for item in data:
                used = [u["originalName"] for u in item.get("usedIngredients", [])]
                missed = [m["originalName"] for m in item.get("missedIngredients", [])]
                total = len(used) + len(missed)
                score = len(used) / total if total else 0
                results.append({
                    "id": item["id"],
                    "name": item["title"],
                    "image_url": item.get("image"),
                    "time_minutes": None,
                    "ingredients": used + missed,
                    "instructions": f"https://spoonacular.com/recipes/{item['title'].lower().replace(' ', '-')}-{item['id']}",
                    "matched_count": len(used),
                    "missing": missed,
                    "match_score": round(score * 100, 1),
                    "source": "spoonacular",
                })
            return results
    except Exception:
        return suggest_recipes(pantry_item_names, limit)


def _normalize(text: str) -> str:
    return text.lower().strip().rstrip("s")  # Simple singularization
