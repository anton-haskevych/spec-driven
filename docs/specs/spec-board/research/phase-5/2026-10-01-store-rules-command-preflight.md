# Phase 5 preflight — store, claimStatus, claim command (items 1–3)

Inputs: `phases/phase-5-phase-claims.md`, `research/phase-5/2026-10-01-store-rules-command-recon.md`,
`skills/spec/principles.md`. Paths relative to `skills/spec/tools/`.

## Findings that change the plan

1. **"gone" can't come from the board's workspaces.** `BoardInputs.workspaces` holds only live views with
   spec changes (`board/load.ts:47-49`, `workspaces/scan.ts:22`). A merged-but-present worktree would read
   `gone`, and its claim would be taken over. `gone` must test the full `loadWorkspaces(git)` list
   (`workspaces/list.ts:17`).
2. **Phase ids exist on the branch before base.** `technical.md` step 1 says "on base, or in the caller's own
   workspace view". The own view is `inputs.workspaces.find(w => w.path === inputs.currentPath)`
   (`board/load.ts:56`, already realpath'd by `checkoutRoot` `:86-90`). This spec's own 5a is the live case.
3. **Pruning done/gone claims races a takeover.** If you read the status and then unlink, the unlink can delete a claim that another
   session took over in between. That breaks `principle-claim-writes-are-single-atomic-ops.md`. The fix: rename the
   judged file to `.prune-<callerSessionId>`, compare its bytes with what was judged, unlink on a match,
   otherwise `link` it back (EEXIST → a newer claim exists; leave it).
4. **`canonicalPath` third copy.** `workspaces/list.ts:24` (private), `sessions/live.ts:85` `resolved`,
   `board/load.ts:89` inline. The claim command needs it for `workspace`. Export it from
   `workspaces/list.ts` and use it in the claim command (principle 9). The other two copies are out of scope.
5. **No sessions in local inputs.** `loadBoardInputs(…, { local: true })` sets `sessions: "local"`
   (`board/load.ts:62`). The command loads `loadLiveSessions(claudeHome, psProcStarts(runner))` itself. A
   failed load → `unknown` → nothing stale.

## Clean Code against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Small functions, one thing | Bites | `takeClaim` = create, or read + idempotent check + stale takeover. Keep `createClaim` and `takeOver` as their own functions |
| No flag arguments | Bites | `isStale` is a predicate argument (per plan), not a boolean |
| Errors as values | Bites | Store returns a `TakeOutcome` union (`taken` / `already-yours` / `took-over` / `held`); no throws for EEXIST/ENOENT |
| Names | Bites | `Claim`, `ClaimStatus`, `claimStatus`, `takeClaim`; the command's refusal copy comes from `technical.md` |
| Tests F.I.R.S.T | Bites | Race tests spawn processes. They are kept few (2) and run on temp dirs |

## Clean Architecture against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | `claims/rules.ts` imports types only (`LiveSession`, `Result`); `claims/store.ts` is fs only, no session logic; `commands/claim.ts` composes |
| Humble object | Bites | The command is the only IO composer (`loadBoardInputs`, `loadWorkspaces`, `loadLiveSessions`, env) |
| No cycles | Bites | `board/inputs.ts` will import `Claim` from `claims/store.ts` in the board chunk; store must not import from `board/` |

## SOLID against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | Refusal rules (phase not in spec, wip elsewhere) live in `rules.ts` as pure `takeRefusal`, not in the command |
| OCP / LSP / ISP | Inert | — |
| DIP | Bites | Command takes `ClaimDeps` (`BoardRunners` + `env` + `now`), mirroring `BoardDeps` (`commands/board.ts:10-16`) and `launchReport`'s env (`commands/launch.ts:7`) |

## DDD

Skipped. These are tool internals with no domain model beyond the claim value.

## Seam and testability (deltas from recon)

- Put the race script in `tests/fixtures/claim-taker.ts`. `bunfig.toml` ignores `**/fixtures/**` for test
  discovery, and typecheck still covers the file.
- `claimedAt`: `now.toISOString()`. No TS helper exists for local-offset ISO, and nothing parses the offset.

## Amendments

1. `claimStatus(claim, { sessions: Result<LiveSession[]>, worktrees: ReadonlySet<string>, doneOnBase })`.
   `worktrees` is every `loadWorkspaces` path.
2. `takeRefusal(spec, phase, { baseState?, ownState?, activity, currentPath })` → string | undefined, pure,
   in `rules.ts`.
3. Store: `pruneClaims(dir, callerSessionId, removable)` uses rename → verify bytes → unlink/restore.
   `.stale-*` files are always removed.
4. Export `canonicalPath`; the command uses it on `currentPath` and the claim's `workspace`.
5. Command loads sessions itself; `unknown` liveness ⇒ `isStale` false for every claim.

## Decisions for you

None.
