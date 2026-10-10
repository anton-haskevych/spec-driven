# Self-Driving Loop — Technical

Ground truth: `research/2026-10-10-wave-1-loop-mechanics.md`, `wave-2-gaps.md`,
`wave-2b-pr-babysit-spec.md`, `craft-placement-fixtures-extraction.md`, and the review
`reviews/2026-10-10-collisions-and-boundaries.md`. Paths are under `skills/spec/` unless
written in full. Line numbers are at 2.41.0.

## Phase 1 — pick by number

### SKILL.md

- *Next sessions* (:150-165):
  - step 1 names the ready-row fields the block uses: `spec`, `phase`, `title`, `next`, `target` (`{ workspace }` or `{ newWorktree }`), `treeBusy`;
  - step 2 ends the block with `Reply with row numbers to launch.` A spec with phases, no `reviews/` and nothing ticked comes as a `review` row (the board's `next: review`); create puts its own spec's review row at 1;
  - step 3 becomes: a reply of one or more row numbers (`1`, `1 3`), `go`/`yes` (= row 1), `start 1 and 2`, or a pasted row launches those rows, one `launch <row.next> <spec> [<phase>]` each (phase only for execute), rows that share a tree once. A number answers the most recent numbered list this session printed; it launches only when that list is *Next sessions*. With no block in view, reprint it and wait; never fall back to the board. When the PR question is asked (pr-babysit's rule), print *Next sessions* after it is answered. Drop "On approval" wording.
- :32 (no spec named): execute applies the board's top ready row and says so (`Say if wrong:`), instead of offering it.

### Board

- `tools/board/model.ts`: `title: string` on `ReadyRow` (the phase line's title; for a stage row, the spec's title line); `NextStep` gains `"review"`; bump `BOARD_VERSION` (:6).
- `tools/board/lanes.ts`: a spec with phases, no `reviews/` folder and no ticked phase yields one stage row with `next: "review"` in place of its phase rows (`stageLanes` :116-133 pattern). The base archive must carry `reviews/` (check `board/load.ts`).
- `tools/board/render.ts`: render `review` rows like stage rows.

### Mode files

- `execute.md` §3 preflight take-back (:90): apply *Defaults applied* and list them under `Say if wrong:` in the next report; *Forks for you* stops and asks.
- `execute.md` :22 and `tools/commands/context.ts:28` (`OFFER_TOP_READY`, emitted at :57): apply the top ready row and say so. Update `context.test.ts`'s expectation.
- `skills/phase-preflight/SKILL.md` (:132-140): split *Decisions for you* into *Defaults applied* (a recommendation, in scope, reversible) and *Forks for you* (changes the phase Goal or Outcome, deletes or migrates data, changes an external contract, or moves scope between specs; no default).
- `create.md` *After writing* (:372-376): drop "Confirm the user is happy" and "Offer to update docs" (list them under `Say if wrong:`); step 3 puts `<spec> review` at row 1, launched with `spec.ts launch review <spec>`.
- `list.md:29`: a pure pointer to *Next sessions* step 3, no examples.
- `handoff.md` :174-176: points at *Next sessions*; no copy of the one-list rule.

### Pins

- `tests/skill-wiring.test.ts`: `Reply with row numbers`, "most recent numbered list", `<row.next>`, create's review row.
- `tests/board*.test.ts`: `title` on ready rows; an unreviewed spec yields one `review` row; a reviewed one yields phase rows.

## Phase 2 — reports and defaults

- SKILL.md new *Reports* (after *Next sessions*), one 3-line example plus four rules: **Impact** = the first sentence of the Outcome line of the phases this session moved (the execute pack holds the entry), plus a number when measured; **On merge**; **Left** (ready set and PR split from `spec.ts ready`); gloss internal labels on first use; no file names in Impact. Applies to execute's end-of-chunk brief (execute.md:146), handoff's completion block (handoff.md:156-172, printed once: the update it runs skips its header), update's standalone report (update.md:145-168), review's report (review.md:339-350). Not resume, not status (status.md:86, tool-rendered). Babysit's final report keeps its shape.
- SKILL.md new *Say if wrong*: review.md §3's criteria (:212-224) as the rule, the examples list from design.md → Defaults vs forks. review.md §3 and phase-preflight point at it.
- update.md:22 (several phases in progress): pick the one this tree's claim names; say so.
- Pins: the three header labels and `Say if wrong:` in SKILL.md; a loop over execute, handoff, update and review asserting each contains `SKILL.md → *Reports*` (the thin-skill loop at skill-wiring.test.ts:101-112).

## Phase 3 — no collisions

### `updated:`

- SKILL.md *Shared conventions* → Timestamps (:506): "bump `updated:` on a status change or a review/prep rewrite; never per session." No caller list.
- update.md §7 (:128-138): no per-session `spec-bump.sh`; status transitions still edit `status:` and bump. handoff.md:19-20 inherits it.
- list.md:21: the column is "last status change or review".

### In-flight per phase

- Layout: `in-flight/phase-<id>.md`; a session with no phase (PR gate, babysit) writes `in-flight/pr-<group>.md`. Handoff writes only its own file and deletes it at a clean boundary (no marker). A legacy `in-flight.md` stays readable; a handoff moves the part about its own phase into its file.
- Readers: `core/spec-state.ts:45` (read the folder + legacy file); `context/packs.ts:91-93` (`inFlightBlock(state, phaseId)`: the picked phase's file, then the legacy file, within `IN_FLIGHT_LIMIT`); `doctor/run.ts:74-77` + `doctor/phases.ts:29-33` (`checkInFlight` over every in-flight file; warn only when every phase is done, as today); `graph/suggest.ts:12` (scan the folder); resume.md:25, execute.md:28 wording.
- SKILL.md: file tree, artifact table (:213), *in-flight.md semantics* (:424-429), on-demand table.
- handoff.md :54-58, :87-105 (write the phase file; clean boundary deletes it).

### Spec state

- execute.md §6 step 6 (:117) and handoff.md:20: drop "refresh the Spec state".
- execute.md §10 step 3 (:156): "after opening the PR, add one line `PR #<n> · <branch>` under Spec state". No phases done/left prose.
- update.md:175: drop the refresh.
- SKILL.md *pr-opening.md semantics* (:431-438): Spec state holds the PR split, one line per opened PR, and pr-babysit's merge records; phases done/left are not hand-written.
- Tests: `doctor.test.ts` (per-file in-flight cases, legacy file), `context.test.ts` (pack shows only the picked phase's in-flight file).

## Phase 4 — tools from any folder

### Project dir

- `core/spec-folders.ts`: `findProjectDir(start: string, exists: (p: string) => boolean = existsSync): string`. Walk `start` and its ancestors. In each folder, check `join(dir, TOP_SPEC_ROOT)` first and remember the folder when it exists; then stop if `dir/.git` exists (directory or file: worktrees) or `dir` is `/`. Return the outermost remembered folder, else `start`.
- `tools/spec.ts:70`: `run(argv, findProjectDir(process.cwd()))`. This also fixes the board's base-archive path from a subfolder (`claim list` from `skills/spec/` → ENOENT on `.git/spec-board/base/<sha>/skills/spec/`).
- `tools/hooks/lesson-recall.ts:23` and `tools/hooks/spec-file-check.ts:86`: `findProjectDir(payload.cwd ?? fallbackDir)`. `payload.cwd` follows the session's `cd`.
- `scripts/spec-bump.sh:37-45`: in the name branch only (after the `-f "$ARG"` path check at :35), `cd` to the outermost ancestor holding `docs/specs` with the same stop rule; print an absolute `$FILE`. Stays bash (the no-Bun path).

### Pack budget

- `context/packs.ts`: `const PROJECT_LESSONS_LIMIT = 3000` and `PLAYBOOKS_LIMIT = 3000` beside the others (:29-32). `projectLessonsBlock` (:136-141) renders each lesson as a one-line pointer (title + file) through `withinBudget`, ending with `N more lessons — spec.ts lessons recall <files>` like `ledgerBlock` (:96-108). `playbooksBlock` clips.
- Target: the CRM max pack (46.9K) and median (39.7K) both land under 30K; measure both.

### Tests

- `tests/spec-folders.test.ts` (with `createTree`): at root; in a spec folder; in `landing/src` with `docs/specs` at both root and `landing/` (→ root); in a worktree whose `.git` is a file; outside any spec tree.
- `tests/spec-bump.test.ts` (new): the same cases through `spec-bump.sh <name>`, passing `TZ`.
- Hook tests: one per hook with `cwd` set to a subfolder.
- `tests/context.test.ts`: a fixture with many matching lessons and playbooks keeps the whole execute pack under 30,000 chars and carries the hidden-rows note.

## Release

Two PRs (A = phases 1–3, B = phase 4), each its own release. The version is picked at merge:
main's minor + 1 (`python3 scripts/version.py --set <v>`), a ROADMAP row, README rows when
a Tools bullet changes. The steps live in `pr-opening.md`.
