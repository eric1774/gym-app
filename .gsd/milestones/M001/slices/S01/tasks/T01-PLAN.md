# T01: 04-data-foundation 01

**Slice:** S01 — **Milestone:** M001

## Description

Build the versioned schema migration system that retrofits all existing v1.0 tables and creates new protein tables, plus the type definitions and local-date utility that the protein repository will consume.

Purpose: Replace the fragile CREATE TABLE IF NOT EXISTS + try/catch ALTER TABLE pattern with a proper versioned migration runner. Establish type contracts and date utilities that Plan 02 (protein repository) depends on.
Output: Migration system running on app launch, protein tables created, types exported, date utility ready.

## Must-Haves

- [ ] "App launches without error after migration system replaces inline DDL"
- [ ] "schema_version table tracks current migration version correctly"
- [ ] "Existing users (pre-migration databases) are bootstrapped to version 2 without data loss"
- [ ] "New installs run all migrations 1-3 sequentially"
- [ ] "Protein tables (meals, protein_settings) exist after migration 3"
- [ ] "getLocalDateString() returns correct YYYY-MM-DD for local timezone, not UTC"

## Files

- `src/types/index.ts`
- `src/utils/dates.ts`
- `src/db/migrations.ts`
- `src/db/database.ts`
- `src/db/schema.ts`
