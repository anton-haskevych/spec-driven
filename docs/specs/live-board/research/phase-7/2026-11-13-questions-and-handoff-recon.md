# Phase 7 recon — questions and hand-off notes (2026-11-13)

One wave, two read-only explorers (write seam, read seam), plus direct reads. Paths are relative to
`skills/spec/tools/`.

## The seam

**Parks today (record).** `PhaseDoc.parks?: ParkEntry[]` (`plan/docs/phase-doc.ts:40-41`, reader
`plan/docs/parks.ts`). Written by `parkEdit`/`unparkEdit` (`plan/ops/phase-state.ts:35-55`) through
`phaseStatePlan` (`plan/ops/change.ts:51`), registered as `park`/`unpark` rows in `PLAN_INTENTS`
(`plan/plan-intents.ts:60-67`). `recordWriter.park/unpark` (`plan/record-writer.ts:50-61`) first checks an
open park left in the in-flight *file* (`fileParkOf`) and answers that one in the file.

**Parks today (files).** `- Parked <at>: <q> · recommend: <r>` under `## Needs you` in
`in-flight/phase-<id>.md` (`core/park.ts:17-66`), planned by `phases/park.ts:28-45`.

**One funnel for every reader.** `joinedSpecState` (`plan/state-source.ts:44-47`) folds record parks into the
phase's in-flight note text (`withRecordParks` :108-128). The board (`board/parked.ts:15` → `openPark`),
the packs (`context/packs.ts:92` `parkLine` → `lastPark`), and crew (via the board's ready lane) all read
`SpecState.inFlight`. So moving the *source* to question documents and rendering them into the same text
keeps every reader unchanged.

**Gate.** `core/gate.ts` (`isGateItem`); evidence check `checkEvidence` (`phases/tick.ts:52-59`), used by
both homes; record path `recordTick` (`plan/record-tick.ts:23-26`) sends the given evidence with no push.
`Task.gate` is stamped at add/join/apply. No approval record exists beyond the evidence string.

**Crew.** `crew/run-state.ts:23-27,48-49,96-101` reads `## Questions` in run.md (hand-edited by the
overseer, `oversee-crew.md:179-187`); `crew/pick.ts:33` skips those rows on top of the board's park filter
(`board/lanes.ts:106`). `commands/crew/tick.ts` prints questions only from a worker's `Crew:` line
(`crew/tick-step.ts:42`).

**Hand-off notes.** No tool writes them: `handoff.md:56-60` has the session overwrite
`in-flight/phase-<id>.md` by hand. Readers: `core/in-flight.ts:27` (`readInFlight`), pack block
`context/in-flight.ts` (whole notes up to 8000 chars, then listed by disk path — a record note has no disk
path), doctor via `inFlightFilesIn` (disk).

**Layout.** `RECORD_LAYOUT = 2` (`record/layout.ts:3`). Upgrade: `upgradePlan` (`plan/upgrade.ts:88-98`,
one step: fields + PR docs, stamps `RECORD_LAYOUT`), `copyFromFolder` (`plan/upgrade-read.ts`),
`upgradeIfBehind` (`plan/upgrade-send.ts:16`, run by `withPlanNotice`, `writeJoinedField`, `recordPr`).
Join stamps layout at `plan/join.ts:66`, `plan apply` at `plan/apply.ts:25`. `read-plans.ts:56,60` gate
record fields/PRs on `layout >= RECORD_LAYOUT` (must become `>= 2`, not "current").

**Commands.** `spec.ts:41-70` table (`tests/commands-table.test.ts`); phase actions table
`commands/phase.ts:18-28`; `PhaseWriter` (`plan/phase-writer.ts:32-42`) with `refusingWriter` listing every
method.

## Reuse

- `phaseStatePlan` + a `PLAN_INTENTS` row per action gives outbox replay and the read overlay for free.
- `readObject`/`read-fields` helpers for the reader (exemplar `plan/docs/pr-doc.ts`); `prDocsFolder`-style
  path helpers and `readSpecPrDocs` (`plan/pr-sync.ts:59`) for listing a folder of documents.
- `withPark`/`withAnswer` to render questions into note text; `runnerName` (`core/git.ts:45`) for who answered.
- `upgradePlan` pattern for the layout-3 step; `withMeta` already rewrites `meta.json`.

## Testing-issue estimate

- `tests/record-factories.ts` has no `questionDoc`: add it.
- `plan/state-source.ts` 128 lines and will grow (questions + record notes): move note rendering to its own
  file.
- `plan/plan-intents.ts` 137 lines: two or three new rows fit.
- `board/model.ts` 227 and `board/lanes.ts` 204: avoid touching; the funnel means no edit is needed.
- `context/in-flight.ts` lists notes by disk path; a record note needs another pointer.
- Upgrade tests exist (`plan-upgrade.test.ts`, `record-upgrade.test.ts`, `record-newer-layout.test.ts`);
  `read-plans.ts` layout comparisons must keep layout-2 specs reading fields from the record.
