---
needs: [2]
pr: C
---

# Phase 3 — The spec branch and merge-back

**Goal:** `crew start --spec` turns spec-branch mode on (an explicit spec field) and cuts `feat/<spec>`; lanes run in parallel, cut from `feat/<spec>` (ship-alone groups from main); `merge-back <spec>` brings the spec branch and main into a lane, pushes the lane into the spec branch without force, and publishes spec docs through `publishDocs`.

**Outcome:** Workers build on each other's finished phases without waiting for merges to main, and spec docs stop conflicting on main · medium · risk: a new push path into a shared branch; never forced, refuses on any doubt.

**Files to touch:**
- `skills/spec/tools/commands/crew/overseer.ts` (`crew start --spec`: refusals, cut, fields), the spec-field writer `ship` uses, `phases/set.ts` (ship-alone freeze)
- `skills/spec/tools/crew/pick.ts` (`groupKey`), `commands/crew/tick.ts` (`busy`)
- `skills/spec/tools/trees/acquire.ts`, `trees/place.ts`, `trees/place-system.ts` (base from `specLayout`)
- `skills/spec/tools/publish/merge-back.ts` (new), `publish/merge-commit.ts` (new, extracted), `publish/sync-main.ts`, `publish/publish.ts`, `publish/push.ts`, `commands/publish-docs.ts`, `commands/push.ts`
- `skills/spec/tools/commands/merge-back.ts` (new), `skills/spec/tools/spec.ts`
- `skills/spec/tools/pr/actions/open.ts` (unplanned-branch refusal only), `board/joined-activity.ts` and the unopened-PR rows
- tests: `trees-acquire.git.test.ts`, `publish-merge-back.test.ts` (new, `fakeRef`), `publish-merge-back.git.test.ts` (new; `REAL_GIT_CAP` +1), `publish.git.test.ts`, `push.git.test.ts`, `pr-open-base.test.ts` (new), `crew-tick-step.test.ts`

## Implementation guidance

technical.md → *Phase 3*. Refactors first, each its own green commit: `addTree` param `defaultBranch`
→ `base`; `mergeCommit` shared by sync-main and publish with their messages passed in verbatim
(`publish.git.test.ts`, `push.git.test.ts` assert them). Then turning the mode on, then the command,
then `groupKey`: parallel lanes switch on last, once merge-back exists.

Everything reads Phase 2's `specLayout`: no tool asks git whether the mode is on, and no tree records its
base (`principle-one-spec-layout`).

The gate between `merge-back` and `merge-back --push` is the worker's: tools expand gates, never run
them. When main came in, the line names `after-merge-main` as well as `per-commit`. `--push` pushes the lane
to its own name first so nothing is lost when the spec branch moved. No ancestor pre-check: push, and
read git's non-fast-forward rejection as "moved".

Main reaches the spec branch only through lanes (`decision-main-reaches-the-spec-branch-through-lanes`);
there is no `--main`.

Docs: call `publishDocs` unchanged right after the push, then land its snapshot merge on `feat/<spec>`.
When another lane pushed in between, merge the docs-only snapshot onto the new tip off-checkout and
lease-push it, two attempts. Never push "lane + snapshot" before publishing: a snapshot on the branch but
not on main becomes `snapshotBase` and the next publish skips changes (`snapshot.ts:60-63`). Report a docs
refusal after the push line; never undo the push.

`--main` runs in the main checkout with no tree: off-checkout merge + `landOnRef`-style lease retry.

## Deliverables

- [ ] Refactor: `addTree(…, base, …)`; real-git case cutting from a non-default origin branch
- [ ] Refactor: `mergeCommit(git, {first, second, message, conflict})` used by sync-main and publish; existing tests green, messages unchanged
- [ ] `crew start --spec` turns the mode on: refuses a spec off the record, a code phase without `pr:`, a ship-alone group needing another group, and an existing `feat/<spec>` or `feat/<spec>-pr-*` on origin; cuts `feat/<spec>` (create-only lease); writes `spec-branch: on` + `ship-alone:`; `phase set` refuses changing a cut group's ship-alone membership; placement cuts each group from its `specLayout` base
- [ ] `merge-back <spec>`: lane check against the plan at base, fetch, merge `feat/<spec>` then the default branch (or "already holds"), names the gates to run, conflict left in progress with paths
- [ ] `merge-back <spec> --push`: lane pushed, push to `feat/<spec>` with a non-fast-forward rejection mapped to "moved", `publishDocs` unchanged, the snapshot merge landed on `feat/<spec>` (merged onto a moved tip off-checkout, two attempts)
- [ ] `pr open` refuses a lane head in spec-branch mode; `publish-docs` and `push` refuse in a lane tree; `pushBranch(git, { defaultBranch, base })`
- [ ] `groupKey(spec, group, layout)` shared by `pickRows` and the tick's `busy`: per group in spec-branch mode, per spec otherwise; pure tests that both callers agree
- [ ] Board record in spec-branch mode: `joinedActivity` and the unopened-PR rows read lane groups against the `default` PR document, so a finished lane is never "built, PR not opened"; tests

## Phase-local notes

- `gotcha-trees-place-reads-pr-group-from-base`: lanes come from the plan where it lives (record or main).
- `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`: commit-tree needs `isolatedRunner`.
- New `.git.test.ts`: list it in `real-git/allowlist.ts`, raise the cap, build repos in `beforeAll`.
