# Phase 1 recon — the shared record (whole phase)

Read directly (seam named in the phase entry; one pass was enough). Paths under `skills/spec/tools/`.

## Seam

- **Loop to lift:** `core/land-on-main.ts:23-49`. Pins the tip with `pinDefault` (`publish/snapshot.ts:22`),
  plans on `baseProject`, writes one blob, `commitOnto`, plain `push` (not a lease), retries on
  `NON_FAST_FORWARD` (`publish/publish.ts:18`), `ATTEMPTS = 2`. No timeout, no `GIT_TERMINAL_PROMPT`.
  Stays untouched this phase.
- **Lease push:** `claims/remote.ts:15-19` (`REMOTE_TIMEOUT_MS`, `NETWORK`), `:56-60` (`push`). The outcome
  parser `pushOutcome` + `PushOutcome` live in `claims/remote-payload.ts:17,47-53` and are imported by
  `tests/claims-remote-payload.test.ts:2` from there, so the move keeps a re-export.
  `REMOTE_TIMEOUT_MS` has no other user.
- **Absent vs unreachable:** `branchOnOrigin`, `claims/remote.ts:46-50` (`ls-remote --exit-code`, 2 = no match).
- **Port pattern:** `RemotePort` / `gitRemotePort`, `claims/remote-take.ts:7-34` (undefined without origin).
- **Scratch-index commit:** `publish/commit-onto.ts:9-23` always passes `-p base`; needs an optional base.
- **Local copy model:** `mainline/base-cache.ts:14-32` (scratch → rename), `moveIntoPlace` `:72-79` and
  `pruneBases` `:81-87` already exported; `git archive -o` + `Bun.Archive` (`:51-55`).
- **Atomic files:** `claims/atomic-file.ts` — `createExclusive`, `removeIfUnchanged`, `readIfPresent`,
  `errorCode`. The lock is a private `tryLock` (mkdir) per file; there is no store-wide lock.
- **Commands:** `spec.ts:37-62` registry `{ usage, run }`; session id from `ownSessionId(env)`
  (`sessions/own.ts`). Codex pilot: `runtime/workflow-capabilities.ts:18-36` refuses any command not
  listed, so `record` is refused with no change there; a test pins it.
- **Model for planWrites:** CRM `ops/src/academy-board/doc-writes.ts:35-117`: throws `BoardError`s,
  `mergePatch` with a `__delete__` marker, arrays replaced whole, `gitBlobSha` via sha1 of `blob <n>\0`.

## Reuse

| Need | Reuse |
|---|---|
| timeout + no prompt + no-verify lease push | `core/remote-push.ts` (moved) |
| commit with no parent | `commitOnto(git, base | undefined, …)` |
| tip folder by rename, keep two | `moveIntoPlace`, `pruneBases` from `mainline/base-cache.ts` |
| outbox entries | `createExclusive`, `removeIfUnchanged`, `readIfPresent` |
| test git | `repoWithOrigin`, `.clone`, `isolatedRunner` (`tests/git-repo.ts`) |
| race fixture | `tests/fixtures/remote-claim-pusher.ts` (spin to a start time, print the result kind) |
| fake port | `fakeOrigin()` in `tests/claims-remote-take.test.ts:13` |

## Testing issues

- No fixture builds an in-memory record; `tests/fake-record.ts` is new and carries the lease rules.
- Blob bytes must not go through `Runner` stdout for archives (`gotcha-runner-stdout-is-decoded-text`);
  JSON documents are UTF-8 text, so `git cat-file blob` through `git.out` is safe for them.
- The busy case (a ref lock held) is hard to provoke with real git; the fake's `busy` switch covers the loop,
  and the git port classifies `cannot lock ref` / `.lock': File exists` on stderr.
- `commands/phase.ts` (171) and `commands/claim.ts` (214) are not touched. All new files start small.
- `landOnRef` needs a pause between busy retries; inject it so tests don't sleep.
