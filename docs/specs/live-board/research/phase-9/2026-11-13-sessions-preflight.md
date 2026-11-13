# Phase 9 preflight — session documents and the stamp (first chunk)

Scope: session-doc type/reader/path, `treeWork`, the stamp wrapper wired into the write path, the store's
uncounted ops. Input: `2026-11-13-sessions-recon.md`. House rules: `principles.md`. Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **The phase says "get the ref from `resolveIdentity`"; production has no Claude source to hand it.**
   `runtime/resolve-identity.ts:12-34` needs `sources`; only `runtime/codex/entry.ts:21` configures one, and
   claims keep a bare `sessionId` (`claims/store.ts`, `commands/claim.ts:51`). Define one `CLAUDE_CODE_SOURCE`
   constant in `sessions/` and build the ref from `ownSessionId(env)` with it; codex-runtime-support 2b can bind a
   real key later, and a file named by the old key just ages out (below).
2. **`sessionKey(ref)` is a JSON string (`runtime/identity.ts:7-9`), not a record path.** `record/plan-writes.ts:23`
   allows `[A-Za-z0-9._-]` only. The path is `sessions/<slug>.json` with `slug = encode(sessionKey)`; the kind row's
   `identity` check compares the slug of the carried `ref` with the path, so a doc can't sit at another session's
   name. The slug function is its own pure unit with a test (`:`, `"`, `[`, `,` all appear).
3. **"Does not count toward the 50-op cap" and "merges into an op the batch already has" are not expressible in
   `planWrites`** (`record/plan-writes.ts:47-48` counts every op and refuses a repeated path). Add to the plan result
   an optional `alongside: RecordOp[]`: ops outside the cap that yield to the plan's own op on the same path. The
   store learns nothing about sessions.
4. **`plan(view)` re-runs per tip, up to 5 times** (`record/write.ts:34-42`). A stamp that shells out to git for
   `ahead` / `edited` inside the plan would run `git status` on every retry. Compute the tree facts once, before the
   write, behind a memoized thunk on `RecordWorld` (`plan/record-send.ts:13-27`).
5. **`SessionDoc` (`technical.md:91-93`) has no `spec`.** The pack must list "other sessions on this spec with their
   mode", and a review or prep session holds no claim to join on. Add `spec?: string` (the spec it works on; set at
   registration, carried by stamps). It is not a copy of what the session holds: the phase stays on the claim.
6. **A stamp is a full `replace`, so the mode must come from somewhere.** Carry it from the existing document in
   the view; when there is none, `execute` (the only mode that writes without registering). Registration (a later
   unit) writes the real mode.
7. **Documents never go away.** One file per session forever grows the tree every `mirror.ts` extracts per tip
   (`record/mirror.ts`). The stamp adds `delete` ops (also `alongside`) for session docs whose `lastWriteAt` is more
   than 3 days old, at most 10 a write. Readers ignore a doc older than that anyway.

## Clean Code / architecture / SOLID / DDD (against this chunk)

| Rule | Verdict | Consequence |
|---|---|---|
| Names | Bites | `SessionDoc` already means two things here: `sessions/live.ts` `LiveSession` (ps) vs the record's. Name the new types `SessionDoc` / `stampSession`; never reuse `LiveSession`; `ahead`/`edited` as in the spec |
| Functions small | Bites | `session-doc.ts` reader split: ref reader, mode reader, counts; each under 50 lines |
| SRP / actors | Bites | Store (`record/`) gets `alongside` only; the stamp builder lives in `sessions/stamp.ts`; tree git facts in `workspaces/changes.ts` (`treeWork`); the world assembly stays in `plan/record-send.ts` |
| Dependency rule | Bites | `record/` must not import `sessions/`; `sessions/stamp.ts` imports `record/plan-writes` types, `core/git`; `plan/kinds.ts` imports the reader (as it does `questions/`) |
| DIP | Bites | `treeWork(git)` takes `Git` (as `workspaces/*` do); the stamp takes facts as data, so it is pure and tested in memory |
| Pure vs I/O | Bites | Pure: slug, reader, `stampOps(view, facts, now)`. Impure: `treeWork`, hostname, branch. Tested apart |
| Explicit deps | Bites | `now`, host, user come in through the facts; no `new Date()` in the builder |
| Errors are values | Bites | `treeWork` returns `Result`; a failing git leaves `ahead`/`edited` off the doc rather than failing a tick |
| Guard blindness | Inert | No architecture test pins `record/` imports; none is cited |
| Single source of truth | Bites | The doc carries who/where/mode/plan version, never what is held (claim); the board joins by `claim.sessionId === ref.id` |
| DDD | Skipped | Not a domain-model change |

## Seam and testability

- Caps: `model.ts` 230 lines, `kinds.ts` 100, `record-send.ts` 62, `plan-writes.ts` 73, `changes.ts` 56: all fit this chunk. New board types in later units go in a new file.
- TDD: pure units first (slug, reader, `stampOps`, `planWrites` with `alongside`). `treeWork` needs real git (`isolatedRunner`). Wiring tested through `sendRecordIntent` with `fakeRecord()`.
- Fixtures missing: `sessionDoc` factory in `tests/record-factories.ts`.

## Amendments

1. `sessions/session-doc.ts`: `SessionDoc` = `technical.md` shape + `spec?`; `CLAUDE_CODE_SOURCE`; `sessionDocPath(ref)`; `readSessionDoc`; registered in `plan/kinds.ts`. Update `technical.md` for `spec` and the source constant.
2. `record/write.ts` + `record/plan-writes.ts`: `alongside` on a plan's result, outside the cap, yielding to same-path ops.
3. `workspaces/changes.ts`: `treeWork(git): Result<{ ahead; edited }>`, literal `-z` status, `rev-list --count HEAD --not --remotes`.
4. `sessions/stamp.ts`: `stampOps(view, facts, now)`: replace (no `ifVersion`) carrying mode/spec from the existing doc, plus deletes of docs idle > 3 days (≤ 10).
5. `plan/record-send.ts`: `RecordWorld.stamp` memoized thunk; `sendRecordIntent` wraps the plan so its ops return with `alongside`. Direct writers (`join`, `plan apply`, `card add`) get the same wrapper in a follow-up unit; the board's own `pr-sync` and `record sync` stay unstamped.
6. Layout unchanged: an older plugin never writes the new path, and `RECORD_LAYOUT` rises only for C/D/E.

## Defaults applied

- Claude's source key is the constant `claude-code`; one key for every Claude session (the id makes the file unique).
- A stamp happens only when a plan returns ops: a no-op tick leaves no heartbeat.
- Stale session docs (> 3 days idle) are deleted by whichever write comes next, ≤ 10 per write.
- Upgrade-on-touch and `join --from-tree` writes are not stamped (the command's own write carries the session).
- No stamp when the session id is unknown (tests, Codex today).

## Forks for you

None.
