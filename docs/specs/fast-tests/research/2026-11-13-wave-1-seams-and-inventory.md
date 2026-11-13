---
date: 2026-11-13
wave: 1
lens: implementation
slug: seams-and-inventory
brief: product-brief.md
---

# Recon Wave 1 — seams and inventory

*Source of record — do not edit. Distilled into the spec by `/spec create`.*
Four Explore agents: the seam, the 74-file classification (two halves), guards/tiers/parallel.
Paths relative to `skills/spec/tools/` unless they start with `docs/` or `skills/`.

## Verified

### The seam is wider than the record write port
- `gitRecordPort(git)` is built inline at 11 sites in 9 files: `commands/plan.ts:40`, `commands/session.ts:43,59`,
  `commands/join.ts:61`, `commands/join-from-tree.ts:15`, `commands/record-export.ts:32`, `commands/record.ts:58`,
  `commands/card/land.ts:24`, `board/load.ts:134` (writes the record during a board load), `plan/record-send.ts:37`,
  `record/read.ts:57` (read side).
- `spec.ts:84 run(argv, projectDir, deps: CommandDeps)`; `CommandDeps` (`spec.ts:40`) = context + workflow only.
  Each command defaults its own deps: `systemJoinDeps` (`commands/join.ts:50`), `systemRecordDeps`
  (`commands/record.ts:33`), phase context (`commands/phase/context.ts:21`), `systemBoardDeps` (`commands/board.ts:33`),
  `page/serve.ts:25`. No single place threads a port from the CLI; tests already call command functions with deps
  (`tests/join-command.test.ts:27`).
- `PhaseDeps` (`plan/phase-writer.ts:46-51`) = runner, env, now, memory?. `RecordWorld.port?` (`plan/record-send.ts:16-29`)
  exists but `recordWorld()` (`:33-51`) always fills it; 6 callers (`page/serve.ts:47`, `commands/spec-field-write.ts:32`,
  `plan/write-notice.ts:21,22,24`, `plan/pr-sync-send.ts:20`, `commands/card/send.ts:31`). No test builds a RecordWorld.
  `recordWorld` also runs git for default branch, common dir (outbox), tree folder, `sessionFactsOf`, `intentRunners(git)`.
- **Read side:** `plan/read-plans.ts:34 readPlans(git, …)` builds `gitRecordReadPort` inside; reached from ~20 sites
  (`commands/list.ts:35,40`, `commands/spec-field-write.ts:28`, `commands/card/send.ts:22`, `commands/question.ts:36`,
  `commands/phase/context.ts:26`, `commands/doctor.ts:29`, `mainline/load.ts:49`, `plan/write-notice.ts:28`,
  `hooks/plan-changed.ts:50`, `commands/join-tidy.ts:33`, …). Faking only writes leaves reads on real git.
- **Git around the write, all runner-only:** `boardBase` (`plan/board-base.ts:13`: fetch + `git archive` base cache +
  settings read from disk) runs before writes in plan, session, join, card/land; `pinDefault` (`publish/snapshot.ts:23-27`);
  base cache (`mainline/base-cache.ts:16-60`, needs a real dir); `landOnMain` (`core/land-on-main.ts:25`, its
  `branchPort` `:34-47` is a non-exported RefPort; callers `phases/deployed-land.ts:17`, `commands/join-tidy.ts:42`,
  `pr/actions/merge.ts:84`, `core/land-spec-field.ts:29`, `focus/land.ts:16`, `plan/land-banner.ts:10`); claims
  `RemotePort` (`claims/remote-take.ts:7-13`) built inline at `:26`, `claims/held.ts:29` fetches directly;
  `stateDir(gitAt)`/`claimsDir` built inline in `crew/deps.ts`, `commands/pr/log.ts`, claims.
- All process spawns go through `core/run.ts:42,59` (Runner). Existing runner fakes: `tests/stub-runner.ts`
  (`stubRunner`, `sequencedRunner`, `routeGh`, `asyncStubRunner`, `cannedGh`), used by 34 files; `pr-status-command`
  stubs git argv over a `createTree` dir with no repo at all. Stub runners return code 1 on unknown argv (silent fallback risk).

### The fakes
- `RefPort` (`core/land-on-ref.ts:17-21`) fetchTip/commit/push; `RecordPort` (`record/ref.ts:12-16`) adds
  blobIdsByPath/readBlob/readBlobs. `tests/fake-ref.ts:10-66` (commits, tip, offline flag, busyFetches counter,
  racerBeforeNextPush, filesAt, landFromAnotherMachine); `tests/fake-record.ts:17-35` (blob ids are real git sha1 via
  `record/document.ts:16`; exports viewOf/viewOfTexts).
- Gaps vs real: no `failed` fetch (`record/ref.ts:57-58`); no "no origin" (`ref.ts:23` returns undefined); no tracking-ref
  side effects (`ref.ts:29,54`; read by `record/read.ts:72`, `commands/record.ts:52`, `plan/write-notice.ts:11-12,28`);
  no read-port surface (`trackingTip`, `lastFetched`, `markFetched`, `record/read.ts:9-14`; `tests/record-read.test.ts:20-38`
  builds one inline); shas `c1,c2` not hex; `readBlobs` drops missing ids where real throws (`ref.ts:112`); busy is a
  counter, offline a flag with no timeout distinction (`ref.ts:50`); `commit` accepts paths update-index rejects; no byte framing.
- Users: `fakeRef()` 1 file (`land-on-ref`); `fakeRecord()` called in 5 files; `viewOf` imported by ~35.
- Real side of the record contract already exists: `tests/record-ref.test.ts:13-94` (no origin, one-call blob batch,
  absent, create-only refusal, lease with deletes, offline, busy via `.lock`, ref not a branch). Fake side partly in
  `tests/land-on-ref.test.ts:18-63`. Claims: inline `fakeOrigin` in `tests/claims-remote-take.test.ts:13`, real in
  `claims-remote.test.ts`. No contract suite runs the same cases on both.

### `tests/git-repo.ts` costs
`repoWithOrigin` ≈7 git processes; `.clone()` 1; `.addWorktree()` 1; `commitAll` 2. `tests/joined-repo.ts joinedRepo()`
≈15+. The bigger cost: commands under test fetch/push to the `file://` origin on every call (upload-pack/receive-pack).
`anonymousRunner` (`:26-35`) mutates `process.env`.

### Classification of the 74 files
Verdicts: KEEP-REAL (adapter), SMOKE-ONLY (one real test, rest moved), MOVE-TO-FAKE, SHARE-REPO (keep real, one repo per file).

| Verdict | Files |
|---|---|
| KEEP-REAL | land-on-main (trim retry tests: dup land-on-ref), claims-remote, commit-onto, git, gitattributes, infer-spec, mainline-base-cache, mainline-load, mainline-record, publish, record-race, record-read, record-ref, push, snapshot, tree-work, trees-acquire, trees-setup, trees-uncommitted, workspaces-scan, runtime-legacy-readers (frozen 2.51.0 code, no seams possible), board-inputs |
| SMOKE-ONLY | claim-command (49.6 s), card-command, join-command, join-tidy, focus-land, board-command, codex-packaged-entry, crew-check, deployed-land, owner-command, plan-command, record-tick (+ fold record-tick-offline), record-export, record-command, session-facts, ship-command, publish-commands, pr-merge, pr-open, trees-command, trees-prune |
| MOVE-TO-FAKE | codex-entry (2 repos per test, several tests assert refusal before git), board-joined-golden, card-load-command, claims-live, context-stored-runtime, crew-launch, crew-overseer-command, crew-tick (git only for stateDir), plan-changed-writes, record-plan-changes, question-command, spec-field-commands, record-upgrade, record-newer-layout, session-command, session-stamp-command, pr-wait, pr-status-command (1 joined test), workflow-capabilities, trees-place-joined, trees-place-owner |
| SHARE-REPO | board-local-work, pilot-workspace, pr-log (6 repos), record-mirror (3 tests need plain folders only), record-readers (already) |
| Already right | claims-store, focus-command, page-process (move repo build out of describe-collection into beforeAll), plan-changed-hook |

Every MOVE/SMOKE file's logic is already covered by a pure sibling (e.g. claims-rules/claims-remote-take/board-claims for
claim-command; card-plans/card-load for card-command; plan-join/plan-join-from-tree for join-command; plan-tidy for
join-tidy; question-plans for question-command; plan-ops-* for record-plan-changes; crew-tick-step for crew-tick;
pr-wait-step for pr-wait). Blockers by kind: (a) inline `gitRecordPort` + `readPlans` (record commands), (b) inline
`landOnMain(gitAt)` (focus, owner, deployed, ship, join banner), (c) inline `gitRemotePort` + board load (claim),
(d) inline `stateDir`/`claimsDir` from git (crew-*, pr-log, claims-live), (e) CLI subprocesses (join race, codex-packaged-entry).

### Guards, tiers, gates
- No allowlist/ratchet guard exists. Exemplars: `tests/skill-wiring.test.ts:13-14,38-42,109-110` (scan source,
  exact-list `toEqual`); `tests/commands-table.test.ts:30` (names the offending file); `tests/guards.test.ts:35,54`
  (message style).
- 74 files import `./git-repo`; helpers `joined-repo.ts:6` and `crew-deps.ts` import it too; 11 import only
  `isolatedRunner`/types (`record-tick.test.ts:3` is `import type` only). Real git without `./git-repo`: `run.test.ts`,
  `infer-spec.test.ts:34,87` via `systemRunner`. 24 files build repos in `beforeEach` (regex finds 23; misses
  `codex-packaged-entry.test.ts:17-28` nested braces). A regex also misses helper calls (`joinedRepo(`, local setup fns).
- No gates exist in this repo: `docs/specs/_playbook/settings.md` has only `pr:`; no `gates.md`. Gate keys allowed:
  `after-merge-main`, `bootstrap`, `per-commit`, `ci-triage` (`playbook/settings.ts:64,97-102`); pre-PR checks are
  `gate: <name>` lines in each spec's `pr-opening.md` (`playbook/gates.ts:6,18-23`). Doctor errors if settings names a
  missing gate (`doctor/settings.ts:48-52`). Per-commit with no setting = "tests your change affects"
  (`skills/spec/execute.md:132`); pre-PR `:173`; fresh tree `:69`; after merge `:199`.
- Commands: `package.json` `"test": "bun test"`; CI `.github/workflows/plugin-metadata.yml:20-25` runs `bun test` +
  typecheck on bun 1.4.4. No hook runs tests.
- Bun 1.4.4: `--path-ignore-patterns` overrides bunfig's list (repeat `**/fixtures/**`); positional filters are
  substring-include only; `*.git.test.ts` still matches `*.test.ts`, so plain `bun test` runs all; `--changed`, `--timings`.

### Parallel
- `--parallel=N` (default CPU count, 10) implies `--isolate`; `BUN_TEST_WORKER_ID`; no bunfig key. No chdir, mocks,
  fixed ports, fixed tmp paths. Timing-sensitive: `run.test.ts:17-19,42-44`, `plan-changed-hook.test.ts:109-116`,
  `claims-remote.test.ts:84` (800 ms barrier), `record-race`, `claims-store` races, `codex-packaged-entry` (at its 5 s
  limit, lesson `gotcha-codex-packaged-entry-test-runs-near-its-timeout`). `codex-entry.test.ts:18,36` and
  `codex-packaged-entry.test.ts:22` hash/copy `skills/`: nothing may be written under `skills/` during a run.
  `--isolate` may make the ~224 small files slower than serial. Not measured (Anton: the live-board timings suffice).

### Lesson recall
`hooks/lesson-recall.ts:15-30`: Write/Edit outside `docs/specs/`, ≤3 lessons per edit, once per session, ordered by
`seen-in` count then filename (`lessons/recall.ts`). **A lesson with `enforced-by` is never shown** (`lessons/recall.ts:14`).
8 lessons already match `skills/spec/tools/tests/x.test.ts`, all with one `seen-in`; a new one-`seen-in` lesson would
sort behind them. Guidance today: `skills/spec/principles.md:72-76` (§13), `:90-92` (§17), `execute.md:114-143`.

## Reuse
- `fakeRecord`/`fakeRef` (already fit both write and read shapes), the inline read-port adapter in
  `record-read.test.ts:20-38`, inline `fakeOrigin` in `claims-remote-take.test.ts:13`.
- `record-ref.test.ts` as the real half of a record contract; `land-on-ref.test.ts` as the fake half.
- `stub-runner.ts` and the pr-status-command full-stub pattern (git argv stubbed over a `createTree` dir).
- `page/answer.ts AnswerDeps.send` as precedent for function injection into a command.
- `skill-wiring.test.ts` / `commands-table.test.ts` for the guard.

## Risks
- Split brain if only the write port is injected (reads, tracking ref, write-notice memory stay real).
- Behaviour only real git proves must keep one home before a command-level test is deleted: push flags (no hooks, no
  prompt, timeout), unreachable-origin messages, create-only/lease refs, settings read from origin's default branch,
  wt common-dir sharing, `--from-tree` head sha, non-ASCII byte framing, archive pathspecs.
- Assertions that read origin directly (`git --git-dir origin show …`, `recordPhase()`) need rewriting to `fake.filesAt`.
- record-plan-changes #1/#2 and record-tick #1 are the only command-level real lease-race tests (the "Nov 11" regression).
- Not all cost is repos: record-race (6 bun spawns, 800 ms barriers), join race subprocess, codex-packaged-entry CLI.
- Renaming to `*.git.test.ts` breaks lesson `paths:` (`gotcha-codex-packaged-entry…`, `gotcha-git-since…` `crew-*.test.ts`)
  and fixture comments.

## Neighbors
`graph files` on the change surface:
- **live-board** (draft; open phases 5, 11 task phases, 12 record export / PR H): lists `record/ref.ts`,
  `tests/fake-record.ts`, `plan/read-plans.ts`, `plan/phase-writer.ts`. Relation: `related` (live-board added most of
  these tests; its phase 12 touches record export, `same-files-as` risk on `record-export` seams). Not `needs`.
- **oversee-crew-spec**, **pr-babysit** (active): `core/land-on-main.ts`. `related` only if create exports `branchPort`.
- **spec-loop-automation** (active): `tests/git-repo.ts`. `related`.
- owner-split, spec-board: finished, none.

## Still open
None that forces a guess. Design choices for create: inject ports per command vs one injected "world"; how to fake
`boardBase`/base cache (a fake base dir vs a port); whether stateDir/claimsDir come from a stubbed `--git-common-dir`
or a dir in deps; whether to keep one real command-level lease race.
