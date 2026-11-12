# Phase 1 preflight — the shared record

Inputs: `phases/phase-1-shared-record.md`, `research/phase-1/2026-11-11-land-on-ref-recon.md`, `principles.md`.
Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **The lease outcome parser is not in `claims/remote.ts`.** `pushOutcome` and `PushOutcome` live in
   `claims/remote-payload.ts:17,47-53`. `core/remote-push.ts` can't import `claims/`, so they move too, and
   `remote-payload.ts` re-exports them: `tests/claims-remote-payload.test.ts:2` imports them from there and must
   stay unchanged.
2. **There is no "claims store lock".** Claims lock per file with a private `tryLock` (mkdir,
   `claims/atomic-file.ts:38-46`) inside `removeIfUnchanged`. The outbox flush gets its own mkdir lock
   (`outbox.lock`) through a `withLock` exported from `atomic-file.ts`, the same mechanism.
3. **`landOnRef` can't take a `Git`.** `landOnMain` (`core/land-on-main.ts:31-49`) talks to git directly, so the
   loop is only testable with real git. The record's loop must run on `tests/fake-record.ts`, so `landOnRef`
   takes a port `{ fetchTip, commit, push }` and computes the lease from the tip it fetched. `RecordPort`
   extends that port with `versions(tip)` and `read(tip, path)`. A branch port for `landOnMain` (phase 6) is
   the same three calls over `pinDefault` / `commitOnto` / lease push.
4. **`RecordWrite` has no "does not exist" case.** An update or delete of a missing document is `invalid`
   (`<path> does not exist`); with `ifVersion` it is `conflict` with no current document (someone deleted it).
   `conflict.current` / `currentVersion` become optional.
5. **Offline is not `queued` at the store's level.** `writeRecord` runs a closure, which can't be queued.
   It returns `offline`; the outbox layer (`sendIntent`) turns that into `queued` after storing the intent.

## Clean Code against phase 1

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions, one thing | Bites | `landOnRef` attempt = fetch / plan / commit / push, one function each, as `landAttempt` is |
| Errors are values | Bites | every port call returns `Result` or a tagged outcome; `planWrites` returns kinds, never throws (Academy throws `BoardError`, `doc-writes.ts:20-28`; not copied) |
| No flag arguments | Bites | lease is a `Tip` value (`absent` / `at sha`), not `expected: string` with "" meaning absent |
| Comments | Bites | WHY only: lease on empty tree, `-o` for archive |
| Boundaries | Inert | no third-party code |

## Clean Architecture against phase 1

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule | Bites | `core/` never imports `record/`; `record/` imports `core/` and `claims/atomic-file.ts`, no reader |
| Humble object | Bites | `gitRecordPort` is the only git-speaking unit; `planWrites`, `landOnRef`, outbox flush are tested on the fake |
| ADP | Bites | `claims/remote.ts` → `core/remote-push.ts`, never back |

## SOLID against phase 1

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | store (`write.ts`) vs intents (`outbox.ts`) vs local copy (`mirror.ts`) are three actors |
| OCP | Bites | next variant: phase 2's document kinds arrive as a `validate` and intent runners, no edit to `record/` |
| DIP | Bites | `writeRecord` depends on `RecordPort`, the command wires `gitRecordPort` |
| LSP, ISP | Inert | |

## DDD

Skipped: infrastructure, no domain model in this phase (document kinds start in phase 2).

## Guards

Claims suites are the guard for the move; they import from `claims/remote*.ts` only, so they observe it.

## Testability (deltas from recon)

- `writeRecord` busy retries need an injected pause; real git busy is covered by stderr classification only.
- The race fixture must spawn processes, as `tests/fixtures/remote-claim-pusher.ts`; `bunfig.toml` ignores
  `**/fixtures/**`, so the racer won't be run as a test.

## Amendments

1. Move `pushOutcome`/`PushOutcome` with `push` and `NETWORK` into `core/remote-push.ts`; re-export from
   `claims/remote-payload.ts`.
2. `landOnRef(port, plan, options)`; `port: RefPort = { fetchTip(): TipRead; commit(base: Tip, changes, message):
   Result<string>; push(commit, lease: Tip): PushOutcome }`; up to 5 attempts; busy pauses `options.pause`.
3. `writeRecord(port, plan, { validate })`; returns `RecordWrite | offline`.
4. `planWrites`: missing document → `invalid` (or `conflict` without current when `ifVersion` given).
5. Outbox lock = `withLock(<outbox>.lock)` exported from `claims/atomic-file.ts`.

## Defaults applied

- Patches are RFC 7386 JSON merge patch (`null` removes a field; arrays replaced whole), not the Academy
  `__delete__` marker.
- Documents serialise as `JSON.stringify(doc, null, 2) + "\n"`; version = sha1 of `blob <len>\0<bytes>`.
- `meta.json` is reserved: ops can't touch it; the store writes it with the first commit and refuses every
  write when its `layout` is above `RECORD_LAYOUT`.
- `replace` of a missing document creates it (no `ifVersion`).
- Fetch first, `ls-remote --exit-code` only after a failed fetch, so a write costs one round trip.
- The local copy's age is the folder's mtime, touched on every fetch that confirms its tip.

## Forks for you

None.
