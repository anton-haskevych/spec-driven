# Phase 8 recon — deliverables 6–9 (ideas as cards, spec cards, layout 4, docs)

Paths under `skills/spec/tools/`. Read inline (one wave: deliverables 1–5 left the seam documented in
`ledger/decision-phase-8-cards-as-built.md`).

## Seam

- **Ideas.** `idea.md` is hand-written files; no tool writes `_backlog/`. `card add` (`commands/card/add.ts:17`)
  already takes `--commitment idea` and refuses with the board off or offline (`boardBase`). So deliverable 6's
  capture is a docs change plus nothing in code.
- **Backlog file → card.** No command reads a backlog file into a card. `backlog/items.ts:30` `parseBacklogItem`
  gives title, tags, priority, due, created, body. `cards/plans.ts:81` `addEdit` takes the number at the tip.
  A new `card import <slug>` = `parseBacklogItem` → `AddCardIntent` (origin quote = body, app `backlog`, ref =
  the file's repo path) planned with a refusal when a source already carries that ref (two sessions importing
  the same file get one card).
- **List.** `commands/list.ts:44` `portfolioTable` reads `loadBacklog`; `portfolio/render.ts:49` renders
  `BacklogItem` rows. Cards fit the same row (id, priority, due, tags, title). `readPlansAt` already gives the
  record view (`recordViewOf(plans.record)`). Hide a backlog file any card's source `ref` names.
- **Spec priority/due.** Every reader goes through `graph/nodes.ts:51` `loadNode` → `readSpecFields`
  (`node.meta.priority/due`): `board/lanes.ts:166,178`, `board/attention.ts:107`, `doctor/schedule.ts:21`,
  `portfolio/rows`. One new `JoinedReads.schedule` source, built in `plan/read-plans.ts:46` `planSourceOf`,
  covers all of them.
- **Join / plan apply.** `commands/join.ts:96` `newSpecPlan` is the one batch for both; card ops can join it.
- **Layout.** `record/layout.ts` (`RECORD_LAYOUT = 3`), `plan/upgrade.ts:93` `upgradePlan` steps;
  `plan/upgrade-read.ts:10` `copyFromFolder` reads CLAUDE.md for join and upgrade alike.

## Reuse

`cardPlan`, `nextCardId`, `addEdit` (cards/plans.ts); `coverRefProblem` for `--cover` on add/import;
`compareSchedule`/`priorityRank` for "best priority, earliest due" over covering cards; `parseRef` target match
(cards/cover.ts `refsTo`).

## Testing issues

- Pure: spec-card ops (`view → RecordOp[]`), card schedule per spec, backlog → intent, upgrade step. All test
  on `tests/record-factories.ts` views like `tests/plan-upgrade.test.ts` and `tests/new-spec-plan.test.ts`.
- `RECORD_LAYOUT` 3 → 4 will move tests that assert the layout number; expected.
- `cards/plans.ts` is 127 lines, fine; `commands/list.ts` 71. No file near the cap.
