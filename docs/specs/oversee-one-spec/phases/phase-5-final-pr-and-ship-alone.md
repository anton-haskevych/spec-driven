---
needs: [3]
same-files-as: [4]
pr: D
---

# Phase 5 — The final PR and ship-alone groups

**Goal:** In spec-branch mode, `pr open <spec> [default]` opens one PR from `feat/<spec>` covering every phase outside ship-alone groups, with a per-phase *How to review*; a babysitter carries it in the spec's ship mode; ship-alone groups keep their own PR to main.

**Outcome:** A spec ships as one PR you can review phase by phase, while a backend piece another phase needs deployed still goes out early on its own · medium · risk: touches PR resolve and PR documents, which every babysit reads.

**Files to touch:**
- `skills/spec/tools/pr/actions/open.ts`, `pr/actions/pr-text.ts`, `pr/resolve.ts`, `pr/groups.ts` (`pickGroup`)
- `skills/spec/tools/trees/place.ts` (`wholeGroup`, `:67`), `board/tree-target.ts`, `crew/tick-step.ts` (`PR moment`)
- `skills/spec/tools/plan/docs/pr-doc.ts`, `plan/pr-sync.ts` (`prSyncPlan`: lane copies, mode end)
- `skills/spec/tools/claims/pr-claim.ts`, `claims/rules.ts`
- `skills/spec/tools/context/babysit-pack.ts`, `skills/spec/tools/launch/place-for-launch.ts`, `skills/spec/babysit.md`
- tests: `pr-open-base.test.ts`, `pr-resolve.test.ts`, `plan-pr-observed.test.ts`, `pr-claim.test.ts`, `claims-rules.test.ts`

## Implementation guidance

technical.md → *Phase 5*. The final PR is group `default`, the group whose branch is already
`feat/<spec>` (`DEFAULT_PR_GROUP`). Spec-branch mode guarantees no phase uses it, because every code phase
carries `pr:`. That makes `default` real only in `pr-doc.ts` today: `pickGroup`, `wholeGroup`, `treeName`
(`feat/<spec>-pr-default`), the babysit pack, `takeRefusal` and babysit's existing-only placement all fail
for it (review 2026-11-17 final-pr-and-mode-ends). Route every group-to-branch lookup through
`branchOf(layout, group)`; let babysit placement cut or take over the final-PR tree from
`origin/feat/<spec>`; the babysitter runs `pr open` there (`createPr` needs a tree on the head). Phase 3's
`specBranchPlan` already created the `default` PR document. No new claim kind: `pr-spec` would parse as a group named
"spec" at `place.ts`, `board/flight.ts` and `board/joins.ts` (review 2026-11-17).

Resolve first: a spec in spec-branch mode with no group named resolves to `default`; groups that ship
alone resolve as today. Lane groups' PR documents stay `not-opened` while the run lasts (Phase 3 keeps them off
the unopened-PR rows). When the `default` document turns merged, `prSyncPlan` copies its number, state and
merge onto every lane document in the same write and removes `specBranch`. Every merge path goes through
it (`pr merge`, `pr status`, a board load seeing a GitHub merge), so a merge by hand ends the mode too, and
stage, cards and prune read each lane's own document with the mode on or off. A closed final PR keeps the
mode and becomes a Needs-you row.

*How to review* lists each phase: Outcome, files to touch, and its commits, taken from its tasks'
record evidence shas.

The PR moment in the mode: a lane's `PR group ready` starts nothing; the tick prints `PR moment: <spec>
final PR` once every code phase outside the ship-alone groups is done.

Once every lane is done the babysitter is the only writer of main into `feat/<spec>`. It fixes review
comments itself: there is no group's last phase to relaunch.

## Deliverables

- [x] `pr resolve` / `pr status` / `pr merge`, `pickGroup`, `wholeGroup` (`place.ts`), `babysit-pack.ts` and `board/tree-target.ts` map group `default` to `feat/<spec>` through `branchOf` in spec-branch mode; no group named resolves to `default`
- [x] `pr open <spec> [default]` from `feat/<spec>`: title and body over every phase outside ship-alone groups
- [x] `prSyncPlan`: when the `default` document turns merged, the same record write copies number, state and merge onto every lane group's document and removes `specBranch`; a closed final PR keeps the mode and is a Needs-you row; deploy marking covers `finalPr.phases`
- [x] `pr hold --how-to-review` text with one section per phase: Outcome, files, and its commits from its tasks' record evidence shas
- [x] `launch babysit <spec> default` cuts or takes over a tree on `feat/<spec>` (not `existingOnly` for the final PR) through `branchOf`; claim `pr-default` accepted by `takeRefusal` in spec-branch mode; `claimKey` already maps it (test case only); the babysitter opens the PR from that tree
- [x] `babysit.md`: the final PR merges `origin/<base>` and is the only writer of main into the spec branch once lanes are done; a lane push while the PR is open is a non-fast-forward for the babysitter, which merges `origin/feat/<spec>`; it fixes review comments in its own tree
- [x] The tick prints `PR moment: <spec> final PR` once every code phase outside the ship-alone groups is done (`crew/tick-step.ts`)

## Phase-local notes

- `gotcha-changes-requested-outlives-the-fix`: one relaunch per review id, as today.
- `gotcha-pr-status-verdict-none-is-not-no-pr`.
