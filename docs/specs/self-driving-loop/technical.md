# Self-Driving Loop — Technical

Ground truth: `research/2026-10-10-wave-1-loop-mechanics.md`, `wave-2-gaps.md`,
`wave-2b-pr-babysit-spec.md`, `craft-placement-fixtures-extraction.md`. Paths are under
`skills/spec/` unless written in full. Line numbers are at 2.41.0.

## Prose edits (phases 1–3)

### SKILL.md

- *Next sessions* (:150-165):
  - step 2 ends the block with `Reply with row numbers to launch.`;
  - step 3 becomes: a reply of one or more row numbers (`1`, `1 3`), `go`/`yes` (= row 1), `start 1 and 2`, or a pasted row launches those rows from the block this session printed, one `launch execute` each, rows that share a tree once. Add: "One numbered list per message: when the PR question is asked, print *Next sessions* only after it is answered." Drop "On approval" wording.
- New section *Reports* (after *Next sessions*): the Impact / On merge / Left header, gloss rule, "a number when there is one", applies to execute's end-of-chunk brief (execute.md:146), handoff's completion block (handoff.md:156-172), update's report (update.md:145-168), review's report (review.md:339-350), resume's Stage A (resume.md:30-70). Status is excluded: its table is tool-rendered (status.md:86).
- New section *Say if wrong*: apply good defaults, list them on one `Say if wrong:` line; the real-forks list (design.md → Defaults vs forks).
- *Tools* → Board bullet (:101): document the `--json` shape: `{ board: { version, lanes: { focus, inFlight, ready, blocked, needsYou } } }`; ready rows carry `spec`, `phase`, `next`, `target`, `treeBusy`; there is no `title` or `tree` field (32 wrong guesses in digests).
- *Shared conventions* → Timestamps (:506): `spec-bump.sh <spec>` runs at create, review and a status change only.
- *in-flight.md semantics* (:424-429): one `## Phase <id>` section per phase; a handoff rewrites only its phase's section.
- *pr-opening.md semantics* (:431-438): Spec state holds the PR split and the tool-written PR records; phases done/left are not hand-written there.

### execute.md

- §3 preflight (:90): "Take back" adds *Decisions for you*: apply the recommended option, list it under `Say if wrong:` in the next report; a decision with no recommended option stops and asks.
- §6 step 6 (:117) and §10 (:156): drop "refresh the Spec state".
- End-of-chunk brief (:146): follow SKILL.md → *Reports*.
- :22 (no spec named): apply the board's top ready row and say so (`Say if wrong:`) instead of offering it.

### handoff.md

- :19-20: drop the Spec-state refresh; the update flow it runs no longer bumps `updated:`.
- :54-58 and :87-100: write `## Phase <id>` sections; rewrite only this phase's section; convert a legacy single block (design.md → Edge cases).
- Completion block (:156-172): starts with the *Reports* header.
- :174-176: unchanged pointer to *Next sessions*, plus the one-list rule when the PR question is asked (pr-babysit's copy).

### update.md

- §7 (:128-138): no `spec-bump.sh` call; status transitions still edit `status:` and bump.
- :175: drop the Spec-state refresh. Report (:145-168): *Reports* header.
- :22 (several phases in progress): pick the one this tree's claim names; say so.

### review.md, resume.md, create.md

- review.md:339-350 and resume.md Stage A summary: *Reports* header.
- create.md:374-375: drop "Confirm the user is happy" / "Offer to update docs" asks; list them under `Say if wrong:`.

## Code (phase 4)

### Project dir from any folder

- `core/spec-folders.ts`: new `findProjectDir(start: string): string` — walk `start` and its
  ancestors; return the first that has a `docs/specs` directory; stop at the git toplevel
  (a `.git` entry) or `/` and return `start`. Pure over an injected `exists(path)`.
- `tools/spec.ts:70`: `run(argv, findProjectDir(process.cwd()))`.
- `scripts/spec-bump.sh:37-45`: before matching, `cd` to the nearest ancestor holding `docs/specs`
  (same stop rule); keep the bash-only path.
- Hooks keep `process.cwd()`: Claude Code runs them from the project dir.
- Don't: jump to `--show-toplevel` (craft → Don't extract).

### Pack budget

- `context/packs.ts`: `const PROJECT_LESSONS_LIMIT = 6000` beside the others (:29-32);
  `projectLessonsBlock` (:136-141) runs its lines through `withinBudget` and ends with
  `N more lessons — spec.ts lessons recall <files>` like `ledgerBlock` (:96-108).
- Target: the CRM 47K pack lands under 30K (lessons 17.7K → 6K).

### Pins and tests

- `tests/skill-wiring.test.ts`: pin the *Reports* header labels, the `Say if wrong:` label,
  the `Reply with row numbers` line, and the one-list rule (`toContain`, as the Outcome pin
  at :115-121).
- `tests/spec-folders.test.ts` (extend): `findProjectDir` cases — at root, in a spec
  folder, in `landing/docs/specs/x`, outside any spec tree.
- `tests/context.test.ts`: a pack with many matching lessons is capped and carries the note.
- `tests/schedule.test.ts:118-121` runs `spec-bump.sh`; add a call from a spec folder.

## Release

Two PRs, each its own release with the next free minor (pr-babysit takes 2.42.0):
`python3 scripts/version.py --set <v>`, a ROADMAP row, README rows when a Tools bullet changes.
