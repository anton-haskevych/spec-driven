# Code Map — Oversee One Spec

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/crew/machine.ts` | `machineWorkers` (working/blocked execute workers, every repo), `MACHINE_WORKERS` = 6 | 1 |
| `skills/spec/tools/crew/scope.ts` | `scopeWorld`/`inScope`: a tick's world for one spec or minus overseen specs; `specRun`, `openSpecRuns`, `overseenLines` | 1 |
| `skills/spec/tools/commands/crew/tick-ports.ts` | `systemTickPorts` moved out of `tick.ts`: `world(spec?)` (with the spec's plan change), `overseen()`; phase 3 adds `TickWorld.layouts` | 1 |
| `skills/spec/tools/commands/phase/overseer-notice.ts` | `withOverseerNotice` wraps plan-shape writes; `overseerNoticeFor` (run file, then liveness) | 1 |
| `skills/spec/tools/tests/crew-fake-deps.ts` | `fastCrewDeps` on `gitStub`: crew tests without git | 1 |
| `skills/spec/tools/crew/spec-branch-start.ts` | pure start refusal, `startPlan` (takeover at the tip), branch discovery, the create-only cut | 3 |
| `skills/spec/tools/commands/crew/spec-branch.ts` | `startSpecBranch`: the mode step `crew start --spec [--ship-alone D,E]` runs before it writes the run | 3 |
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
| `skills/spec/tools/crew/deps.ts` | `runFileStore(…, spec?)`, `listRunFiles`, `CrewDeps.agents` | |
| `skills/spec/tools/crew/pick.ts` | `groupKey`/`workKey`: one worker per lane in spec-branch mode, per spec outside it; cross-lane hold | `decision-cross-lane-needs-wait-for-close-out` |
| `skills/spec/tools/commands/crew/tick.ts` | scope, ports, `busy` key, machine cap | |
| `skills/spec/tools/commands/phase/context.ts` | wraps every writer with the overseer notice | |
| `skills/spec/tools/commands/crew/launch-session.ts` | the machine refusal; `machineBusy` / `relaunch` on the request | |
| `skills/spec/tools/trees/acquire.ts` | `addTree` base param | |
| `skills/spec/tools/publish/publish.ts` | `publishDocs` called unchanged from `--push` | `gotcha-snapshot-on-branch-not-on-main-becomes-the-base` |
| `skills/spec/tools/publish/push.ts` | `pushBranch(git, { defaultBranch, base })` | |
| `skills/spec/tools/crew/close-out-run.ts` | spec-branch close-out; `claimKey` for `default` | |
| `skills/spec/tools/plan/pr-sync.ts` | `prSyncPlan` ends the mode: lane PR docs copied from the final PR | `decision-spec-branch-mode-starts-and-ends-in-one-record-write` |
| `skills/spec/tools/trees/place.ts` | `wholeGroup` / tree names go through `branchOf` for `default` | `principle-one-spec-layout` |
| `skills/spec/tools/plan/docs/pr-doc.ts` | `DEFAULT_PR_GROUP` = `feat/<spec>` = the final PR; its doc is created by `specBranchPlan` | |

## External references

-
