---
name: changelog-generator
description: Automatically creates user-facing changelogs from git commits. Use this skill whenever the user asks to generate release notes, create a changelog, summarize recent changes for users/customers, write app store update descriptions, prepare a product update, or document what changed between versions or over a time period. Also trigger when the user says things like "what did we ship", "write up the changes", "release notes", "update description", or any variation of wanting git history turned into human-readable summaries. Even if they just say "changelog" — use this skill.
---

# Changelog Generator

Transform technical git commits into polished, user-friendly changelogs. The goal is to bridge the gap between developer commit messages and what end users actually care about — features they can use, problems that got fixed, and improvements they'll notice.

## Step 1: Determine the Commit Range

Ask the user or infer from context which commits to include. Common patterns:

- **Since last tag/release**: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
- **Between two tags**: `git log v1.2.0..v1.3.0 --oneline`
- **Date range**: `git log --after="2026-03-01" --before="2026-03-15" --oneline`
- **Last N days**: `git log --after="$(date -d '7 days ago' +%Y-%m-%d)" --oneline`
- **All commits on a branch**: `git log main..HEAD --oneline`

If the user is vague (e.g., "make a changelog"), check for tags first (`git tag --sort=-creatordate | head -5`). If tags exist, use the range since the latest tag. If no tags, ask the user for a date range or commit count.

Run `git log` with `--format="%h %s"` for the initial scan, then read full commit messages with `git log --format="%h%n%s%n%b%n---"` for the selected range to get the complete context.

## Step 2: Categorize and Filter

### Categories

Group commits into these categories (skip any category with zero items):

| Category | Icon | What belongs here |
|----------|------|-------------------|
| New Features | New | New user-facing capabilities |
| Improvements | Improved | Enhancements to existing features |
| Bug Fixes | Fixed | Corrections to broken behavior |
| Breaking Changes | Breaking | Changes that alter existing behavior |
| Security | Security | Security-related fixes or improvements |

### What to Exclude

Filter out commits that users don't care about:
- Pure refactoring (no behavior change)
- Test additions/modifications
- CI/CD pipeline changes
- Documentation updates (unless user-facing docs)
- Dependency bumps (unless they fix a user-visible issue)
- Merge commits
- Planning/roadmap file changes

Use judgment here — if a "refactor" commit actually changed behavior users would notice, include it. If a "feat" commit is purely internal infrastructure, skip it.

### Grouping Related Commits

Multiple commits often contribute to a single user-facing change. Group them into one changelog entry rather than listing each commit separately. For example, if there are 5 commits building out a calendar feature across multiple PRs, that's one "Calendar View" entry, not five.

Look at commit prefixes, file paths, and branch context to identify related work.

## Step 3: Rewrite for Users

This is the most important step. For each entry, translate from developer language to user language.

**The key question**: "If I were a user of this app, what would I want to know?"

### Translation Principles

1. **Lead with the benefit**, not the implementation. Users care about what they can do, not how it works under the hood.

2. **Be specific** about what changed. "Improved performance" is vague. "App loads 2x faster on startup" is useful.

3. **Use active voice** and plain language. No jargon, no component names, no file paths.

4. **One sentence is often enough.** Don't pad entries with filler.

### Examples

| Commit Message | Changelog Entry |
|----------------|-----------------|
| `feat(calendar): add CalendarScreen and wire CalendarTab as 2nd nav tab` | **Calendar View**: See your complete workout history on a monthly calendar. Days you trained are highlighted — tap any day to see the full session details. |
| `fix: resolve timezone offset in date picker causing wrong date selection` | Fixed an issue where selecting a date could pick the wrong day depending on your timezone |
| `feat(10-02): wire PR check into WorkoutScreen with double haptic` | **Personal Record Alerts**: You'll now get a celebration notification with haptic feedback whenever you beat a personal record during your workout |
| `refactor: extract utils/dates.ts from inline date formatting` | *(exclude — no user-facing change)* |

## Step 4: Format the Output

Use this structure (adapt the title to match the context — version number, date range, or product update):

```markdown
# What's New in v1.3

## New

- **Feature Name**: One or two sentences describing what the user can now do.

- **Another Feature**: Description of the capability.

## Improved

- **Area Improved**: What's better now and why they'd care.

## Fixed

- Fixed [description of what was broken and that it now works]
- Resolved [another fix in plain language]
```

### Formatting Rules

- **Bold the feature/area name** for scanability
- New features get a name + description (2 lines max)
- Bug fixes can be simpler — one line each, no bold name needed
- Keep the entire changelog concise — aim for something someone would actually read in 60 seconds
- No commit hashes, PR numbers, or internal references unless the user asks for them

## Step 5: Check for a Style Guide

Before outputting, check if the project has a `CHANGELOG_STYLE.md`, `CHANGELOG.md`, or similar file that establishes a formatting convention. If one exists, adapt the output to match its style (emoji usage, heading levels, bullet format, etc.).

If the project has an existing `CHANGELOG.md`, offer to prepend the new entry to it.

## Step 6: Present and Offer Variants

Show the generated changelog to the user. Then offer:

- "Want me to save this to CHANGELOG.md?"
- "Need a shorter version for an app store description?"
- "Want a version formatted for email/social media?"

Only offer these if they seem relevant to the user's context.
