# Phase 9 recon — sessions and work not on the remote

Paths under `skills/spec/tools/`. Written by the execute session, 2026-11-13.

## The seam

- **Document kinds.** `plan/kinds.ts:15-52` is the registry: a row is `{ path, read, identity }`; `validateRecordDoc`
  is handed to every write. A `sessions/<slug>.json` row goes here, its reader in `sessions/session-doc.ts`
  (mirrors `questions/question-doc.ts`, `cards/tag-doc.ts`). `SessionDoc` is in `technical.md:91-93`.
- **File name.** `runtime/identity.ts:7-9` `sessionKey(ref)` is a JSON string with runtime, source key and id.
  The path slug must be a legal record path (`record/plan-writes.ts:23`: letters, digits, `. _ -`): slug the key,
  keep it reversible enough to check `ref` against the path in `identity`.
- **Reading the ref.** `claims/document.ts:58-63` `sessionRef` is private; export it for the reader.
  `resolveIdentity` (`runtime/resolve-identity.ts:12`) needs configured sources. Production has **no Claude source
  key**: claims keep a bare `sessionId`, `commands/stored-runtime-context.ts` takes `legacySource` from its caller
  and only Codex's `runtime/codex/entry.ts:21` has one. Phase 9 defines one constant for Claude
  (`CLAUDE_CODE_SOURCE`) next to the stamp; the id (`CLAUDE_CODE_SESSION_ID`, `sessions/own.ts`) is what makes a
  file unique.
- **Where a command writes.** Two paths. Intent path: `plan/record-send.ts:50` `sendRecordIntent(world, command,
  args, plan)` (phase actions, spec fields, cards via `commands/card/send.ts:31`). Direct path: `writeRecord` in
  `commands/join.ts:68`, `commands/plan.ts:52`, `commands/card/add.ts:44`, `plan/upgrade-send.ts:24`,
  `commands/join-from-tree.ts:26`; the board's own `pr-sync` writes (`board/load.ts:121`, `plan/pr-sync-send.ts:23`)
  and `record sync` are not a session's command and stay unstamped (spec).
- **`RecordWorld`** (`plan/record-send.ts:13-27`) already carries `session`, `tree`, `now`, `git`. The stamp
  helper (`writeAs(world, plan)`) belongs beside it; it needs the branch, the host and the tree's changes.
- **The cap.** `record/plan-writes.ts:27,47-48`: 50 ops and no path twice. The stamp must not count and must merge
  into an op the plan already has for its path. Smallest store change: a generic `uncounted` marker on an op; the
  store learns nothing about sessions.
- **Tree facts.** `workspaces/changes.ts` today names spec docs only. `ahead` and `edited` are new there:
  `git rev-list --count HEAD --not --remotes` (commits on no remote ref, which also covers a branch never pushed)
  and `git status --porcelain -z --untracked-files=normal` with no glob pathspec
  (`ledger: gotcha-git-status-glob-pathspec-walks-untracked-dirs`, `gotcha-git-name-only-quotes-non-ascii-paths`).
- **Pack.** `commands/context.ts:98-110` `withBoardLines` adds record-derived lines for any spec; a
  "sessions on this spec" line goes there from the record view (`recordViewOf(plans.record)`).
- **Board.** `board/attribution.ts` guesses from claim → launch title → tree; `board/people.ts` `focusWork` buckets
  claims and PRs per person; `board/person-work.ts` `mySessions` is this machine only; `board/attention.ts:21-24`
  `needsYou` is one list of row builders, `board/card-rows.ts` and `record-rows.ts` are the pattern for rows that
  come from the record. `board/model.ts` is 230 lines (cap 250): new types go in a new file.
- **Claims join.** `claims/rules.ts` `HeldClaim` has `claim.sessionId` and, for remote, `holder {user, host}`;
  the join to a session document is `claim.sessionId === session.ref.id`.

## Reuse

- Stamp transport: the existing write loop; a stamp is one more op in the batch (no extra commit).
- Holder name/host: `claims/remote-payload.ts` `Holder`; `hostname()` as `commands/claim.ts:33`.
- Staleness: `core/age.ts` `olderThanDays`; no new age helper unless hours are needed (the "few hours" rule is
  hours, so one small `olderThanHours` beside it).
- Liveness this machine: `sessions/live.ts:64-78` stays; remote sessions print `remote <age>` as claims do.

## Testing-issue estimate

- `tests/fake-record.ts` `fakeRecord()` and `viewOf(docs)` exist; `tests/record-factories.ts` needs a `sessionDoc`.
- Real-git suites need `isolatedRunner` (`gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`).
- `model.ts` (230) and `context.ts` (145) are near or fine; no file crosses 250 if new types and rows go in new files.
- `commands/phase.ts` and the write helpers are already split; `record-send.ts` (62) takes the stamp with room.
- Pure: stamp op builder, doc reader, row builders. Impure: `treeWork` (git). Extract-first: none.
- Sub-agent race ("two sub-agents ticking at once both land"): last-write-wins `replace` on one path while the
  plan's own ops are different paths; the store's lease retry already covers it. A `Bun.spawn` racer exists in
  `tests/fixtures/record-writer.ts`.
