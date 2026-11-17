# Code Map — Oversee One Spec

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/crew/machine.ts` | machine-wide worker count | 1 |
| `skills/spec/tools/crew/scope.ts` | `scopeWorld`: a tick's world for one spec or minus overseen specs | 1 |
| `skills/spec/tools/ready/build-order.ts` | `buildOrder`: batches, longest chain, cycle | 2 |
| `skills/spec/tools/publish/merge-back.ts` | lane merge + `--push` | 3 |
| `skills/spec/tools/publish/merge-commit.ts` | off-checkout merge shared by sync-main, publish, merge-back | 3 |
| `skills/spec/tools/commands/merge-back.ts` | thin command | 3 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/pr/groups.ts` | gains `specLayout`; every tool reads branch, base, ship-alone from it | `principle-one-spec-layout` |
| `skills/spec/tools/crew/deps.ts` | `runFileStore(…, spec?)` | |
| `skills/spec/tools/crew/pick.ts` | `groupKey`; one worker per spec until phase 3 | `decision-lanes-ship-with-the-spec-branch` |
| `skills/spec/tools/commands/crew/tick.ts` | scope, ports, `busy` key, machine cap | |
| `skills/spec/tools/commands/phase/context.ts` | overseer notice on plan writes | |
| `skills/spec/tools/trees/acquire.ts` | `addTree` base param | |
| `skills/spec/tools/publish/publish.ts` | `publishDocs` called unchanged from `--push` | `gotcha-snapshot-on-branch-not-on-main-becomes-the-base` |
| `skills/spec/tools/publish/push.ts` | `pushBranch(git, { defaultBranch, base })` | |
| `skills/spec/tools/crew/close-out-run.ts` | spec-branch close-out; `claimKey` for `default` | |
| `skills/spec/tools/board/joined-activity.ts` | lane groups read against the `default` PR doc | |
| `skills/spec/tools/plan/docs/pr-doc.ts` | `DEFAULT_PR_GROUP` = `feat/<spec>` = the final PR | |

## External references

-
