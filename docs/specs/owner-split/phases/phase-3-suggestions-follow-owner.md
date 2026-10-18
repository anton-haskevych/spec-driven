---
needs: [1]
same-files-as: [2]
pr: A
---

# Phase 3 — Suggestions follow the owner

**Goal:** every place that suggests work to a person (*Next sessions*, execute's top ready row, the overseer's plan) reads a tool-filtered ready list that holds only that person's or unowned work, plus the session's own spec.

**Outcome:** after a handoff, Anton's "Next sessions" rows are his or shared, and Taras's are his or shared · small · low risk: the board still shows everything; only `board ready --for` output narrows.

**Files to touch:**
- `skills/spec/tools/commands/board.ts`, `board/people.ts`, `board/model.ts`
- `skills/spec/tools/commands/context.ts` (`APPLY_TOP_READY` text only)
- `skills/spec/SKILL.md` (*Next sessions*, *Tools* → Board), `skills/spec/execute.md` §0.2, `skills/spec/oversee-crew.md` §1.2 + heartbeat

## Implementation guidance

`--who` keeps its meaning; the offer filter is a new flag
(`ledger/decision-offer-filter-is-its-own-flag.md`). `board ready --for <name|me> [--keep <spec>]`
keeps ready rows where `isOffered(row.owner, name)` or `row.spec === keep`. Flight, blocked, you and
FOCUS are untouched. `--for me` resolves through `Board.me` (already `runnerName` from phase 1); when
it is absent, return the unfiltered board with `who: { unknown: true }` and print the "Can't tell who
you are…" line in text mode. Bump `BOARD_VERSION` to 3.

Packs are not touched (rule 7; a pack is for a spec the person chose).

Prose: *Next sessions* step 1 reads `board ready --for me --keep <this session's spec> --json`; the
own spec stays row 1; on `who.unknown` print the line above the rows. `APPLY_TOP_READY` and execute
§0.2 read `board ready --for me --json --local`. `oversee-crew.md` §1.2 and the heartbeat read
`board ready --for me --json`; the tick's own refill already filters (phase 2).

## Deliverables

- [ ] `board ready --for <name|me>` keeps mine-or-shared ready rows; other lanes and FOCUS unchanged (`board-command.test.ts`)
- [ ] `--keep <spec>` keeps that spec's rows under `--for`
- [ ] `--for me` with no runner name → unfiltered + `who.unknown` + the line; `BOARD_VERSION` 3
- [ ] `APPLY_TOP_READY`, execute §0.2 and the overseer's plan use `--for me`
- [ ] `SKILL.md` *Next sessions* and *Tools* → Board describe the filter, `--keep` and the unknown line

## Phase-local notes

- `board-no-focus-golden.test.ts` builds without `--for`; keep its output byte-identical.
- `same-files-as: [2]`: both edit `oversee-crew.md`.
