# Phase 5 preflight — final PR (chunk: deliverables 1–5)

Inputs: the phase entry, `2026-11-17-final-pr-recon.md`, `principles.md`.

## Findings that change the plan

1. **Babysit placement can't decide "final PR" in `place-for-launch.ts`.** `placeForLaunch` (`T/launch/place-for-launch.ts:19`)
   has no layout; `placeTree` does (`PlaceWorld.layout`, `T/trees/place.ts:49`). The phase file names the launch file;
   the decision belongs in `placeTree`: `existingOnly` is ignored for group `default` when the layout has `finalPr`.
2. **The final-PR tree's cut base must be `feat/<spec>` itself, not main.** `baseBranchOf` (`T/pr/groups.ts:88-91`)
   returns the default branch for `default` in spec-branch mode (no `default` key in `layout.groups`). `addTree`
   (`T/trees/acquire.ts:22-27`) takes over `origin/feat/<spec>` when it exists and otherwise cuts from base; cutting
   `feat/<spec>` from main would open a final PR with none of the lanes' work. With base = `feat/<spec>`, a missing
   origin branch refuses (`no origin/feat/<spec> to branch from`), which is right.
3. **The closed-final-PR Needs-you row has no home yet.** `AttentionRow` (`T/board/model.ts:98-120`) has no kind for it;
   `unopenedPrs` (`T/board/record-rows.ts:4`) reads flight rows, and a lane phase never gets `prNotOpened`
   (`T/board/joined-activity.ts:37`). Add a `final-pr-closed` kind built from the record (spec doc `specBranch` +
   `default` PR doc `closed`), rendered in `board/render.ts:98` and `page/needs.ts:17`.
4. **How to review needs "files to touch", which no reader extracts.** `PhaseEntrySummary` (`T/core/phase-entry.ts:5-11`)
   has goal/outcome only; `PhaseState.entry` holds the raw text (`T/core/spec-state.ts:68`). Add one pure
   `filesToTouch(entry)` beside `summarizePhaseEntry`.
5. **`pr hold` resolves by PR number, not group.** The babysitter calls `pr hold <n>` (`babysit.md:131`), so the phase
   list must come from the PR's head branch: `specOfBranch(view.headRefName)` then the layout group whose branch it is
   (`finalPr` for `feat/<spec>`).

## Clean Code against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names | Bites | `treeName(spec, "default")` vs `prBranch`: add `prTreeName(spec, group)` in `pr-doc.ts`; `prBranch` = its `.branch`. |
| Small functions / one thing | Bites | `prSyncPlan` loop (`pr-sync.ts:70-77`) gains the mode end: put it in its own `modeEndOps(view, spec, doc)`. |
| No flag arguments | Bites | `placeTree`'s `existingOnly` stays; the final-PR exception is computed, not a new flag. |
| Errors as values | Inert | Result types already used everywhere. |
| Tests F.I.R.S.T | Bites | Fakes only; no new `.git.test.ts`. |

## Clean Architecture

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | Pure callers (`takeRefusal`, `placeTree`, `babysitPack`) take a `SpecLayout`; commands build it (`principle-one-spec-layout`). |
| Humble object | Inert | Git/gh stay behind `Runner`. |

## SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | How-to-review text is its own module (`pr/how-to-review.ts`), not inside `hold.ts`'s I/O. |
| OCP | Bites | `pickGroup(state, requested, layout?)`: optional layout keeps every existing call working. |
| DIP | Inert | — |

## DDD

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Ubiquitous language | Bites | "final PR" = group `default` in spec-branch mode; no new term in code. |
| Invariant owner | Bites | Mode end is owned by `prSyncPlan` alone (`decision-spec-branch-mode-starts-and-ends-in-one-record-write`). |

## Guard blindness

None claimed. The real-git allowlist only bites `*.git.test.ts`; this chunk adds none.

## Seam and testability (deltas from recon)

- Recon missed `page/needs.ts:17` (a `Record<AttentionRow["kind"], …>`): the new kind needs a label there.
- `claimKey` (`crew/close-out-run.ts:22-26`) already maps `babysit default` → `<spec>#pr-default`: a test case in
  `crew-close-out-run.test.ts`.

## Amendments

1. `pickGroup(state, requested, layout?)`: with `layout.finalPr`, no group or `default` → `{ name: "default", phases: finalPr.phases }`. Without a finalPr, `default` names the unnamed group.
2. `groupBranch(layout, group)` = `branchOf(layout, group.name ?? DEFAULT_PR_GROUP)`; `resolve.ts:64` and `open.ts:45` use it.
3. `baseBranchOf` returns `finalPr.head` for `default` when `finalPr` exists.
4. `placeTree`: `wholeGroup` takes the layout and answers `default` from `finalPr.phases` (or the unnamed group); tree name via `prTreeName`; `existingOnly` waived for the final PR.
5. `TakeView.layout?`; `takeRefusal` accepts `pr-default` when `layout.finalPr`. `claim.ts` builds layouts from `nodes`.
6. `BabysitPackInput.layout?`; `default` (or no group, in the mode) lists `finalPr.phases` on `feat/<spec>`.
7. `prSyncPlan`: when the spec's `default` doc reads merged and `specBranch` is set, copy `number, state, mergedAt, mergedSha, method` onto every lane doc and `update { specBranch: null }`, same batch.
8. New attention kind `final-pr-closed`.
9. `pr hold`: append generated per-phase sections (Outcome, Files, Commits) after the babysitter's own text.

## Defaults applied

- Generated phase sections are appended under the babysitter's file text, not instead of it (the file keeps "how to start, who to log in as").
- Commits come from evidence's leading sha (`<sha> on origin/<lane>` or join's bare sha), shown short (7).
- `headRefOid` is not copied onto lane docs: matching by head would send the final PR's later sightings to a lane.

## Forks for you

None.
