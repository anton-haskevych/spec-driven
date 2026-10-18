---
needs: [1]
pr: A
---

# Phase 3 — Suggestions follow the owner

**Goal:** every place that suggests work to a person (*Next sessions*, execute's top ready row, resume and execute packs' phase pick) offers only that person's or unowned work, from a tool-filtered list.

**Outcome:** after a handoff, Anton's "Next sessions" rows are his or shared, and Taras's are his or shared · small–medium · low risk: the board still shows everything; only `--who` output changes.

**Files to touch:**
- `skills/spec/tools/commands/board.ts`, `board/people.ts`, `board/model.ts`
- `skills/spec/tools/commands/context.ts`, `context/packs.ts`
- `skills/spec/SKILL.md` (*Next sessions*, *Tools* → Board), `skills/spec/execute.md` §0.2, `skills/spec/resume.md`

## Implementation guidance

Lift the focus-only guard at `commands/board.ts:45`. `boardFor` filters ready, flight and
blocked rows with `isOffered(row.owner, name)`; FOCUS keeps `focusFor`. `--who me` resolves
through `runnerName`; when it fails, return the unfiltered board with `who: { unknown: true }`
and print the "Can't tell who you are…" line in text mode. Bump `BOARD_VERSION` to 3.

Packs: filter the ready list with `isOffered` before `firstUnheld` (don't put the check inside
it). A chunk hint still wins: the person asked for that phase. Mind the execute pack budget
(`gotcha-execute-pack-headroom-is-thin`): no new prose in the pack, only fewer rows.

Prose: *Next sessions* step 1 reads `board ready --who me --json`; the session's own spec keeps
row 1 even when someone else owns it; on `who.unknown` print the line above the rows.
`APPLY_TOP_READY` and execute §0.2 add `--who me`. The resume path skips §0
(`gotcha-execute-section-0-is-skipped-on-the-resume-path`), which is why the pack filter matters.

## Deliverables

- [ ] `board <lane> --who <name|me>` filters ready/flight/blocked to mine-or-shared; FOCUS unchanged; usage test at `board-command.test.ts:105-108` rewritten
- [ ] `--who me` with no runner name → unfiltered + `who.unknown` + the line; `BOARD_VERSION` 3
- [ ] Packs filter ready rows with `isOffered` before `firstUnheld`; hint still wins
- [ ] `APPLY_TOP_READY` and execute §0.2 use `--who me`
- [ ] `SKILL.md` *Next sessions* and *Tools* → Board describe the filter, the own-spec pin and the unknown line

## Phase-local notes

- `board-no-focus-golden.test.ts` builds without `me`; keep its output byte-identical.
