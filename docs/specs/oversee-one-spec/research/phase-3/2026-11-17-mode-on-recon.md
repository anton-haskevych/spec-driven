# Phase 3 recon — turning spec-branch mode on (deliverables 1–2)

T = `skills/spec/tools`. Two Explore agents, one wave (2026-11-17).

## Surprise: Phase 1 is not built

`crew start` has no `--spec` (`T/commands/crew/overseer.ts:20-44`, `parseCaps` :81-97 is `strict` with only
`workers`/`babysitters`); `crew/scope.ts` and `TickWorld.layouts` don't exist. Phase 3 only `needs: [2]`, but its
crew wiring (start --spec, the scope skip, groupKey in the tick) sits on Phase 1's files. Order this phase so those
come last; everything else is independent of Phase 1.

## The seam

- **Placement base.** `placeTree` (`T/trees/place.ts:60-76`) names the tree with `treeName(spec, prGroup)` (:67);
  `PlaceWorld` (:36-47) has no layout. `loadPlaceWorld` (`T/trees/place-system.ts:59-78`) already has `nodes`
  (`SpecNode.specBranch`, `T/graph/nodes.ts:28`), the same way `T/commands/ready.ts:49` builds
  `specLayout(state, nodes.get(spec)?.specBranch)`. `addPlacedTree` (:31-57) passes `world.defaultBranch` to
  `addTree` (:38). Only the "created" path reads the base.
- **Record write.** A `RecordPlan` is `(view) => {ops, message} | {refused} | {unchanged}` (`T/record/write.ts:8`);
  `fieldPlan` (`T/plan/ops/field.ts:19-29`) is the shape. `update` ops are merge-patches (`T/record/plan-writes.ts:83`,
  `document.ts:26-34`), validated by `validateRecordDoc` → `readSpecDoc`, which already reads `specBranch`
  (`T/plan/docs/spec-doc.ts:55,59-68`). `notOpenedPrDoc(spec, "default")` (`pr-doc.ts:58-60`) is the `default` doc;
  a `create` on an existing path conflicts (`plan-writes.ts:77`), so check `view.doc(prDocPath(...))` first.
- **Never queued.** Registering in `PLAN_RUNNERS` (`T/plan/intents.ts:15-25`) makes it queueable through
  `sendIntent` (`T/record/outbox.ts:40-48`). Never-queued writes call `writeRecord(port,
  stampedBy(...)(plan), { validate: validateRecordDoc })` directly (`T/commands/join.ts:71`,
  `T/commands/card/land.ts:18-40`) after `boardBase(git, branch, "<what>")` (`T/plan/board-base.ts:13-22`).
  `landOnRef` re-plans at each tip (`T/core/land-on-ref.ts:42-66`), which is the "checks run again at the tip".
- **Cut.** `leasePush(git, ref, "", refspec)` is create-only (`T/core/remote-push.ts:11-14`); mirror
  `T/claims/remote.ts:22-28`. Tip from `pinDefault` (`T/publish/snapshot.ts:23-27`).
- **Writer invariants.** Every plan op goes through `planChangePlan` (`T/plan/ops/change.ts:34-49`), which refuses
  problems the change *introduces*: `newProblems(specPlanProblems(spec, phases), specPlanProblems(next, …))` (:43).
  `specPlanProblems(spec: SpecDoc, phases)` (`T/plan/docs/spec-plan.ts:10-20`) gets the full SpecDoc, so
  `spec.specBranch` is in reach: the layout invariants are two more problem kinds there. File specs never hold
  `specBranch` (record only), so the file writer needs nothing.

## Reuse

- `specLayout` / `branchOf` (`T/pr/groups.ts:54-79`): `ungrouped` is check 2 as-is.
- `resolvePhaseRef` / `phaseNeeds` for "a ship-alone group needing another group's phase".
- `branchOnOrigin` (`T/claims/remote.ts:43-45`, `ls-remote --heads`) for check 5's origin side.

## Testing issues

- Real-git cap is full: `REAL_GIT_CAP = 74` with 74 files (`T/tests/real-git/allowlist.ts:80`); the new
  `publish-merge-back.git.test.ts` raises it.
- Record factories `specDoc`/`prDoc`/`phaseDoc` (`T/tests/record-factories.ts`) and `viewOf`
  (`T/tests/fake-record.ts`) cover the plan tests; `T/tests/plan-ops-change.test.ts` is the writer harness.
- `place.ts` 102 lines, `place-system.ts` 79, `acquire.ts` 39: room. `T/commands/crew/overseer.ts` grows in Phase 1
  too: the start wiring waits for it.
