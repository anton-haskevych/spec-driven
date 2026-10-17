# Taxonomy — Controlled Vocabulary

## status (single value)

Lifecycle order: `prep` → `draft` → `active` ⇄ `paused` → `done` / `good-enough` / `abandoned`. How a spec ended and the `stale:` health flag: SKILL.md → *Relations between specs* → *Lifecycle*.

- `prep` — Reconnaissance stage: folder + `product-brief.md` + `research/` (a spun-off spec starts with `seed.md`); spec body not yet written
- `draft` — Spec written, not yet under implementation (may be in review)
- `active` — Implementation in progress
- `paused` — Implementation started, intentionally on hold
- `good-enough` — Main part shipped; leftovers moved to the backlog
- `done` — Shipped
- `abandoned` — Didn't ship; kept for the record with `dropped:` or a spec that `supersedes:` it

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
- `stale` — one line: what in an open spec is out of date
- `dropped` — one line: why an abandoned spec didn't ship
- `specs` — string array of spec slugs (journals only)

---

For spec file layout rules (file tree, phase entry rules, ledger format, in-flight semantics), see the layout sections in `SKILL.md`.
