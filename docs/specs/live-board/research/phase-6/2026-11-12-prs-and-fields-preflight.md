# Phase 6 preflight — PRs and spec fields on the record (2026-11-12)

Plan reviewed: the phase file plus the remaining plan (a)–(f) after the landOnMain lift and the PR document
reader landed. Recon: `2026-11-12-prs-and-fields-recon.md`. Paths are relative to `skills/spec/tools/`.

## Findings that change the plan

1. **`phase deployed` already writes the record for a joined spec.** `commands/phase/deployed.ts:14-18`
   skips `deployedOnMain` when `context.isJoined` and goes through the writer (phase 3a). Nothing to build
   for it; the deliverable's "phase deployed" part is done.
2. **Join must copy the spec's fields, not only the upgrade.** `plan/join.ts:57` stamps
   `layout: RECORD_LAYOUT`. Once that is 2, a spec joined after this release says "upgraded" while its owner,
   focus, ship and status are still only in `CLAUDE.md`, and a reader serving layout-2 specs from the record
   would read them as unset. One pure copier, called by join, `plan apply` and the upgrade.
3. **Relations and the lifecycle notes have no writer.** `stale`, `dropped`, `part-of`, `needs`,
   `supersedes` and `related` are written by hand in `CLAUDE.md` by review, prep and create (SKILL.md →
   *Relations between specs*, *Lifecycle*); no command sets them, and the phase adds only `spec-status`.
   Moving them makes every such hand edit change nothing, silently. Keep them in `CLAUDE.md`; move the four
   fields that have commands: `status`, `owner`, `focus`, `ship`.
4. **The upgrade's funnel already exists.** Every record write a phase command makes goes through
   `sendRecordIntent` (`plan/record-send.ts:52-57`), which flushes the outbox first. An `upgrade` intent
   (args = the copied fields and PR documents, planned at the tip: unchanged when the spec's layout is already
   2) sent ahead of the command's own intent is "the next command that touches the spec", works offline like a
   tick, and is one batch. The spec-field commands send it the same way.
5. **A joined phase whose tasks are all done disappears from the board until merge.** `joinedActivity`
   (`board/joined-activity.ts:18`) keeps only phases `!phaseDocDone`, and `phaseDocDone`
   (`plan/state-source.ts:52`) is "all tasks done". So a built phase has no flight row, and "built, nobody
   opened the PR" can't show. `phaseStage` has to feed the flight rows for built phases; done-for-edges stays
   "every task done" (a phase in the same PR group must be able to start once its need is built).

## Clean Code against the remaining plan

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names / one word per concept | Bites | `phaseStage`, not `phaseState` (`PhaseState` is the loaded phase); `PrDoc.state` vs `phaseStage` keep two words for two things |
| Small functions, one thing | Bites | `pr merge`'s `recordMerge` (`pr/actions/merge.ts:68-80`) branches on joined: put the record write in its own function beside `mergeLineEdit`, not inline |
| No flag arguments | Bites | the spec-field commands pick the home once (`isJoined`) and call one of two writers, like `phaseWriterFor` |
| Comments | Inert | |
| Errors as values | Bites | every record write returns `StoreWrite`; render through one function per command, as `renderPhaseOutcome` does |
| Tests, one concept each | Bites | the copier and `phaseStage` are pure and get table tests; commands get one real-git test each through `joinedRepo` |

## Clean Architecture

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule (`core/` never imports `record/`/`plan/`) | Bites | `core/land-spec-field.ts` must not learn the record: the joined branch lives in `commands/` (owner, ship, focus, spec-status) |
| Policy vs detail | Bites | `phaseStage` takes plain data (`PhaseDoc`, `PrDoc | undefined`, `held: boolean`), no claims or git |
| Humble object | Bites | the GitHub sync is a pure `prDocUpdate(doc, view)` → patch; `pr status` and `board` only send it |
| Component cycles | Bites | `plan/docs/pr-doc.ts` imports `trees/naming` and `playbook/settings`: both leaf modules, no cycle |

## SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP (actors) | Bites | `graph/nodes.ts` serves the graph; field reading for both homes goes to one reader (`graph/spec-fields.ts`) that `loadNode`, `checkoutOwner` and `shipOf` call |
| OCP | Bites | the next layout (PR D) adds one upgrade step: keep steps in a list keyed by the layout they lead to (`plan/upgrade.ts`), with `plan/kinds.ts` only registering readers |
| LSP | Inert | |
| ISP | Bites | `loadNodes`' `MarksSource` grows into a source of a joined spec's marks and fields; callers that pass `plans.marks` pass `plans` |
| DIP | Bites | the record port already exists (`RecordPort`, `sendIntent`); no new port |

## DDD

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Ubiquitous language | Bites | "upgrade" for layout steps, "PR document", "stage" for computed phase position |
| Which layer owns the invariant | Bites | "an opened PR has a number" is the reader's (`readPrDoc`); "one PR document per code group" is `missingPrDocs` |
| Aggregate boundary | Bites | spec fields and PR documents are separate documents; the upgrade writes both in one batch, nothing else does |
| Anti-corruption layer | Bites | GitHub's `OPEN/MERGED/CLOSED` + `isDraft` + verdict map to `PrState` in one function |

## Guard blindness

`hooks/frozen-plan-edits.ts` (`changedPlanParts`) guards phase files and `progress.md` only. After the
upgrade a hand edit of `owner:` or `status:` in a joined spec's `CLAUDE.md` changes nothing and nobody is
told. The design's edge case (*Someone hand-edits a removed field*) wants it blocked; add the four keys for an
upgraded spec.

## Seam and testability (deltas from recon)

- `board/model.ts` 224 lines: one more `FlightNext` value fits; the new attention row's builder goes in
  `board/record-rows.ts`.
- The upgrade reads `CLAUDE.md` and `pr-opening.md` from the last fetched `origin/<default>` (the base cache,
  no extra fetch), falling back to the checkout: tests need a joined repo whose main carries the fields.
- PR B's code can't be run in a test: test the layout refusal rule with the plugin's own layout injected, plus
  that this plugin raises `meta.json` to 2 on its first write.

## Amendments

1. Drop "phase deployed writes the record" from the work: done in 3a (finding 1).
2. `plan/upgrade.ts`: pure `specFieldsFromFiles(claudeMd)` + `prDocsFromFiles(spec, phases, prOpening)` and
   `upgradeSpecPlan(spec, copied)`; join and `plan apply` stamp the copied fields at creation (finding 2).
3. Move `status`, `owner`, `focus`, `ship` only; relations and `stale`/`dropped` stay in `CLAUDE.md`
   (finding 3).
4. The upgrade is an `upgrade` row in `PLAN_INTENTS`, sent by `sendRecordIntent` ahead of a layout-1 spec's
   own write (finding 4).
5. `joinedActivity` takes `phaseStage`: `doing` → in progress in its tree, `built` → a flight row with its
   PR; `built` with a `not-opened` PR → a *Needs you* row from `board/record-rows.ts` (finding 5).
6. Extend `hooks/frozen-plan-edits.ts` to the four moved `CLAUDE.md` keys of an upgraded spec.

## Defaults applied

- `PrState` has `closed` beside the five states (a PR closed unmerged on github.com must move its document).
- A task phase's stage is `done` when every task has its evidence (design → *Phase state*), not `built`.
- A spec with no `pr:` groups has one PR document, group `default`, on `feat/<spec>`.
- The upgrade copies from the last fetched `origin/<default>`, else the checkout.
- PR numbers from `pr-opening.md` map to a group by their `PR #n · <branch>` line; a merge line with no
  branch line maps only in a one-group spec, else it is left out and named in the command's result.

## Forks for you

None.
