# Status Mode

Print a single-table snapshot of every phase in the spec. No briefing, no ledger filtering, no questions. Just the table.

## 1. Resolve feature name

- If `$ARGUMENTS` (after stripping the `status` token) contains a feature name, use it.
- Else infer from conversation context (same rule as SKILL.md's empty-args branch). Propose a kebab-case slug and confirm with the user only if ambiguous.
- Run SKILL.md → *Preconditions*. A prep-stage spec prints the `status` message from its table and stops.

## 2. Legacy layout

If *Preconditions* flagged a legacy layout, read `legacy-layout.md` → `status` for the inline parse, then continue at §4. Otherwise proceed to §3.

## 3. Read phases

Read `progress.md`. Parse its `## Phases` section into a list of records:

`{ number, name, top_level_checked, pointer }`

For each phase, read the file at `pointer` (flat file or folder's `plan.md`). Read all phase files in parallel.

From each phase file, extract:

- **Goal** — the line starting with `**Goal:**`. Used for the Delivers column. If missing, fall back to the phase title text after `Phase N — `; if that's also blank, leave the cell empty.
- **Implementation summary** — the prose under `## Implementation guidance`. Take the first sentence (split on `. ` followed by a capital), strip trailing punctuation, and truncate to ~100 chars with `…`. Used for the Work column. If the section is missing or empty, **fall back to the first 3 sub-checkbox titles under `## Deliverables` joined with `; ` and truncated to ~100 chars** (sub-checkbox titles are real spec content, not fabrication). If there are no sub-checkboxes either, emit `N/A`.
- **Sub-checkbox counts** — under `## Deliverables`, count `- [x]` (`done_subs`) and `- [ ]` (`open_subs`). `total_subs = done_subs + open_subs`. If no `## Deliverables` section exists, count all `- [x]`/`- [ ]` lines in the file.

## 4. Compute status per phase

Scan phases in numeric order. The **first unchecked phase by number** is the inferred active phase. Phases queued behind it (also unchecked, also no progress) are `pending`, not `active` — they're not the next thing up.

| Condition | Status |
|---|---|
| top-level box is `[x]` | `✅ done` |
| top-level `[ ]` AND `done_subs > 0` | `🟡 WIP (done_subs/total_subs)` |
| top-level `[ ]` AND `done_subs == 0` AND this is the first unchecked phase by number | `🟢 active` |
| top-level `[ ]` AND `done_subs == 0` AND a numerically earlier phase already claimed `active` (or is `WIP`) | `⬜ pending` |

If multiple phases have sub-progress, each is reported as `WIP` — that's the parallel-work surface, intentional. The "first unchecked phase" rule still picks the active marker for any zero-progress phase.

## 5. Render

**The output format is a markdown table. This is mandatory.** Never render the data as cards, vertical "key: value" blocks, separator-divided sections (`────────`), or any other shape. The user expects a table; produce a table.

Output:

```
# <Feature Name> — Status

| Phase | Status | Delivers | Work |
|-------|--------|----------|------|
| 1 — Canonical schema | ✅ done | Single source-of-truth schema for invoices | Define Zod schema in `lib/schema.ts`; wire into existing pipeline |
| 2 — Migration runner | 🟡 WIP (3/5) | Idempotent runner that backfills legacy rows | CLI under `scripts/migrate/`; chunked batches via existing pg client |
| 3 — CSV import | 🟢 active | CSV ingestion path that reads Momence exports | N/A |
| 4 — Reporting | ⬜ pending | Aggregated weekly revenue by studio | Reuse `analytics/aggregate.ts`; new SQL view per studio |
| 5 — Dashboard | ⬜ pending | Studio-level KPI view | N/A |

**M of N done. K WIP.** Currently focused: Phase <first-unchecked-N> — <name>.
```

### Required output rules

- The header row is exactly: `| Phase | Status | Delivers | Work |`. Do not rename, reorder, add, or drop columns.
- One table row per phase. Order by phase number.
- Status cell uses one of the four exact values from section 4: `✅ done`, `🟡 WIP (x/y)`, `🟢 active`, `⬜ pending`. No other emojis, no other words.
- Truncate the Delivers cell to ~80 characters with `…` if longer.
- Truncate the Work cell to ~100 characters with `…` if longer.
- If Work cannot be derived, render literally `N/A` (not blank, not `—`).
- Pipes inside any cell must be escaped (`\|`).
- After the table, one summary line: `**M of N done. K WIP.** Currently focused: Phase <first-unchecked-N> — <name>.` Omit "Currently focused" if every phase is done.

### Forbidden output patterns

Any of these is a bug — do not produce them:

- Card-style or vertical "Phase: …, Status: …, Pointer: …" rendering of phase data.
- Separator lines (`────────`, `===`, `---` outside the markdown header) between phases.
- Internal diagnostic fields exposed in the user output: `Top-level checkbox:`, `Pointer:`, `Sub-checkbox count:`, `Layout:`, `Inline: yes`, etc. Those are reasoning artifacts; they never reach the user.
- Status values outside the four in section 4 — no `not started`, no `queued`, no `done ✅` (with the check trailing), no `🚧`, no `📝`.
- Renaming columns: `Description` instead of `Delivers`, `Implementation` instead of `Work`, etc.
- Adding extra columns.
- Dropping the table format because a parse came up short — render the table even if every Delivers cell and every Work cell is blank or `N/A`.
- Adding prompts, follow-up questions, or ledger context after the summary line in `status` mode. (Resume mode adds a "Suggested next chunk" block after the table — that is allowed in resume, never in status.)

## 6. Edge cases

- **No phases planned** (empty `## Phases` section) — print the table header followed by a single row: `| — | — | No phases planned yet. | — |` and stop.
- **Phase pointer points at a missing file** — render the row with status cell `⬜ MISSING`, Delivers `<pointer> not found.`, Work `N/A`.
- **Multiple phases share a number** — render both; suffix the second with `(duplicate)`.
- **Goal line absent** — leave Delivers blank rather than fabricating.
- **Implementation guidance section absent** — render Work as `N/A`. Never synthesize implementation prose from the goal or deliverables.
