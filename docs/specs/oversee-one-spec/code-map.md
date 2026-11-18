# Code Map — Oversee One Spec

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/crew/machine.ts` | machine-wide worker count | 1 |
| `skills/spec/tools/crew/scope.ts` | `scopeWorld`: a tick's world for one spec or minus overseen specs; `specRun` | 1 |
| `skills/spec/tools/commands/crew/tick-ports.ts` | `systemTickPorts` moved out of `tick.ts`; builds `TickWorld.layouts` | 1 |
| `skills/spec/tools/crew/spec-branch-start.ts` | pure start refusal, `startPlan` (takeover at the tip), branch discovery, the create-only cut | 3 |
| `skills/spec/tools/commands/crew/spec-branch.ts` | `startSpecBranch`: the mode step `crew start --spec` calls (Phase 1 adds the flag) | 3 |
| `skills/spec/tools/plan/ops/spec-branch.ts` | `specBranchPlan`, unregistered (never queued); `specBranchStartProblems` | 3 |
| `skills/spec/tools/plan/docs/spec-branch-rules.ts` | the mode's layout invariants (in `specPlanProblems`), `shipAloneMoves`, `shipsAloneIn`, `isLaneGroup` | 3 |
| `skills/spec/tools/publish/merge-back-render.ts` | merge-back's lines, gate lines first | 3 |
| `skills/spec/tools/pr/load-layout.ts` | `loadSpecLayout` from the record; `laneRefusal` for push / publish-docs | 3 |
| `skills/spec/tools/pr/actions/lane-head.ts` | `pr open` refuses a lane head | 3 |
| `skills/spec/tools/ready/build-order.ts` | `buildOrder`: batches, longest chain, cycle | 2 |
| `skills/spec/tools/publish/merge-back.ts` | lane merge + `--push` | 3 |
| `skills/spec/tools/commands/merge-back.ts` | thin command | 3 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/pr/groups.ts` | gains `specLayout`, `branchOf`, `laneOf`, `baseBranchOf`; every tool reads branch, base, ship-alone from it | `principle-one-spec-layout` |
| `skills/spec/tools/crew/deps.ts` | `runFileStore(…, spec?)` | |
| `skills/spec/tools/crew/pick.ts` | `groupKey`; one worker per spec until phase 3; cross-lane hold | `decision-lanes-ship-with-the-spec-branch` |
| `skills/spec/tools/commands/crew/tick.ts` | scope, ports, `busy` key, machine cap | |
| `skills/spec/tools/commands/phase/context.ts` | overseer notice on plan writes | |
| `skills/spec/tools/trees/acquire.ts` | `addTree` base param | |
| `skills/spec/tools/publish/publish.ts` | `publishDocs` called unchanged from `--push` | `gotcha-snapshot-on-branch-not-on-main-becomes-the-base` |
| `skills/spec/tools/publish/push.ts` | `pushBranch(git, { defaultBranch, base })` | |
| `skills/spec/tools/crew/close-out-run.ts` | spec-branch close-out; `claimKey` for `default` | |
| `skills/spec/tools/plan/pr-sync.ts` | `prSyncPlan` ends the mode: lane PR docs copied from the final PR | `decision-spec-branch-mode-starts-and-ends-in-one-record-write` |
| `skills/spec/tools/trees/place.ts` | `wholeGroup` / tree names go through `branchOf` for `default` | `principle-one-spec-layout` |
| `skills/spec/tools/plan/docs/pr-doc.ts` | `DEFAULT_PR_GROUP` = `feat/<spec>` = the final PR; its doc is created by `specBranchPlan` | |

## External references

-
