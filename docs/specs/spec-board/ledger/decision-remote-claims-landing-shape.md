---
kind: decision
applies-to: [phase 6]
created: 2026-10-01T17:13:08-07:00
---

# Remote claims: how 5a landed, for loop wiring to build on

- **Files.** `claims/remote-payload.ts` (pure: ref name, payload codec, porcelain → pushed/refused/offline,
  `remoteHolderName`), `claims/remote.ts` (git adapter), `claims/remote-take.ts` (`mirrorTake`/`mirrorRelease`
  over a `RemotePort`; `gitRemotePort` is undefined without an origin, which means local only and silent).
- **Order.** take = local claim, then push. Refused → roll back local. Offline → keep local + the
  `claim: origin unreachable; claimed locally only` line. A local take-over of a closed session re-leases
  that session's ref (otherwise the rollback would undo it).
- **Take-over.** `claim take … --take-over`: `isStale = () => true` locally and `replaceable = () => true` remotely.
  It also skips the "in progress in <worktree>" refusal; a missing phase still refuses. Claims carry
  `takenFrom: <old sessionId>`, and release reports `phase <id> was taken over by … ; your work is on <branch>`.
- **Board.** Remote claims are `HeldClaim { status: "remote", holder }`. Mirrors are dropped by sessionId, not
  hostname. Session cell: `{ status: "remote", since }`. Needs-you row: `{ kind: "remote-claim", holder, since }`
  after 3 days. Additive, so BOARD_VERSION stays 1.
- **Packs don't see remote claims.** `heldByOthers` reads local files only, so a pack may pick a phase another
  machine holds. `claim take` refuses it, and execute re-picks (execute.md §1). If phase 6's "start 1 and 2"
  launches from the board, read `board --json` in-flight rows (which include remote holders), not the packs.
