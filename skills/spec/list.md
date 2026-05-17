# List Mode

Print a single markdown table of every spec in the project, with metadata and progress counts. No briefing, no questions — just the table.

## 1. Scan for specs

Find all spec `CLAUDE.md` files via two globs (run in parallel):

- `docs/specs/*/CLAUDE.md` — the default convention
- `*/docs/specs/*/CLAUDE.md` — one level deep, catches project-specific roots like `landing/docs/specs/`, `frontend/docs/specs/`, etc.

Deduplicate the result set by absolute path. If both globs return zero matches, print: `No specs found.` and stop.

## 2. Parse each spec

For each spec folder found, read in parallel:

1. `CLAUDE.md` — parse YAML frontmatter (if present) for `status`, `area`, `domain`, `scope`, `created`, `updated`. Missing frontmatter is allowed (legacy specs); record those fields as `—`.
2. `progress.md` — count `- [ ]` (open) and `- [x]` (done) top-level checkbox items. `total = open + done`. If `progress.md` is missing, render `—`.

The taxonomy injected at the top of `SKILL.md` (plugin + optional project override) defines the valid `status`, `area`, `domain`, and `scope` values.

## 3. Apply filter

If `$ARGUMENTS` (after stripping the `list` token) contains a value, match it against:

1. Any value in the injected taxonomy (`status`, `area`, `domain`, `scope`). If matched, include only specs whose frontmatter contains that value.
2. Otherwise, treat as free text and case-insensitively match against the spec folder name.

If no filter: include all specs.

## 4. Sort

Sort by status priority, then by `updated` descending:

1. `active` (or legacy `in-progress`)
2. `draft`
3. `paused`
4. `good-enough`
5. `done`
6. `abandoned`
7. No frontmatter (legacy) — last

Within each status bucket, sort by `updated` descending (specs missing `updated` go to the bottom of their bucket).

## 5. Render

**The output is a markdown table. This is mandatory** — never render as cards, key/value blocks, or separator-divided sections.

```
| Spec | Status | Area | Domain | Scope | Updated | Progress |
|------|--------|------|--------|-------|---------|----------|
| sell-center-hub | active | fullstack | sell-center | feature | 2026-02-15 | 45/52 |
| trial-onboarding-v2 | done | fullstack | onboarding | feature | 2026-02-20 | 52/52 |
```

### Required output rules

- The header row is exactly: `| Spec | Status | Area | Domain | Scope | Updated | Progress |`.
- One row per spec.
- `Spec` cell: the folder name (kebab-case slug).
- Metadata cells (`Status`, `Area`, `Domain`, `Scope`): if multi-value, join with `, `. If missing, render `—`.
- `Updated`: ISO date only (`YYYY-MM-DD`), drop any time/timezone suffix. If missing, render `—`.
- `Progress`: `done/total` (e.g., `12/20`). If `progress.md` missing, render `—`.
- Pipes inside any cell must be escaped (`\|`).

### Summary line

After the table, one line listing non-zero counts:

```
**N active, N draft, N done.** Legacy: N.
```

Only include statuses with at least 1 spec. If no legacy (no-frontmatter) specs exist, omit the `Legacy:` clause.

## 6. Edge cases

- **No specs found at all** — print `No specs found.` and stop. Do not render an empty table.
- **Spec folder has no `CLAUDE.md`** — skip silently (not a real spec).
- **Frontmatter parse error** — treat the spec as legacy (no metadata), still include in the table with `—` cells.
- **`progress.md` exists but contains zero checkboxes** — render `0/0`.
