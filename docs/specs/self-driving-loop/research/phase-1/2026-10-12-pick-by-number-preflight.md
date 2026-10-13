# Phase 1 preflight — pick by number (2026-10-12)

Inputs: phase entry, technical.md → Phase 1, the recon note beside this one, principles.md.

## Findings that change the plan

1. **"The base archive must carry `reviews/`" would extract every review file.** `mainline/base-cache.ts:6` READ_SET drives a `git archive` per new main sha (:45-48); reviews run 5–30 KB each, and CRM has hundreds of specs, so every main move would re-extract megabytes the board never reads. Only the folder's existence matters. `extractReadSet` already lists every path with `git ls-tree` (:40): create an empty `reviews/` directory for each spec that has one instead.
2. **The cache key is the sha alone** (`base-cache.ts:12-16`): a cache built before the change answers "no reviews anywhere" for the same sha, which would turn every spec with phases and no ticks into a review row until main moves. The key needs a layout suffix.
3. **"Nothing ticked" read from base alone misfires on work in flight.** Base ticks lag worktrees; a spec whose phase 1 is claimed or ticked only in a worktree (`placement.inFlight`, `lanes.ts:84`) must keep its phase rows. Likewise a review committed only on a branch (`workspaces/views.ts:13-15` loads from disk) counts as reviewed.
4. **The reviewed flag must not be required on `SpecState`.** `specStateFrom` (`core/spec-state.ts:42`) has no directory listing, and a dozen test builders construct `SpecState` literally (`board-factories.ts:38`, `claims-rules.test.ts:17`, …). Optional, set only by `loadSpecState`; absent means reviewed.
5. **`OFFER_TOP_READY` / execute :22 assume an execute row** (`context.ts:30`: "`<spec> <phase> — <title>`"). The top row can now be prep/create/review with no phase: "apply it" means run that row's sub-command for that spec in this session.

Also seen, outside this phase: the base cache can hold an empty `<sha>` directory (hit on 2026-10-12: `claim take` refused "no spec named self-driving-loop" until the dir was removed). A hit is trusted on `existsSync` alone (:13). Cheap guard in the same file: an empty dir is a miss.

## Clean Code against the board change

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Small functions, one thing | Bites | review-row decision is its own predicate (`awaitsReview`) beside `specLanes`, not inline in `phaseLanes` |
| No flag arguments | Bites | `stageLanes(node, step, placement)` takes the step, no boolean |
| Names | Bites | `reviewed` on state, `title` on rows; `NextStep` "review" matches the sub-command |
| Comments | Inert | — |
| Errors as values | Inert | no new failure paths |

## Clean Architecture / SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | disk check (`existsSync`) stays in `loadSpecState` / `loadNode`; lanes stay pure over inputs |
| OCP | Bites | `NEXT_COMMAND` Record forces the render entry; no other switch on `NextStep` |
| ISP | Inert | — |
| DIP | Inert | — |

Pass D (DDD) skipped: tooling, no domain model.

## Seam and testability (deltas from recon)

- No delta on size caps; `lanes.ts` 173 → ~195.
- `base-cache.ts` change is testable through `baseCache` with `repoWithOrigin`; `mainline-base-cache.test.ts` exists.

## Amendments

1. Reviews reach the base cache as empty `reviews/` dirs made from the `ls-tree` listing, not as archived files.
2. Cache dir = `<sha>.<layout>`; an empty cache dir counts as a miss.
3. A spec awaits review when it has phases, `reviewed === false` in base and in every worktree view that holds it, no phase done, and nothing in flight for it.
4. `SpecState.reviewed?: boolean`, set by `loadSpecState` only.
5. execute :22 / `OFFER_TOP_READY`: apply the top row by running its `next` sub-command for its spec (and phase for execute), and say so.

## Decisions for you

None. Defaults applied (listed for the handoff's *Say if wrong*): marker dirs instead of review files; review rows share stage rows' blockers and target; the crew keeps launching only execute rows (`oversee-crew.md:75-76`).
