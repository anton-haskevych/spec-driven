---
needs: [1, 2]
pr: C
---

# Phase 3 — The spec branch and merge-back

**Goal:** `crew start --spec` turns spec-branch mode on (an explicit spec field) and cuts `feat/<spec>`; lanes run in parallel, cut from `feat/<spec>` (ship-alone groups from main); `merge-back <spec>` brings the spec branch and main into a lane, lease-pushes the lane into the spec branch as a fast-forward, and publishes spec docs through `publishDocs` (`docs: main`).

**Outcome:** Workers build on each other's finished phases without waiting for merges to main, and spec docs stop conflicting on main · medium · risk: a new push path into a shared branch; never forced, refuses on any doubt.

**Files to touch:**
- `skills/spec/tools/commands/crew/overseer.ts`, `crew/spec-branch-start.ts` (new: pure refusal, cut), a `specBranchPlan` record plan beside `plan/ops/field.ts` (registered like `FIELD_COMMAND`), `plan/docs/spec-doc.ts`, `phases/set.ts` + `phases/add.ts` (ship-alone freeze, mode invariants)
- `skills/spec/tools/crew/pick.ts` (`groupKey`, cross-lane hold), `commands/crew/tick.ts` (`busy`, `TickWorld.layouts`), `crew/scope.ts` (the `specBranch` skip)
- `skills/spec/tools/trees/acquire.ts`, `trees/place.ts`, `trees/place-system.ts` (base from `specLayout`)
- `skills/spec/tools/publish/merge-back.ts` (new), `publish/publish.ts` (`snapshotMerged` rename), `publish/push.ts` + its callers (`plan/record-tick.ts`, `commands/claim-push.ts`, `publish-docs.ts`, `push.ts`, `pr/actions/open.ts`), `core/remote-push.ts` (`leasePush`, unchanged)
- `skills/spec/tools/commands/merge-back.ts` (new), `skills/spec/tools/spec.ts`
- `skills/spec/tools/pr/actions/open.ts` (unplanned-branch refusal only), the unopened-PR rows
- tests: `trees-acquire.git.test.ts`, `publish-merge-back.test.ts` (new, `fakeRef`), `publish-merge-back.git.test.ts` (new; `REAL_GIT_CAP` +1), `push.git.test.ts`, `pr-open-base.test.ts` (new), `crew-tick-step.test.ts`

## Implementation guidance

technical.md → *Phase 3*. Refactor first, its own green commit: `addTree` param `defaultBranch`
→ `base`. Then turning the mode on, then the command, then `groupKey`: parallel lanes switch on last,
once merge-back exists.

Turning the mode on is one record write, then the cut: `specBranchPlan` checks the invariants at the tip,
writes `specBranch: { cutFrom, shipAlone }` and the `default` PR document (`not-opened`, branch
`feat/<spec>`) together, and is never queued. Then `cutFrom` is pushed create-only. A re-run with the mode
on is a takeover: no checks, cut only if the branch is missing. These are crew state, not user fields:
not in `SPEC_FIELD_KEYS`. In the mode the phase writer refuses what would break `specLayout` (an ungrouped
code phase, a ship-alone group needing another group): an invariant, not a lock.

Cross-lane needs: a phase reads done at its last tick, before its code is on `feat/<spec>`. In the mode
`pickRows` holds a row while a needed phase's lane still has a launched worker not closed out.

Everything reads Phase 2's `specLayout`: no tool asks git whether the mode is on, and no tree records its
base (`principle-one-spec-layout`).

The gate between `merge-back` and `merge-back --push` is the worker's: tools expand gates, never run
them. When main came in, the line names `after-merge-main` as well as `per-commit`. `--push` pushes the lane
to its own name first so nothing is lost when the spec branch moved. Then `leasePush` to `feat/<spec>`
expecting the tip it just fetched, after checking HEAD holds that tip (a lease is a forced push; the
check keeps it a fast-forward). A lease refusal reads as "moved". A conflict line ends "then
`merge-back <spec>` again", so main and the gates still come after a hand resolution.

Main reaches the spec branch only through lanes (`decision-main-reaches-the-spec-branch-through-lanes`);
there is no `--main`.

Docs (only with `docs: main`; `publishDocs` doesn't check it): call `publishDocs` unchanged right after
the push. Its snapshot lands on main, and every lane's next `merge-back` brings main in, so the snapshot
reaches `feat/<spec>` gated, with no second push. Never push "lane + snapshot" before publishing: a
snapshot on the branch but not on main becomes `snapshotBase` and the next publish skips changes
(`snapshot.ts:60-63`). Report a docs refusal after the push line; never undo the push.


## Deliverables

- [x] Refactor: `addTree(…, base, …)`; real-git case cutting from a non-default origin branch
- [x] `crew start --spec` turns the mode on through `crew/spec-branch-start.ts`: a pure refusal (off the record; an open code phase without `pr:`; a ship-alone group needing another group; a numbered `default` PR doc; `feat/<spec>` or `feat/<spec>-pr-*` on origin, as a local branch or tree), one `specBranchPlan` record write (`specBranch: { cutFrom, shipAlone }` + the `default` PR doc, never queued), then the create-only cut of `cutFrom`; mode already on → takeover: checks skipped, cut only if missing; `phase set` refuses changing a cut group's ship-alone membership; placement cuts each group from `branchOf`/its layout base
- [x] `merge-back <spec>`: lane check against the plan at base, fetch, merge `feat/<spec>` then the default branch (or "already holds"), prints the `spec.ts gates --name` lines to run, a conflict left in progress with paths and "then merge-back <spec> again"
- [x] `merge-back <spec> --push`: refuses unless HEAD holds the fetched `origin/feat/<spec>` tip; lane pushed; `leasePush` to `feat/<spec>` expecting that tip, a refusal mapped to "moved"; then, only with `docs: main`, `publishDocs` unchanged (the snapshot reaches `feat/<spec>` through main at the next merge-back; no off-checkout snapshot push); `publishDocs`' `mergeBack` field renamed `snapshotMerged`
- [x] `pr open` refuses a lane head in spec-branch mode; `publish-docs` and `push` refuse in a lane tree; `pushBranch(git, { defaultBranch, base? })` (`base` defaults to `defaultBranch`; 6 callers incl. `plan/record-tick.ts`); the phase writer refuses, in the mode, an ungrouped code phase and a ship-alone group needing another group's phase
- [x] `groupKey(spec, group, layout)` shared by `pickRows` and the tick's `busy`, layouts from one `TickWorld.layouts` map: per group in spec-branch mode, per spec otherwise; in the mode `pickRows` holds a row while a needed phase's lane has a launched worker not yet closed out; the whole-board skip adds `specBranch`; pure tests
- [x] Board record in spec-branch mode: lane groups never get the unopened-PR row while the mode is on (the final PR's state reaches lane documents in Phase 5); tests

## Phase-local notes

- `gotcha-trees-place-reads-pr-group-from-base`: lanes come from the plan where it lives (record or main).
- `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`: commit-tree needs `isolatedRunner`.
- New `.git.test.ts`: list it in `real-git/allowlist.ts`, raise the cap, build repos in `beforeAll`.
