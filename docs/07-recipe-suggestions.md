# Recipe Suggestions

## Landing Page Copy

**Headline**: Recipes from what you already have

**Subheadline**: No meal planning required. The app reads your pantry, prioritizes expiring ingredients, and suggests recipes you can actually make tonight — with a match score so you know exactly what's missing.

**Bullets**:
- **Pantry-aware matching** — Recipes are ranked by how many of your current pantry items they use. 80% match? You only need one ingredient
- **Expiring-first mode** — Items expiring within 4 days are weighted 2× so the app steers you toward using them before they spoil
- **20 built-in + Spoonacular fallback** — Works offline with a curated recipe database. Connect a Spoonacular API key for thousands more

**CTA**: See what you can cook →

---

## Problem Statement

"What should I cook tonight?" is a daily decision that wastes time and often leads to buying ingredients you don't need — while existing pantry items expire unused. Recipe apps suggest meals you'd need to shop for. Users need suggestions based on what they *already have*, with priority given to what's about to go bad.

## Solution

A recipe engine that reads the household's current pantry inventory, fuzzy-matches items against recipe ingredient lists, double-weights expiring items, and returns ranked suggestions with match scores and missing ingredient lists. Works entirely offline with 20 built-in recipes, or scales to thousands via Spoonacular API integration.

---

## User Flow

```
1. Navigate to Recipes tab
         │
         ▼
2. App fetches active pantry items (UNOPENED + OPENED)
         │
         ▼
3. Recipe engine scores all recipes:
   ├── For each recipe:
   │   ├── Count matched pantry items (fuzzy match)
   │   ├── Count missing items
   │   └── Calculate match_score = matched / total × 100
   └── Sort by match_score descending
         │
         ▼
4. Results displayed:
   ├── Recipe name + cook time
   ├── Match score badge (e.g., "85% match")
   ├── Matched ingredients (highlighted)
   ├── Missing ingredients (dimmed)
   └── Instructions (expandable)
         │
         ▼
5. Optional: Search by ingredient or recipe name
```

---

## Technical Implementation

### Matching Algorithm

```
normalize(text) = text.lowercase().trim().rstrip("s")  # Simple singularize

For each recipe:
  matched = ingredients where:
    normalize(ingredient) ∈ normalize(pantry_item)
    OR normalize(pantry_item) ∈ normalize(ingredient)
  
  missing = ingredients - matched
  match_score = len(matched) / len(ingredients) × 100

  Only include if match_score > 0
  Sort by match_score descending
```

The fuzzy matching handles plurals ("tomato" matches "tomatoes") and partial names ("chicken" matches "chicken breast" in pantry).

### Expiring Item Weighting

When `expiring_first=true` (default):

```
today = date.today()

For each pantry item:
  item_names.append(item.name)
  
  if item.expiration_date ≤ today + 4 days:
    item_names.append(item.name)  # Double-weight
```

This causes expiring items to appear twice in the match input, effectively scoring recipes that use them ~2× higher. Simple, effective, no complex weighting math.

### Built-in Recipe Database

20 curated recipes covering common pantry combinations:

| Recipe | Key Ingredients | Cook Time |
|--------|----------------|-----------|
| Classic Pasta Marinara | pasta, tomato, garlic, olive oil, basil | 20 min |
| Chicken Stir-Fry | chicken, soy sauce, broccoli, bell pepper, rice | 25 min |
| Veggie Omelette | egg, cheese, bell pepper, onion, spinach | 10 min |
| Avocado Toast | bread, avocado, lemon, egg | 5 min |
| Tuna Salad | tuna, mayonnaise, celery, onion, lemon | 10 min |
| Vegetable Soup | carrot, celery, onion, potato, tomato, broth | 35 min |
| Banana Smoothie | banana, milk, yogurt, honey | 5 min |
| Grilled Cheese | bread, cheese, butter | 8 min |
| Egg Fried Rice | rice, egg, soy sauce, garlic, peas, carrot | 15 min |
| Bean & Cheese Quesadillas | tortilla, bean, cheese, salsa | 10 min |
| Overnight Oats | oat, milk, yogurt, banana, honey, berry | 5 min |
| Tomato Basil Soup | tomato, basil, garlic, cream, broth | 30 min |
| PB Banana Toast | bread, peanut butter, banana, honey | 3 min |
| Lemon Garlic Salmon | salmon, lemon, garlic, butter | 20 min |
| Greek Salad | cucumber, tomato, olive, feta, onion | 10 min |
| Potato Hash | potato, onion, bell pepper, egg, butter | 20 min |
| Turkey & Cheese Wrap | tortilla, turkey, cheese, lettuce, tomato | 5 min |
| French Toast | bread, egg, milk, cinnamon, vanilla, maple syrup | 15 min |
| Chickpea Curry | chickpea, tomato, onion, curry powder, coconut milk | 30 min |
| Caprese Salad | tomato, mozzarella, basil, olive oil, balsamic | 5 min |

### Spoonacular Fallback

When `SPOONACULAR_API_KEY` is set:

```
GET https://api.spoonacular.com/recipes/findByIngredients
  ?ingredients=chicken,rice,garlic,...  (max 20)
  &number=5
  &ranking=2          # Minimize missing ingredients
  &ignorePantry=true
  &apiKey=...
```

Returns: recipe name, image, used ingredients, missed ingredients, link to full instructions. Normalized to the same response shape as built-in recipes.

On any API error → graceful fallback to built-in database.

---

## Platform Behavior

### Web
- **Recipe cards**: Grid layout with match % badge, cook time, ingredient tags
- **Expand**: Click card to see full instructions
- **Search**: Text input with live results from built-in database
- **Loading**: `RecipesSkeleton` — 4 card placeholders with image area + lines

### Mobile
- **Recipe cards**: Vertical scrollable list
- **Match badge**: Color-coded (green ≥70%, yellow ≥40%, grey <40%)
- **Missing items**: Tappable to add directly to shopping list
- **Haptics**: Light impact on card expand

---

## API Endpoints

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | `/api/recipes/suggestions` | `limit` (1-20), `expiring_first` (bool) | Pantry-based recipe suggestions |
| GET | `/api/recipes/search` | `q` (min 2 chars), `limit` (1-10) | Search by ingredient or name |

### Response Shape

```json
{
  "suggestions": [
    {
      "name": "Egg Fried Rice",
      "time_minutes": 15,
      "ingredients": ["rice", "egg", "soy sauce", "garlic", "onion", "peas", "carrot"],
      "instructions": "Heat oil, scramble eggs, add day-old rice...",
      "matched_count": 5,
      "missing": ["peas", "carrot"],
      "match_score": 71.4,
      "source": "builtin"
    }
  ],
  "pantry_item_count": 23,
  "expiring_first": true
}
```

---

## Connected Features

| Trigger | Effect |
|---------|--------|
| Pantry updated | Recipe suggestions change on next fetch |
| Item marked CONSUMED | Removed from matching pool |
| Expiring items detected | Boosted in recipe matching |
| Missing ingredient tapped | Can be added to shopping list (pantry) |
| Receipt scanned → pantry populated | More ingredients → better matches |
