# Phase 38: Food Search & Custom Foods - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 38-food-search-custom-foods
**Areas discussed:** Search UI & interaction, Frequent foods display, Custom food creation, Result display & selection

---

## Search UI & Interaction

### Where should the food search bar live?

| Option | Description | Selected |
|--------|-------------|----------|
| New full-screen modal | Dedicated FoodSearchModal slides up when triggered from AddMealModal or MealLibrary | ✓ |
| Inline in AddMealModal | Embed search bar directly into existing AddMealModal above manual macro fields | |
| New tab/screen | Standalone screen in the navigation stack | |

**User's choice:** New full-screen modal
**Notes:** Keeps existing flows untouched, clean separation of concerns

### How should type-to-search feel?

| Option | Description | Selected |
|--------|-------------|----------|
| Instant filter with 200ms debounce | Results update as user types, no search button | ✓ |
| Search on submit | User types then taps search button | |
| 300ms debounce with skeleton | Longer debounce with skeleton placeholders | |

**User's choice:** Instant filter with 200ms debounce
**Notes:** Local SQLite makes this fast enough; follows UX best practice of showing predictions as user types

### What shows when search is empty?

| Option | Description | Selected |
|--------|-------------|----------|
| Frequent foods only | FREQUENTLY LOGGED section with most-used foods ranked by log count | ✓ |
| Frequent foods + category browse | Frequent foods at top, browsable categories below | |
| Just the search prompt | Empty screen with search bar and hint text | |

**User's choice:** Frequent foods only
**Notes:** Clean and focused, becomes more useful over time as user logs meals

### How should 'create custom food' appear on no results?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline CTA card | Card in results area with no-results message and Create Custom Food button | ✓ |
| Persistent button at bottom | Always-visible button regardless of results | |
| You decide | Claude's discretion | |

**User's choice:** Inline CTA card
**Notes:** Follows UX guideline: never show blank no-results screen, always offer actionable next step

---

## Frequent Foods Display

### How should frequent foods be laid out?

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical card list | Full-width surfaceElevated cards, same style as search results | ✓ |
| Horizontal scrolling chips | Compact chips like QuickAddButtons pattern | |
| Two-column grid | Small cards in 2-column layout | |

**User's choice:** Vertical card list
**Notes:** Consistent with nested card system, shows full macro info at a glance

### How many frequent foods?

| Option | Description | Selected |
|--------|-------------|----------|
| Top 10 | Ten most-used foods | ✓ |
| Top 5 | Just five | |
| Top 20 | Up to twenty | |

**User's choice:** Top 10
**Notes:** Covers typical staple foods without overwhelming the screen

---

## Custom Food Creation

### How should the form appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Slide-up within search modal | Form slides up as section within FoodSearchModal, pre-fills search query as name | ✓ |
| Separate nested modal | New modal stacked on top of FoodSearchModal | |
| You decide | Claude's discretion | |

**User's choice:** Slide-up within search modal
**Notes:** Keeps user in context, back arrow returns to search

### What fields should the form require?

| Option | Description | Selected |
|--------|-------------|----------|
| Name + P/C/F per 100g | Name and three macro fields, calories auto-computed | ✓ |
| Name + P/C/F + category | Same plus optional category dropdown | |
| Name + P/C/F per serving | Macros per serving size instead of per 100g | |

**User's choice:** Name + P/C/F per 100g
**Notes:** Matches foods table schema exactly, simplest possible form

### After saving a custom food?

| Option | Description | Selected |
|--------|-------------|----------|
| Return to search, auto-select new food | Navigate back, immediately return the new food to caller | ✓ |
| Return to search with success toast | Go back, show toast, user taps to select manually | |
| Stay on form for another entry | Keep form open for batch creation | |

**User's choice:** Return to search, auto-select new food
**Notes:** Zero extra taps to use the food after creation

---

## Result Display & Selection

### What info per search result row?

| Option | Description | Selected |
|--------|-------------|----------|
| Name + P/C/F per 100g + calories | Full info: name, category, macro line with calories | ✓ |
| Name + calories only | Simpler, just name and kcal | |
| Name + macro color bars | Visual bars showing P/C/F ratio | |

**User's choice:** Name + P/C/F per 100g + calories
**Notes:** Enough info to pick the right food without opening a detail view

### What happens on tap?

| Option | Description | Selected |
|--------|-------------|----------|
| Select and close modal | Tapping selects food, returns data to caller, closes modal | ✓ |
| Open food detail first | Show detail view before selecting | |
| You decide | Claude's discretion | |

**User's choice:** Select and close modal
**Notes:** Minimum friction; detail view not needed when macros are already visible in the result row

---

## Claude's Discretion

- FoodSearchModal animation timing and easing
- FoodResultItem internal layout spacing
- Keyboard auto-focus and dismiss behavior
- Frequency count query implementation
- Frequency boost integration with token search
- FlatList vs ScrollView choice
- Toast/haptic on custom food save

## Deferred Ideas

None — discussion stayed within phase scope
