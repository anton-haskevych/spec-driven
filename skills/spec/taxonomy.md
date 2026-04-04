# Taxonomy — Controlled Vocabulary

## status (single value)
- `active` — Work in progress
- `done` — Completed
- `good-enough` — Acceptable state, not pursuing further

## scope (multi-value)
- `feature` — New user-facing capability
- `refactor` — Restructure without behavior change
- `bugfix` — Fix broken behavior
- `improvement` — Infrastructure, tooling, DX, or non-user-facing enhancement
- `uiux-design` — UI/UX redesign of existing surface

## area (multi-value) — project-defined
If the project provides `.claude/taxonomy.md`, use its `area` values.
Otherwise, use free-form descriptive values (e.g., "backend", "frontend", "infra", "docs").

## domain (multi-value) — project-defined
If the project provides `.claude/taxonomy.md`, use its `domain` values.
Otherwise, use free-form descriptive values that name the business domain or subsystem.

## Field types
- `created` — ISO 8601 datetime with timezone (e.g., 2026-03-13T18:30:00+02:00)
- `updated` — ISO 8601 datetime with timezone
- `specs` — string array of spec slugs (journals only)
