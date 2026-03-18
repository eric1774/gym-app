# S01: Data Foundation

**Goal:** Build the versioned schema migration system that retrofits all existing v1.
**Demo:** Build the versioned schema migration system that retrofits all existing v1.

## Must-Haves


## Tasks

- [x] **T01: 04-data-foundation 01**
  - Build the versioned schema migration system that retrofits all existing v1.0 tables and creates new protein tables, plus the type definitions and local-date utility that the protein repository will consume.

Purpose: Replace the fragile CREATE TABLE IF NOT EXISTS + try/catch ALTER TABLE pattern with a proper versioned migration runner. Establish type contracts and date utilities that Plan 02 (protein repository) depends on.
Output: Migration system running on app launch, protein tables created, types exported, date utility ready.
- [x] **T02: 04-data-foundation 02**
  - Build the protein repository module with full CRUD operations for meals, goal management, and daily aggregation queries, following the exact repository pattern established by sessions.ts, exercises.ts, and other existing modules.

Purpose: Provide the complete data access layer that Phase 5 (Protein Tab UI) will consume. All protein data operations go through this module.
Output: src/db/protein.ts with all repository functions, re-exported through src/db/index.ts barrel.

## Files Likely Touched

- `src/types/index.ts`
- `src/utils/dates.ts`
- `src/db/migrations.ts`
- `src/db/database.ts`
- `src/db/schema.ts`
- `src/db/protein.ts`
- `src/db/index.ts`
