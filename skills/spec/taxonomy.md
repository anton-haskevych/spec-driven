# Taxonomy — Controlled Vocabulary

## status (single value)

Lifecycle order: `prep` → `draft` → `active` → `done` / `good-enough`.

- `prep` — Reconnaissance stage: folder + `product-brief.md` + `research/`; spec body not yet written
- `draft` — Spec written, not yet under implementation (may be in review)
- `active` — Implementation in progress
- `paused` — Implementation started, intentionally on hold
- `good-enough` — Acceptable state, not pursuing further
- `done` — Completed
- `abandoned` — Dropped; kept for the record

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

---

For spec file layout rules (file tree, phase entry rules, ledger format, in-flight semantics), see the layout sections in `SKILL.md`.
