# Phase 5a — remote claims: preflight

Inputs: `phases/phase-5a-remote-claims.md`, `research/phase-5a/2026-10-01-remote-claims-recon.md`, technical.md
→ *claims → Remote layer*, `principles.md`. Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **The local take-over breaks against the remote create-only lease.** Suppose `takeClaim` displaces a
   closed same-machine claim (`claims/store.ts:51-54`, `took-over`). That session's ref is still on origin,
   so the create-only push is refused, and the plan's "rollback on refusal" would undo a legitimate local
   take-over. Fix: when the push is refused and the remote payload's `sessionId` is the displaced claim's,
   push again with `--force-with-lease=<ref>:<that sha>`.
2. **`claimStatus` hides remote claims.** It marks any workspace outside the local worktree set `gone`
   (`claims/rules.ts:34`), and `claimsOnBoard` drops `gone` (`board/flight.ts:42-45`). Remote claims need
   their own status value (`remote`), set by the remote reader, never by `claimStatus`.
3. **The holder needs the user and host, but `Claim` has neither.** `holderName` (`claims/rules.ts:51-53`)
   is session-only. `FlightRow.holder` (`board/model.ts:33`) is a string, so put `user@host (sessionName)`
   into it for remote claims. The needs-you claim row (`model.ts:67`) has no age or reason, and its render
   copy is fixed to "closed session" (`board/render.ts:85`).
4. **The hostname is not a reliable identity for "this machine"** (the macOS hostname changes with the
   network). Identify the session's own remote claims by `sessionId` as well. Any remote claim whose
   `sessionId` matches a local claim file is a mirror, so skip it on the board.
5. **The board's existing fetch can't carry the claims refspec.** `pinDefault` (`publish/snapshot.ts:24-28`)
   is shared with `publish/publish.ts:38`, and its failure drives the header mode (`board/lanes.ts:150-155`).
   The claims fetch is its own call, using `--prune` (ledger `domain-github-claim-ref-leases.md`).

## Clean Code against the chunk

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions / one thing | Bites | Split `remote.ts` into a pure codec (`claims/remote-payload.ts`: encode/decode payload, parse a porcelain push line into `pushed \| refused \| offline`) and the git adapter (`claims/remote.ts`) |
| No flag arguments | Bites | `--take-over` becomes an `IsStale` (`() => true`), not a boolean threaded through `take` (ledger `decision-claims-landing-shape.md`) |
| Errors are values | Bites | Push outcomes are a union; offline is a value, not a throw. `git.run` (`core/git.ts`), never `git.out`, which drops stderr |
| Boundaries | Bites | The porcelain format is git's boundary: parse it in one place, with unit tests on canned lines from the probe table |
| Comments | Inert | |

## Clean Architecture against the chunk

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule | Bites | `board/` reads remote claims as `HeldClaim[]` from `board/load.ts`. `buildBoard` stays pure (`board/lanes.ts`) |
| Humble object | Bites | `remote.ts` stays thin over `Git`. Decisions such as rollback, re-lease and the taken-over message live in a testable `claims/remote-take.ts` with an injected remote port |
| Component cycles | Inert | `claims/` already imports nothing from `board/` except types (`claims/rules.ts:1-2`) |

## SOLID against the chunk

| Rule | Verdict | Consequence |
|---|---|---|
| SRP (actors) | Bites | `commands/claim.ts` (143 lines) would hold args, local take, remote push, rollback and release. Move remote orchestration into `claims/remote-take.ts`, and keep the command at parse + describe |
| OCP | Inert | |
| DIP | Bites | `ClaimDeps` gains `host: string` (injected `os.hostname()`). The user comes from `git var GIT_AUTHOR_IDENT`, so tests get `spec-tests` from env (`tests/git-repo.ts:7-14`) |
| ISP | Inert | |

## DDD

Skipped: tooling, no domain model beyond `Claim`.

## Guard blindness

The race test must spawn real processes pushing to one bare origin. An in-process `Promise.all` over
sync `git.run` serializes, so it can't fail. Mirror `tests/fixtures/claim-taker.ts`.

## Testing deltas from recon

- An existing `claim-command.test.ts` case for a closed-session take-over will hit Finding 1 the moment
  the push lands. It is the regression test for the re-lease.
- Offline test: `git remote set-url origin <missing path>` in a clone.

## Amendments

1. Add `remote` to `ClaimStatus` and `remote?: { user; host; sha }` to `HeldClaim`. `claimsOnBoard` keeps `remote`.
2. Add `takenFrom?: { sessionId; holder }` to `Claim` (local file and remote payload). A local take-over
   writes it too, so the old holder's `release` can say `taken over by …`.
3. Under `--take-over`, `take` skips the activity refusal (`takeRefusal`'s "in progress in <ws>",
   `claims/rules.ts:44-46`), because a stuck in-progress phase is exactly what the hatch is for. It
   still refuses unknown specs and phases.
4. The needs-you claim row gains `reason: "closed" | "remote-old"` and `claimedAt`. Render: `remote claim <age>
   old` / `→ ask <holder> or take it over`. This is additive, so `BOARD_VERSION` is unchanged.
5. Remote claims never enter `scanWorkspaces`' forceLive set (`board/load.ts:51`).

## Decisions for you

None. Amendment 3 is the one judgement call. The spec says the hatch works on "any claim … live
included", and a phase in progress elsewhere is the same situation without a claim file.
