# Phase 5a — remote claims: recon

Chunk: deliverables 2–5 (`remote.ts`, take/release, `--take-over`, board). Probe (item 1) done, see
`ledger/domain-github-claim-ref-leases.md`. Paths under `skills/spec/tools/`.

## Seam

- **Git plumbing.** `core/git.ts:4-16`: `Git.run(args, {timeoutMs, env, stdin})` returns the raw
  `RunResult {code, stdout, stderr}` (`core/run.ts:1-16`). `Git.out` keeps only the first line of stderr, so
  push/fetch parsing goes through `run`. Only the sync `Runner` gets a `Git` (`gitAt`, `:9`).
- **Local claims.** `claims/store.ts`: `Claim` (`:10-18`), `takeClaim(dir, claim, isStale)` (`:40-58`),
  `releaseClaims` (`:60`). `isStale` is injected, so `--take-over` = `() => true` (ledger
  `decision-claims-landing-shape.md`).
- **Command.** `commands/claim.ts:34-41`: args parse (`take` refuses extra args today, `:38`); `take`
  (`:81-90`), `describeTake` (`:105-116`), `refusedBy` (`:118-121`), `release` (`:123-129`). Output contract:
  `claim:` / `claim refused:` prefixes.
- **Status.** `claims/rules.ts:30-36` `claimStatus`: a claim whose `workspace` is not a local worktree
  reads `gone` (`:34`), and `board/flight.ts:42-45` drops `gone`/`done`. Remote claims need a separate
  status path. Feeding them through `claimStatus` hides them.
- **Board load.** `board/load.ts:41-67`: `heldClaims(...)` at `:50`, the `--local` flag at `:44/:46/:49`. The
  existing fetch is `pinDefault` (`publish/snapshot.ts:24-28`), which `publish/publish.ts:38` also uses. Don't
  widen its refspec. Run the claims fetch as its own call, skipped under `local`.
- **Board render.** `flightRows` (`board/flight.ts:19-39`) sets `holder` and `target.workspace` from the claim.
  `flightCells` (`board/render.ts:49-51`) doesn't print `holder`. `closedClaims` (`board/attention.ts:30-35`)
  and needs-you `{kind:"claim", spec, phase, holder}` (`board/model.ts:67`) carry no reason or age. The fixed
  copy is `"claim by a closed session"` (`render.ts:85`). Age helper: `ago(then, now)` (`board/cells.ts:38-43`).
- **Packs.** `heldByOthers` (`claims/live.ts:19-28`) reads local claims only, through
  `commands/context.ts:29,55,70` and `context/packs.ts:38`. Phase 5a doesn't list packs in *Files to touch*,
  so remote claims stay out of packs. `claim take` is the guard.

## Reuse

- `tests/git-repo.ts:63-87` `repoWithOrigin` + `clone(name)`: a bare origin and a second clone, so we
  get two "machines" for free.
- `tests/fixtures/claim-taker.ts` + `claims-store.test.ts:113-141` race pattern (spawn, `startAt` spin,
  `Promise.all`). Mirror it with a `remote-claim-pusher.ts` fixture.
- `ago()` for the remote age. `holderName` for `sessionName`.
- `runAll`/async runner is not needed. The claims fetch is one sync call next to the existing sync
  `heldClaims`.

## Testing issues

- Test git identity comes from env (`GIT_AUTHOR_NAME=spec-tests`), and `git config user.name` returns
  nothing (`tests/git-repo.ts:7-14`). Read the holder via `git var GIT_AUTHOR_IDENT`, or inject the holder.
  Hostname must be injected: there's no `os.hostname()` in tools today. Add it to `ClaimDeps`.
- Offline: point `origin` at a missing path in a test clone, and git fails with no porcelain `!` line.
- Race test over real `git push` to a local bare repo: about 8 rounds × 4 spawns at ~50 ms per push, which
  is fine. In-flight notes mention a flaky claims race test under load. Keep the rounds low and use the
  same start-delay idiom.
- Sizes: `commands/claim.ts` is 143 lines. Adding take-over, remote push and the release-by-lease logic would
  push it past 250. Put the remote orchestration in `claims/remote-take.ts` (or similar), and keep the
  command thin.
