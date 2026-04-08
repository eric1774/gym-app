# Requirements: GymTrack

**Defined:** 2026-04-08
**Core Value:** Fast, frictionless set logging mid-workout

## v1.9 Requirements

Requirements for Food Database & Meal Builder milestone. Each maps to roadmap phases.

### Data Foundation

- [x] **DATA-01**: User's app seeds ~8,000 USDA foods into SQLite on first launch after upgrade (migration v12) — Phase 37 ✓
- [x] **DATA-02**: User sees a loading indicator during first-launch food database seeding — Phase 37 ✓
- [x] **DATA-03**: User's custom foods persist across USDA data re-seeds — Phase 37 ✓

### Food Search

- [ ] **SRCH-01**: User can search foods by name with fuzzy token matching (handles abbreviations/typos)
- [ ] **SRCH-02**: User sees search results within 250ms with max 20 results
- [ ] **SRCH-03**: User's frequently-logged foods appear before typing (ranked by usage count)
- [ ] **SRCH-04**: User's frequently-logged foods are boosted in search results

### Custom Foods

- [ ] **CUST-01**: User can create a custom food with name and macros per 100g when a search yields no results
- [ ] **CUST-02**: User's custom foods appear in search results and behave identically to USDA foods

### Meal Builder

- [ ] **BLDR-01**: User can search and add multiple foods to a single meal, each with an exact gram weight
- [ ] **BLDR-02**: User sees live-computed per-food macro breakdown (P/C/F) and calories as they enter grams
- [ ] **BLDR-03**: User sees a running total of combined macros and calories across all foods in the meal
- [ ] **BLDR-04**: User can remove a food from the meal before logging
- [ ] **BLDR-05**: User can tap a food row to adjust its gram quantity (reopens gram input with live preview)
- [ ] **BLDR-06**: User selects meal type and date/time at the end of the builder flow before logging
- [ ] **BLDR-07**: User sees an auto-generated description from food names, editable before logging

### Smart Features

- [ ] **SMRT-01**: User's gram input pre-fills with the last-used quantity for a previously-logged food
- [ ] **SMRT-02**: User can repeat a previous meal (opens builder pre-loaded with that meal's foods and quantities)

### Integration

- [ ] **INTG-01**: User can open the meal builder from both Add Meal (FAB) and Add Library Meal flows
- [ ] **INTG-02**: User can save a built meal to the meal library (summed macros, explicit opt-in)
- [ ] **INTG-03**: User can edit a logged meal's individual food components after logging
- [ ] **INTG-04**: User can still log meals via manual macro entry (existing flow preserved)
- [ ] **INTG-05**: Existing charts, progress cards, streaks, and averages work without modification

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### AI & Scanning

- **SCAN-01**: User can take a photo of a nutrition label and have macros extracted via AI
- **SCAN-02**: User can scan a barcode to look up packaged food nutrition data

### Meal Templates

- **TMPL-01**: User can create meal templates with variable portions scaled by a single multiplier

## Out of Scope

| Feature | Reason |
|---------|--------|
| API-based food lookup | User prefers offline, no cost, no network dependency |
| Barcode scanning | Deferred to future — requires camera integration and external API |
| AI nutrition label scanning | Deferred to future — requires camera + OCR/LLM integration |
| Meal portion scaling templates | Deferred to future — nice-to-have, not core to v1.9 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 37 | Complete |
| DATA-02 | Phase 37 | Complete |
| DATA-03 | Phase 37 | Complete |
| SRCH-01 | Phase 38 | Pending |
| SRCH-02 | Phase 38 | Pending |
| SRCH-03 | Phase 38 | Pending |
| SRCH-04 | Phase 38 | Pending |
| CUST-01 | Phase 38 | Pending |
| CUST-02 | Phase 38 | Pending |
| BLDR-01 | Phase 39 | Pending |
| BLDR-02 | Phase 39 | Pending |
| BLDR-03 | Phase 39 | Pending |
| BLDR-04 | Phase 39 | Pending |
| BLDR-05 | Phase 39 | Pending |
| BLDR-06 | Phase 39 | Pending |
| BLDR-07 | Phase 39 | Pending |
| SMRT-01 | Phase 40 | Pending |
| SMRT-02 | Phase 40 | Pending |
| INTG-01 | Phase 40 | Pending |
| INTG-02 | Phase 40 | Pending |
| INTG-03 | Phase 40 | Pending |
| INTG-04 | Phase 40 | Pending |
| INTG-05 | Phase 40 | Pending |

**Coverage:**
- v1.9 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0
- Complete: 3 (Phase 37)

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after milestone v1.9 initialization (Phase 37 complete)*
