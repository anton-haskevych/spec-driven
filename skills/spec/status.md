# Status Mode

Print a single-table snapshot of every phase in the spec. No briefing, no ledger filtering, no questions. Just the table.

## 1. Resolve feature name

- If `$ARGUMENTS` (after stripping the `status` token) contains a feature name, use it.
- Else infer from conversation context (same rule as SKILL.md's empty-args branch). Propose a kebab-case slug and confirm with the user only if ambiguous.
- If `docs/specs/<name>/` does not exist, print: `Spec '<name>' not found at docs/specs/<name>/.` and stop. Do not offer to create — that's create.md's job.

## 2. Detect layout

Check whether `docs/specs/<name>/ledger/INDEX.md` exists.

- **Exists** → new layout. Proceed via section 3a.
- **Does not exist** → legacy layout. Proceed via section 3b.

## 3a. Read phases — new layout

Read `progress.md`. Parse its `## Phases` section into a list of records:

`{ number, name, top_level_checked, pointer }`

For each phase, read the file at `pointer` (flat file or folder's `plan.md`). Read all phase files in parallel.

From each phase file, extract:

- **Goal** — the line starting with `**Goal:**`. Used for the Delivers column. If missing, fall back to the phase title; if that's also blank, leave the cell empty.
- **Implementation summary** — the prose under `## Implementation guidance`. Take the first sentence (split on `. ` followed by a capital), strip trailing punctuation, and truncate to ~100 chars with `…`. Used for the Work column. If the section is missing or empty, emit `N/A`.
- **Sub-checkbox counts** — under `## Deliverables`, count `- [x]` (`done_subs`) and `- [ ]` (`open_subs`). `total_subs = done_subs + open_subs`. If no `## Deliverables` section exists, count all `- [x]`/`- [ ]` lines in the file.

## 3b. Read phases — legacy layout

Read `progress.md`. Parse phase blocks inline (legacy specs keep all phase content in this single file).

For each phase block:

- **Goal** — first descriptive prose line under the phase heading, or the text following `**Goal:**` if present.
- **Implementation summary** — text following `**Implementation:**` / `**Approach:**` / under an `## Implementation guidance` heading inside the block, if present. Otherwise emit `N/A` (legacy specs frequently lack a structured implementation section — don't fabricate from the goal).
- **Sub-checkbox counts** — count `- [x]` and `- [ ]` lines directly inside the block.

Print the legacy notice once: `(legacy layout detected — reading progress.md as the phase source)`.

## 4. Compute status per phase

| Condition | Status |
|---|---|
| `top_level_checked == true` | `done ✅` |
| `top_level_checked == false` AND `done_subs > 0` | `WIP (done_subs/total_subs)` |
| `top_level_checked == false` AND `done_subs == 0` | `active` |

## 5. Render

Output exactly:

```
# <Feature Name> — Status

| Phase | Status | Delivers | Work |
|-------|--------|----------|------|
| 1 — Canonical schema | done ✅ | Single source-of-truth schema for invoices | Define Zod schema in `lib/schema.ts`; wire into existing pipeline |
| 2 — Migration runner | WIP (3/5) | Idempotent runner that backfills legacy rows | CLI under `scripts/migrate/`; chunked batches via existing pg client |
| 3 — CSV import | active | CSV ingestion path that reads Momence exports | N/A |
| 4 — Reporting | active | Aggregated weekly revenue by studio | Reuse `analytics/aggregate.ts`; new SQL view per studio |

**M of N done. K WIP.** Currently focused: Phase <first-unchecked-N> — <name>.
```

Rules:

- One table row per phase. Order by phase number.
- Truncate the Delivers cell to ~80 characters with `…` if longer.
- Truncate the Work cell to ~100 characters with `…` if longer.
- If Work cannot be derived, render literally `N/A` (not blank).
- Pipes inside any cell must be escaped (`\|`).
- The summary line below the table reports counts and names the resume-inferred active phase (first unchecked). Omit "Currently focused" if every phase is done.
- Print nothing else. No prompts, no follow-up questions, no ledger context.

## 6. Edge cases

- **No phases planned** (empty `## Phases` section) — print the table header followed by a single row: `| — | — | No phases planned yet. | — |` and stop.
- **Phase pointer points at a missing file** — render the row with `Status: MISSING`, `Delivers: <pointer> not found.`, `Work: N/A`.
- **Multiple phases share a number** — render both; suffix the second with `(duplicate)`.
- **Goal line absent** — leave Delivers blank rather than fabricating.
- **Implementation guidance section absent** — render Work as `N/A`. Never synthesize implementation prose from the goal or deliverables.
