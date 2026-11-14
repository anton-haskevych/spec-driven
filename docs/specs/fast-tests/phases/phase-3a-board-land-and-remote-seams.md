---
needs: [3]
pr: A
---

# Phase 3a — Board, land and remote seams

**Goal:** the board loader, the land helpers and the claims remote take their git through `GitSeams`, so claim,
board, page, trees-place, owner, ship, focus, deployed and merge can run on fakes.

**Outcome:** nothing changes for anyone using the plugin; claim, board and land commands can now run on fakes · a day · medium risk: changes the signatures of the land helpers and the board loader, guarded by the existing real-git tests

**Files to touch:**
- `skills/spec/tools/core/git-seams.ts`, `board/load.ts`, `mainline/load.ts`, `claims/held.ts`, `commands/claim.ts`, `commands/claim-push.ts`
- `skills/spec/tools/core/land-spec-field.ts`, `phases/deployed-land.ts`, `commands/phase/deployed.ts`, `focus/land.ts`, `plan/land-banner.ts`, `pr/actions/merge.ts`, `commands/owner.ts`, `ship.ts`, `spec-status.ts`, `focus.ts`, `join-tidy.ts`
- `skills/spec/tools/plan/board-base.ts` callers: `commands/plan.ts`, `session.ts`, `join.ts`, `card/land.ts`
- `skills/spec/tools/tests/command-deps.ts` (fake `land`), `land-contract.ts` (new, not collected), `land-on-main.git.test.ts`

## Implementation guidance

`technical.md` §4 *Board, land and remote* and phase 3's trace. `seams` goes on `BoardRunners`, so board, claim,
page, trees-place and crew-tick all get it; the land helpers take a deps object instead of a bare `runner`/`git`.
Same safety net as phase 3: existing real-git tests unchanged and green, per commit `test:fast` plus the covering
`.git` files, full `bun test` at the end.

The fake `land` keeps `main` apart from the tree: the bug `landOnMain` exists to prevent is a checkout that differs
from main, so a fake that lands into the tree would hide it. The land contract runs on `landOnMain` (one
`beforeAll` repo) and on the fake.

## Deliverables

- [ ] `seams` on `BoardRunners`: `mainline` (default `loadMainline`) and `remote` (default `gitRemotePort`) read in `loadBoardInputs`/`syncedPrDocs`; `remoteHeldClaims` takes a `RemotePort`; claim's `pushAfterTake`/`readHolder` per the trace
- [ ] `land` seam on `FieldWriteDeps`, `MergeDeps`, `JoinDeps`, `PhaseDeps`; `landSpecField`/`deployedOnMain`/`landFocus`/`landBanner` take a deps object; `phase/deployed.ts:15` passes the context runner
- [ ] Fake `land` (a `main` file map apart from the tree, the full `MainLanding` union) + a land contract (landed, unchanged, refused, offline) run on `landOnMain` and the fake
- [ ] `boardBase` seam where plan, session, join and card/land call it; one land test and one claim test running with no real git

## Phase-local notes

- From phase 3: `tests/command-deps.ts` has `fakeCheckout()` (`gitStub` + fake record seams) and phase/join/record/field-write builders. `claimDeps()` and the fake `land` come here, once `mainline`, `remote` and `land` exist.
