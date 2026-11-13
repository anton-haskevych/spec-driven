# Code Map — Live Board

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/core/land-on-ref.ts` | The fetch → plan → commit → lease-push → retry loop over a `RefPort` | 1 |
| `skills/spec/tools/core/remote-push.ts` | Lease push, 10 s timeout, no prompt, `--no-verify`; shared by claims and the record | 1 |
| `skills/spec/tools/record/write.ts` | `writeRecord(port, plan, { validate })`: every record write goes through it | 1 |
| `skills/spec/tools/record/plan-writes.ts` | Pure op planner: versions, conflicts, validation | 1 |
| `skills/spec/tools/record/ref.ts` | `RecordPort` + `gitRecordPort`: fetch (absent, offline, busy), commit, push | 1 |
| `skills/spec/tools/record/outbox.ts` | Queued intents; `sendIntent` is the write that may run offline | 1 |
| `skills/spec/tools/record/mirror.ts` | The local copy, one folder per tip | 1 |
| `skills/spec/tools/commands/record.ts` | `record status \| sync \| drop` | 1 |
| `skills/spec/tools/tests/fake-record.ts` | `fakeRecord()`, `viewOf(docs)`: the in-memory record later phases test on | 1 |
| `skills/spec/tools/plan/docs/phase-doc.ts`, `spec-doc.ts` | `PhaseDoc`, `Task`, `SpecDoc` and their readers (collect problems) | 2 |
| `skills/spec/tools/plan/docs/spec-plan.ts` | `specPlanProblems`: checks the store's per-document validator can't (phase list, local edges, task ids) | 2 |
| `skills/spec/tools/plan/kinds.ts` | `validateRecordDoc` path → reader registry, `specDocPath`, `phaseDocPath` | 2 |
| `skills/spec/tools/plan/join.ts`, `join-tasks.ts` | `planJoin` (pure): copies → documents; task matching by text | 2 |
| `skills/spec/tools/plan/entry-tasks.ts` | A phase entry's deliverables as written (`entryTasks`), `taskKey` for matching | 2 |
| `skills/spec/tools/commands/join.ts` | `join <spec>`: base + trees → one record write → banner on main | 2 |
| `skills/spec/tools/core/read-fields.ts` | Field readers shared by settings and record documents | 2 |
| `skills/spec/tools/tests/record-factories.ts`, `join-fixtures.ts` | `specDoc`, `phaseDoc`, `task`; spec copies incl. the Nov 11 fixture | 2 |
| `skills/spec/tools/record/read.ts` | `readRecord(port, { fetch, now })`: the one read per command; `gitRecordReadPort` | 2a |
| `skills/spec/tools/plan/state-source.ts` | `stateSourceFor(view)`, `joinedSpecState`, `withLiveTasks`, `joinedPhaseMarks` | 2a |
| `skills/spec/tools/plan/read-plans.ts` | `PlanSource { state, marks, isJoined, joined, record }`; `readPlansAt` (checkout settings), `readLocalPlans` (never fetches), `specStatesAt` (lazy, for `pr` commands) | 2a |
| `skills/spec/tools/board/joined-activity.ts` | A joined phase in progress in the tree whose branch its task evidence names | 2a |
| `skills/spec/tools/hooks/frozen-plan-edits.ts` | Which plan parts (boxes, edges, phase lines) a hand edit to a joined spec changed | 2a |
| `skills/spec/tools/context/board-lines.ts` | The pack's `Board:` line and the tree-ahead line; every record-sourced pack line goes here | 2a |
| `skills/spec/tools/plan/phase-writer.ts` | `PhaseWriter` port, `phaseWriterFor` (picked once), `PhaseOutcome`, `renderPhaseOutcome` | 3 |
| `skills/spec/tools/plan/file-writer.ts`, `record-writer.ts` | The two homes: today's planners + `applyEdits`; the record, every action | 3, 3a |
| `skills/spec/tools/plan/record-tick.ts` | Push with `SAVE`, then `sendIntent` the tick; offline queues; the result line | 3 |
| `skills/spec/tools/plan/ops/tick.ts` | `tickPlan` (pure), `findTask`, `closedLine`, `readTickIntent` | 3 |
| `skills/spec/tools/plan/intents.ts` | `INTENT_PLANNERS` (reads) and `intentRunners(git)` (flushes push a queued commit first) | 3 |
| `skills/spec/tools/record/overlay.ts` | Lays queued intents over a view: reads show a queued tick done | 3 |
| `skills/spec/tools/plan/join-from-tree.ts`, `commands/join-from-tree.ts` | `join <spec> --from-tree` | 3 |
| `skills/spec/tools/commands/phase/` | One file per phase action; `context.ts` gives each its writer | 3 |
| `skills/spec/tools/plan/ops/change.ts` | `planChangePlan` (raises `planVersion`, re-checks edges and cycles at the tip), `phaseStatePlan`, `docPatch` | 3a |
| `skills/spec/tools/plan/ops/add.ts`, `split.ts`, `move.ts`, `set.ts`, `phase-state.ts` | Pure edits of a joined plan; `newTasks` gives `<phase>.<n>` ids | 3a |
| `skills/spec/tools/plan/plan-intents.ts` | `PLAN_INTENTS`: per command, how a queued intent reads back and the plan it runs | 3a |
| `skills/spec/tools/plan/record-plan.ts`, `record-send.ts` | Dry run on the read record, then send; `RecordWorld`, `sendRecordIntent`, `storeRefusal` | 3a |
| `skills/spec/tools/phases/move.ts`, `set.ts` | The file home's `move` and `set`; `set.ts` also owns `PhaseFields` and `describeFields` | 3a |
| `skills/spec/tools/plan/docs/parks.ts` | `PhaseDoc.parks` reader; `joinedSpecState` renders them as the phase's Needs you note | 3a |
| `skills/spec/tools/publish/push-commit.ts` | Pushes one queued commit; `gone` when the branch moved on without it | 3 |
| `skills/spec/tools/commands/claim-push.ts` | Push the branch after a held claim | 3 |
| `skills/spec/tools/tests/joined-repo.ts` | A real-git repo with `alpha` joined and the board on; `recordPhase` | 3 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/core/spec-state.ts` | The one funnel for phase state; takes a swappable reader | |
| `skills/spec/tools/graph/nodes.ts` | The funnel for spec fields, and a second parser of `progress.md` done marks | `gotcha-readers-outside-the-spec-state-funnel.md` |
| `skills/spec/tools/commands/phase.ts` | Every phase write starts here; becomes a dispatcher over the `PhaseWriter` port | `decision-one-phase-writer-port-for-both-homes.md` |
| `skills/spec/tools/core/apply-edits.ts` | Plan-then-apply for file edits; the record path sits beside it | |
| `skills/spec/tools/publish/commit-onto.ts` | Scratch-index commit; gains an optional base for the record's first commit | |
| `skills/spec/tools/core/land-on-main.ts` | The fetch → plan → commit → push → retry loop, lifted into `core/land-on-ref.ts` | `principle-record-reuses-the-house-loop-and-cache.md` |
| `skills/spec/tools/mainline/base-cache.ts` | One folder per commit, moved into place by rename: the model for the local copy | `principle-record-reuses-the-house-loop-and-cache.md` |
| `skills/spec/tools/publish/push.ts` | `pushBranch`: the tick's save; gains network options and a typed result | |
| `skills/spec/tools/board/activity.ts` | "In progress in another tree"; feeds claim take and trees place | `gotcha-readers-outside-the-spec-state-funnel.md` |
| `skills/spec/tools/core/phase-entry.ts` | Task counts parsed from entry text; one count rule over tasks | `gotcha-readers-outside-the-spec-state-funnel.md` |
| `skills/spec/tools/ready/ready-set.ts` | Reads `edges.declared`; why join writes edges out | |
| `skills/spec/tools/runtime/workflow-capabilities.ts` | What a Codex pilot may run; phase writes refuse on a joined spec | `decision-codex-reads-the-board-refuses-writes.md` |
| `skills/spec/tools/commands/context.ts` | Pack entry; shared with `codex-runtime-support` 2b | |
| `skills/spec/tools/commands/claim.ts` | Push on take; shared with `codex-runtime-support` 2b | |
| `skills/spec/tools/trees/place-system.ts` | Reads `pr:` and activity; shared with `codex-runtime-support` | |
| `skills/spec/tools/claims/remote.ts` | Lease push, timeout and no-prompt rules; moved to `core/remote-push.ts` and imported back | |
| `skills/spec/tools/playbook/settings.ts` | Where the `board.record` switch is read | |
| `skills/spec/tools/hooks/spec-file-check.ts` | Blocking feedback after a hand edit to state in a joined spec | |
| `skills/spec/tools/plan/plan-diff.ts` | `PlanShape` and the one-line "Plan changed …" summary between two versions | 3b |
| `skills/spec/tools/plan/plan-version.ts` | Per-session memory in tmpdir: plan shape shown per spec, last fetch attempt | 3b |
| `skills/spec/tools/plan/write-notice.ts` | Puts the plan-changed notice on every record write's outcome | 3b |
| `skills/spec/tools/hooks/plan-changed.ts` | Before-edit check: throttled fetch, notice once per version | 3b |
| `skills/spec/tools/commands/plan.ts`, `plan/apply.ts` | `plan apply`: a new spec's plan from a JSON draft, stub progress.md | 4 |
| `skills/spec/tools/commands/join-tidy.ts`, `plan/tidy.ts`, `plan/tidy-holders.ts` | `join --tidy`: stub + no boxes/edges on main, per file, unless a tree or `feat/<spec>*` branch holds it | 4 |
| `skills/spec/tools/commands/record-export.ts`, `plan/export.ts` | `record export [--unjoin]`: the way back to files | 4 |
| `skills/spec/tools/plan/deliverables.ts`, `plan/banner.ts` | Deliverables section helpers; banner, stub and manual read line | 4 |
| `skills/spec/tools/doctor/joined.ts` | Doctor checks for a joined spec | 4 |
| `skills/spec/tools/plan/docs/pr-doc.ts` | PR document reader, `missingPrDocs`, the `default` group | 6 |
| `skills/spec/tools/plan/upgrade.ts`, `plan/upgrade-read.ts`, `plan/upgrade-send.ts` | Files → record copier (four fields, PR numbers); layout-1 upgrade on first write | 6 |
| `skills/spec/tools/graph/spec-fields.ts` | `readSpecFields`: one reader of a spec's fields in either home | 6 |
| `skills/spec/tools/plan/ops/field.ts`, `commands/spec-field-write.ts`, `commands/spec-status.ts` | Field intent; owner/ship/focus/spec-status on the record | 6 |
| `skills/spec/tools/plan/pr-sync.ts`, `plan/pr-observed.ts`, `plan/pr-sync-send.ts` | PR document sync: match by branch then head, GitHub → state, `recordPr` | 6 |
| `skills/spec/tools/board/pr-sync.ts` | The board's PR lists → synced PR documents and the write-back | 6 |
| `skills/spec/tools/plan/phase-stage.ts` | `phaseStage`: todo, doing, built, merged, deployed, done | 6 |
| `skills/spec/tools/board/joined-activity.ts`, `board/record-rows.ts` | Joined phases in flight by stage; the `open-pr` *Needs you* row | 6 |
| `skills/spec/tools/core/land-on-main.ts` | Branch port over `landOnRef`; `pushDeclined` in `core/remote-push.ts` | 6 |
| `skills/spec/SKILL.md` | Layout rules and the *Tools* section | |

## External references

- Academy board (CRM repo): `ops/src/academy-board/doc-writes.ts`, `board-store.ts`, `board-schema.ts`
- Data model page: https://claude.ai/artifact/UtB3HsPKyqBLMupkt1hn2g
- Implementation page: https://claude.ai/artifact/47cx1m6MJBwKoYXmh63gww
