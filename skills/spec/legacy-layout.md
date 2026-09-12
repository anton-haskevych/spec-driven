# Legacy Layout — Reference

Read this only when a spec folder does not match the layout described in `SKILL.md`. The one signal that matters: **`docs/specs/<name>/ledger/INDEX.md` is absent.** Everything else about a legacy spec follows from that.

Do not load this file for new-layout specs. Nothing here applies to them.

## What a legacy spec looks like

- No `ledger/`, usually no `code-map.md`, no `phases/`, no `pr-opening.md`.
- `progress.md` holds **everything inline**: every phase block with its sub-checkboxes, plus accreted `## Implementation Notes`, session logs, and handoff blocks.
- `CLAUDE.md` frontmatter may be missing or partial; `status` may use the retired value `in-progress` (= `active`).
- A spec may be **mixed**: legacy `progress.md` plus a `ledger/` created later by `update` (see below). Once `ledger/INDEX.md` exists it is treated as new layout — the inline `progress.md` still parses because the new-layout reader tolerates it.

## Policy

- **No migration script, no auto-migration.** Legacy content is never rewritten, archived, or moved. The user hand-migrates when they choose.
- **The new rules still apply to new writes.** Nothing appends session logs, handoff blocks, or "Implementation Notes" to a legacy `progress.md`. New durable learnings go to a `ledger/` — created on request (below).
- **One notice, once per session:** `(legacy layout detected — reading progress.md as the phase source)`. Print it at first detection, never again.

## Per-mode fallbacks

### `status` (replaces status.md §3)

Parse phase blocks inline from `progress.md`. For each block:

- **Goal** — text after `**Goal:**` if present; else the first descriptive prose line under the phase heading; else the phase title text after `Phase N — ` (for `## Phase 4 — Mechanism implementation`, Goal = `Mechanism implementation`). Empty only if all three are absent.
- **Implementation summary** — text after `**Implementation:**` / `**Approach:**`, or under an `## Implementation guidance` heading inside the block; else the first 3 sub-checkbox titles joined with `; ` truncated to ~100 chars (real spec content, not fabrication); else `N/A`.
- **Sub-checkbox counts** — `- [x]` / `- [ ]` lines directly inside the block.

Then continue at status.md §4. The rendered table is identical to the new layout's — only the parse differs. Render it even if every Delivers/Work cell is blank.

### `resume`

- **Stage A** works unchanged; A.3 uses the `status` fallback above.
- **Stage B** replaces B.2 (ledger filter) with reading `progress.md` in full — including `## Implementation Notes`, session blocks, and handoff blocks. Surface the most recent session/handoff content briefly so the user sees where things were left.
- Hand off to `execute.md` §1 as normal.

### `execute` §0.3

Load Stage B context via the `resume` fallback above.

### `update`

- **Check off boxes** wherever they live in `progress.md` (all checklists are inline).
- **Never append a session log.** The old "Implementation Notes" section is left alone and never grown.
- **Offer `ledger/` creation** when durable learnings emerged: `This spec uses the legacy layout. Create a ledger/ folder to capture these learnings going forward? [y/N]`. On yes, scaffold `ledger/INDEX.md` and write the entries per update.md §5. The spec is now mixed-layout; future sessions detect the ledger and use the new path.
- **`code-map.md`** — likewise offer to scaffold if the session introduced load-bearing files. Don't force it.
- Everything else in update.md that targets `phases/`, `code-map.md`, or `pr-opening.md` is skipped when the file doesn't exist.

### `list`

- Missing or unparsable frontmatter → the spec is listed with `—` metadata cells and sorts last, counted in the `Legacy: N` clause.
- `in-progress` sorts with `active`.

### `create`, `prep`, `review`, `handoff`

Unaffected. `create` refuses to overwrite an existing `progress.md` regardless of layout. `review` writes to `reviews/` and `ledger/` — if `ledger/` is absent, offer to create it exactly as `update` does. `handoff` writes `in-flight.md` and ledger entries; same offer.
