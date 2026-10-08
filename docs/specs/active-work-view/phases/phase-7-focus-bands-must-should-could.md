---
needs: [2, 3, 4]
pr: D
---

# Phase 7 — Focus bands: must, should, could

**Goal:** `focus:` holds a band instead of a rank: `focus: must | should | could`. FOCUS prints
MUST / SHOULD / COULD sub-headers. Inside a band the board orders specs from data it already has, and
`spec.ts focus` takes a band instead of `--top` / `--after`.

**Outcome:** The team says how hard to push each spec in words Taras already knows (MoSCoW), and nobody
keeps an 18-spec total order by hand · small to medium, mostly deletion · risk: CRM's four numeric
`focus:` values. Those read as `should` and the doctor warns about them; phase 6 rewrites them.

Why: `ledger/decision-focus-is-a-band.md` and `research/2026-10-08-focus-bands-exploration.md`. Anton,
2026-10-08: "it seems to me that focus would be relationship of the entities within the tier", and
"This is kinda hard to split all of them in sequential order of what is more or less important."

**Files to touch:**
- `skills/spec/tools/core/spec-meta.ts`: `FOCUS_BANDS`, `FocusBand`, `readFocusFields`. A number
  reads as `should`, with a problem the doctor shows as a warning.
- `skills/spec/tools/doctor/spec-meta.ts`: a bad value is an error, a legacy number a warning.
- `skills/spec/tools/focus/plan.ts` (band in, band out), `focus/land.ts` (entries carry `band`),
  `commands/focus.ts` (args, usage, copy). Delete `focus/rank.ts` and `tests/focus-rank.test.ts`.
- `skills/spec/tools/board/focus.ts`: `focusOrder` sorts by band, then the in-band order below.
  `FocusedSpec.rank` becomes `band`.
- `skills/spec/tools/board/model.ts`: `FocusRow.rank` → `band`; `ReadyRow.focusBand`.
- `skills/spec/tools/board/render-focus.ts`: band sub-header lines. `board/render.ts`: the ready note
  becomes `<band>`, not `focus <n>`.
- tests: `focus-plan`, `focus-command`, `focus-land`, `board-focus`, `board-render-focus`,
  `board-command` (`--who`), `spec-meta` / doctor. `board-no-focus-golden` must stay untouched.
- prose: `skills/spec/list.md` (*Focus*: the three bands and their pick rules), `SKILL.md` (*Tools* →
  Focus; *Priority, due dates and owners*), `README.md`, `ROADMAP.md`.

## Implementation guidance

**Field.** `focus: must | should | could`, case-insensitive on read and written in lower case.
- Missing → not in focus.
- A number (2.37.0's rank) → `should`, plus the warning `focus <n> is a 2.37.0 rank; use must, should
  or could`.
- Anything else → error `focus "<x>" is not one of must, should, could`, and the board skips the spec,
  as it does a malformed value today.
- `focus add` overwrites a legacy or malformed value.

**Order** (`focusOrder`, one total order that feeds both the FOCUS rows and `ReadyRow`):
1. Band: must, then should, then could.
2. Overdue first.
3. Due date ascending; no due date last.
4. Priority (`compareSchedule`'s rank; none last).
5. Spec name.

Reuse `specSummary` (`portfolio/rows.ts`) for due, overdue and priority. Don't add spec-level
"unblocks": `unblockCounts` keys phase rows, and summing them is a new rule nobody asked for.

**Writer:**
```
focus add <spec> <must|should|could>
focus move <spec> <must|should|could>
focus drop <spec>
```
- Still one `CLAUDE.md`, landed on `origin/<default>` by `land.ts` (unchanged mechanics).
- Copy: `focus: added <spec> to must (<sha>)`, `focus: moved <spec> to could (<sha>)`, `focus: dropped
  <spec> (<sha>)`.
- Refusals: `focus add: <x> is already in focus (should); use move`, `focus move: <x> is already
  could`, `focus <action>: <band> is not a band; use must, should or could`. The existing `not in focus`
  and `land the spec first` refusals stay.
- A missing band on add or move prints `FOCUS_USAGE`.
- `--top` and `--after` are gone. Passing either prints usage with one line: `focus: --top and --after are gone; give a band
  (must, should, could)`.

**Board:**
- FOCUS prints a sub-header per non-empty band, two-space indented like the rows: `MUST`, `SHOULD`,
  `COULD`. Columns align across the whole lane (one `alignColumns`, headers inserted after), so the
  three blocks read as one table.
- Positions stay 1…n across the whole lane, and `--who` keeps them (decision-focus-row-sessions).
- `FocusRow` gets `band: FocusBand` and loses `rank`. Keep `BOARD_VERSION` 1: `rank` shipped in 2.37.0
  on 2026-10-07, and its only reader is this repo's tests. Record that in the PR body.
- `ReadyRow`: `focus` stays the position, so the sort is unchanged. Add `focusBand`; the note renders
  `must`, `should` or `could`.
- The header count `<n> focus` is unchanged.

Phase 5 also edits `board/model.ts` and `board/render.ts` (attention). The two are independent; rebase
whichever lands second.

## Deliverables

- [ ] `focus:` reads as a band: values, legacy number → `should` with a warning, bad value → error; spec-meta and doctor tests
- [ ] `focusOrder` sorts by band → overdue → due → priority → name; `FocusRow.band`, `ReadyRow.focusBand`; board-focus tests
- [ ] FOCUS lane prints MUST / SHOULD / COULD sub-headers, empty bands omitted, aligned across the lane, `--who` keeps positions; ready note shows the band; render and command tests; no-focus golden unchanged
- [ ] `spec.ts focus add|move <spec> <band>` and `drop`; `rank.ts` and its test deleted; copy and refusals as above; plan, command and land tests
- [ ] `list.md` *Focus* defines the bands (Must: pick first · Should: committed, pick when your Must is done, blocked or in review · Could: when there's room, e.g. a spare parallel session or while waiting on CI; not in focus = MoSCoW's "won't, this time") and maps "move X to must" style requests; `SKILL.md`, `README.md`, `ROADMAP.md` updated

## Phase-local notes

- Smoke: a scratch bare origin plus two clones, as PR B did. Add one spec to each band, move one, drop
  one, and check both clones' boards. Then in CRM, `board --local` with the four legacy numbers shows
  them under SHOULD, and the doctor warns.
