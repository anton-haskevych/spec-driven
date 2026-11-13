# Fast Tests — Technical

Paths are relative to `skills/spec/tools/` unless they start with `docs/`, `skills/` or a repo-root file.
Ground truth: `research/2026-11-13-wave-1-seams-and-inventory.md` (seams, classification of all 74 files),
`research/2026-11-13-craft-fakes-guard-tiers.md` (names, fixtures, extraction) and
`reviews/2026-11-13-seam-reach.md` (why the seam is a `GitSeams` bundle and the guard checks what it does).

## 1. Guard — `tests/real-git/` + `tests/real-git-allowlist.test.ts`

Three files, so the data that every migration phase edits sits apart from the scanning logic:

- `tests/real-git/allowlist.ts`: data only.
- `tests/real-git/scan.ts`: `realGitClosure(file)` and `repoBuildsOutsideBeforeAll(src)`.
- `tests/real-git-allowlist.test.ts`: the thin test (the lesson's `enforced-by`).

```ts
// tests/real-git/allowlist.ts — one line per file: the git behaviour it proves. May only shrink.
export const REAL_GIT_FILES: Record<string, string> = {
  "record-ref.git.test.ts": "gitRecordPort: lease refusal, busy lock, offline, ref is not a branch",
  // a file due to move says "moves to fakes in phase <N>"
};
export const REAL_GIT_CAP = 74; // equals the list length; lowered by every phase that moves a file. Raising it needs a reason in the PR.
export const HELPER_EXCEPTIONS: Record<string, string> = { "crew-deps.ts": "drops git-repo in phase 8" };
export const REPO_BUILD_EXCEPTIONS: Record<string, string> = { /* current offenders, emptied by phases 4–9 */ };
```

Checks (each a `test`, failure messages as in `design.md`):
1. **Every test bun collects under `skills/` that runs real git is named `*.git.test.ts`.** Collection follows `bunfig.toml` `root = "skills"`, minus `**/fixtures/**`. Any other test suffix (`_test`, `.spec`, `_spec`) fails outright.
   - "Runs real git" means the file's transitive import closure reaches `tests/git-repo.ts` or `tests/joined-repo.ts`.
   - The closure is built from `new Bun.Transpiler({ loader: "ts" }).scanImports(src)`, which drops type-only imports, with each specifier resolved by `Bun.resolveSync(spec, dir)` and walked to the end.
   - Named imports such as `systemRunner` are not scanned: the runtime tripwire (§2) catches real git that arrives through production defaults.
2. **The set of `*.git.test.ts` files equals `Object.keys(REAL_GIT_FILES)`**, and every reason is non-empty.
3. **`Object.keys(REAL_GIT_FILES).length === REAL_GIT_CAP`.** On mismatch the message says which way to move the cap.
4. **A repo builder runs only inside `beforeAll`.** Builders are `repoWithOrigin`, `joinedRepo`, `.clone(`, `.addWorktree(`, or a same-file function whose body calls one (followed one level). A builder inside a `test`, `it` or `beforeEach` callback fails, whether directly or through that same-file function.
   - It uses `@ast-grep/napi`: find builder `call_expression`s, then walk ancestors to the nearest `beforeAll` / `test` / `it` / `beforeEach` call.
   - A builder at module or `describe` collection time also fails (`page-process`).
   - Files in `REPO_BUILD_EXCEPTIONS` are skipped; that set may only shrink.
5. **Only `git-repo.ts`, `joined-repo.ts`, `tests/fixtures/**` and `HELPER_EXCEPTIONS` may import `git-repo` among the non-test helpers.** Fixtures are subprocess scripts launched by path, not imported, so their callers are judged by check 1.

Exemplars:
- `tests/skill-wiring.test.ts:13-14,38-42`: scans source against an exact list.
- `tests/commands-table.test.ts:30`: names the offending file.

New dev dependency: `@ast-grep/napi`, pinned. It is a dev-only exception to `ROADMAP.md`'s "zero dependencies": it never ships to users. The lockfile must carry the linux-x64 binary for CI.

## 2. Tiers, tripwire and gate

- **`package.json` `test:fast`.** It runs `bun test --path-ignore-patterns='**/*.git.test.ts' --path-ignore-patterns='**/fixtures/**'` with a `git` tripwire.
  - A CLI `--path-ignore-patterns` replaces bunfig's list (`runtime/bunfig.mdx:206`); the flag exists on bun 1.4.4. Verify in phase 1 that it repeats; if not, use one brace glob.
  - **Tripwire:** a `git` shim first on `PATH` (`tests/real-git/tripwire/git`) exits non-zero, prints `real git in the fast tier: <argv>` and appends to a log that an `afterAll` in the guard fails on.
  - Phase 1 verifies that `Bun.spawn`/`spawnSync` resolve `git` through the test process's `PATH` even when a runner passes its own `env`. If they don't, fall back to a `--preload` that wraps `Bun.spawn`/`Bun.spawnSync`.
  - One guard test proves the tripwire is armed.
- **`docs/specs/_playbook/gates.md` (new).** `# Gates`, then:
  - `## per-commit`: `- [ ] bun run test:fast`, and `- [ ] changed record/, claims/, core/land-*, publish/, trees/ or mainline/? also run the *.git.test.ts files that cover them`.
  - `## pre-pr`: `- [ ] bun test` and `- [ ] bun run typecheck`.

  `docs/specs/_playbook/settings.md` gains `gates: { per-commit: per-commit }` (allowed keys `playbook/settings.ts:64`). CI (`.github/workflows/plugin-metadata.yml`) keeps `bun test`.
- **Phases 3–8 per-commit bar.** `test:fast` plus every `*.git.test.ts` covering a touched module. Each phase ends with a full `bun test`. Those real-git tests are the safety net for the seam refactor and the migrations.

## 3. Fakes and the contract suite

The ports:
- `RefPort` (`core/land-on-ref.ts:17-21`)
- `RecordPort` (`record/ref.ts:12-16`)
- `RecordReadPort` (`record/read.ts:9-14`)
- `RemotePort` (`claims/remote-take.ts:7-13`)

| File | Change |
|---|---|
| `tests/fake-ref.ts` | 40-hex commit ids (sha1 of parent + message + a per-instance counter, so golden outputs don't depend on test order). `fetchTip` can return `failed` (`failNextFetch`). Keep `offline`, `busyFetches` and `racerBeforeNextPush`. `viewOf`'s default tip stays `t1`: it never reaches git. |
| `tests/fake-record.ts` | `readBlobs` throws `record blob <id> is missing`, like `record/ref.ts:112`. Add `fakeRecordPorts(record) → { port, read }`, a linked pair sharing tracking and fetched-stamp state: a push moves the tracking tip, an absent fetch clears it, and `markFetched` survives a new read port on the same fake. Lifted from `record-read.test.ts:20-38`. Add `seedRecord(record, docs)` (replaces 3 `landed()` copies) and the read-backs `docOf`, `recordPhaseOf`, `commitLog`. |
| `tests/fake-remote.ts` (new) | `fakeRemote(): FakeRemote`, lifted from `claims-remote-take.test.ts:13-39`. Closure state, no `this`. `hasBranch` returns true, false or unreachable. |
| `tests/record-port-contract.ts` (new, not collected) | `recordPortContract(name, make)`. `make` returns the port plus `landElsewhere`, `goOffline` and `lock`. Cases: absent ref, create-only refusal, lease landing with deletes, refused lease after a race, offline, busy, one-call blob batch, missing blob throws, non-ASCII bytes round-trip. |
| `tests/record-read-port-contract.ts` (new) | `recordReadPortContract(name, make)`: push moves `trackingTip`, absent clears it, `lastFetched`/`markFetched` persist across a new port. |
| `tests/remote-port-contract.ts` (new) | The same for claims: create-only push, lease take-over, delete, fetch prunes, offline, `hasBranch` true/false/unreachable. |
| `tests/fake-record.test.ts` (new) | Runs the three contracts on the fakes (fast tier). |
| `tests/record-ref.git.test.ts`, `tests/claims-remote.git.test.ts` | Run the same contracts on real git. The real `make()` reuses one `beforeAll` repo and deletes the record ref on origin and the local tracking ref (`update-ref -d`) before each case; no clone per case. Keep only adapter-only cases (ref not a branch, `.lock` busy, hash-object count) beside them. |

"No origin" is not a port case: `gitRecordPort` returns `undefined` (`record/ref.ts:23`), and `recordPortsOf` does the same (§4).

## 4. Command seam

### Phase 3 starts with a trace

Run each phase 4–8 target test once under a recording runner, and list here every git argv each command reaches. Each argv is marked **seam** (behind `GitSeams`) or **stub** (answered by `gitStub`). The tables below are the starting plan, and the trace corrects them. Known so far, beyond the record ports:
- **Board load** (`board/load.ts:62-80`): `defaultBranch`, then `loadMainline` (`mainline/load.ts:39-50`: pin fetch, `log -1`, `baseProject` archive, `rev-parse --show-prefix`, `readPlans`), `scanWorkspaces` (`for-each-ref`) and `loadWorkspaces` (`worktree list`).
- **Claim** (`commands/claim.ts:66-92`): `claimsDir`, `loadWorkspaces`, `readHolder`, and `pushAfterTake` (symbolic-ref + push).
- **`recordWorld`** (`plan/record-send.ts:33-51`): `defaultBranch` (falls back to `gh`), `treeFolder` (`show-toplevel`), `sessionFactsOf` (`treeWork`), `intentRunners`.
- **Record** (`commands/record.ts:51-69`): `status` runs `rev-parse` on the tracking ref (move it to `read.trackingTip()`); `sync` runs `refreshRecordCopy` (`record/mirror.ts:35`, `git archive`).
- **Join** (`commands/join.ts:88`): `readTreeCopies` (worktree scan). **Join-tidy** (`commands/join-tidy.ts:33-40`): `pinDefault`, `specDirAt`, `tidyHolders`.

### `core/git-seams.ts` (new)

```ts
export interface GitSeams {
  recordPorts: (git: Git) => { port: RecordPort; read: RecordReadPort } | undefined; // gitRecordPort + a read port built from it
  mainline: typeof loadMainline;                                                   // mainline/load.ts:39
  land: typeof landOnMain;                                                         // core/land-on-main.ts:25
  remote: (git: Git) => RemotePort | undefined;                                    // claims/remote-take.ts:26
  boardBase: BoardBaseReader;                                                      // plan/board-base.ts:13
}
export const systemGitSeams: GitSeams;
export function seamsOf(deps: { seams?: Partial<GitSeams> }): GitSeams;   // fills each missing field with its system default
export function recordPortsOf(git: Git, deps: { seams?: Partial<GitSeams> }): { port: RecordPort; read: RecordReadPort } | undefined;
```

One optional field, `seams?: Partial<GitSeams>`, goes on these carriers:
- `BoardRunners` (`board/load.ts:41`). `BoardDeps`, `ClaimDeps`, `PageDeps` and `PlaceDeps` inherit it.
- `PhaseDeps` (`plan/phase-writer.ts:46`)
- `JoinDeps` (`commands/join.ts:34`)
- `RecordDeps` (`commands/record.ts:17`)
- `FieldWriteDeps` (owner, ship, spec-status, focus)
- `MergeDeps` (`pr/actions/merge.ts:28`)

Defaults are applied at the use site, and production callers don't change. A new adapter is one field in `GitSeams`.

`recordPortsOf` replaces each inline `gitRecordPort(git)`. It does not resolve the default branch: commands that need a branch (plan, session register, card/land, join) keep their own `defaultBranch` call, in their current order. Session end, record sync, record-export and join-from-tree stay origin-only. Each command keeps its exact refusal line. `recordWorld` fills `port` and the new `read` from `recordPortsOf`, and keeps `defaultBranch?` optional: a port without a branch still works (`record-tick.ts:48`, `pr-sync-send.ts:22`, `upgrade-send.ts:22`).

### Reads (phase 3)

- `plan/read-plans.ts:34 readPlans(git, options)` gains `options.read?: RecordReadPort`. The default stays `gitRecordReadPort(git, options.fetchTimeoutMs)`, so `hooks/plan-changed.ts` keeps its fetch limit.
- `readPlansAt`, `readLocalPlans`, `plansOnDemandAt` and `specStatesAt` take `{ runner, seams? }` instead of a bare `runner`.
- Every caller that holds deps passes them: `commands/phase/context.ts:26`, `plan/write-notice.ts:28`, `commands/question.ts:36`, `commands/card/send.ts:22`, `commands/spec-field-write.ts:28`, `commands/join-tidy.ts:33`, `commands/record-export.ts:19`, `mainline/load.ts:49` (via `mainline`).

### Board, land and remote (phase 3a)

| Seam | Read in | Callers changed |
|---|---|---|
| `mainline` | `loadBoardInputs` | `board/load.ts:67` |
| `recordPorts` | `board/load.ts:134` (`syncedPrDocs`) | — |
| `remote` | `loadBoardInputs`, `claimCommand` | `claims/held.ts:27-29` `remoteHeldClaims` takes `RemotePort \| undefined` instead of `Git` |
| `land` | `landSpecField`, `deployedOnMain`, `landFocus`, `landBanner`, `join-tidy`, `mergePr` | these take a deps object (`{ runner \| git, seams? }`) instead of a bare `runner`/`git`; `commands/phase/deployed.ts:15` passes `context.deps.runner` (today it silently defaults to `systemRunner`) |
| `boardBase` | plan, session, join, card/land | — |

`branchPort` stays private. `stateDir`/`claimsDir` keep resolving through the runner, and `gitStub` answers them.

## 5. Test helpers

| Helper | Home | Notes |
|---|---|---|
| `joinedDocs(spec, phases)` | `tests/record-factories.ts` | Pure doc list. `joinedRepo` (`tests/joined-repo.ts:28-31`) consumes it. |
| `joinedFiles(tree, phases)` | `tests/tree.ts` | The disk half of `joined-repo.ts:19-23`. |
| `withSettings(tree, extra?)` | `tests/tree.ts` | Settings `docs: main`, `board.record: on`, people. Replaces 11 inline copies as files are touched. |
| `strictRunner(canned)` + `gitStub({ commonDir, ident?, head?, branch?, defaultBranch?, toplevel?, answers? })` | `tests/stub-runner.ts` | Beside `stubRunner`/`routeGh`. Named answers for the argv the trace lists. Unknown argv throws, never returns code 1. Extra answers are canned results, never a `Runner`, so a stub can't fall through to real git. |
| `phaseDeps()`, `joinDeps()`, `recordDeps()`, `claimDeps()`, `fieldWriteDeps()` | `tests/command-deps.ts` (new) | `Partial<XDeps>` overrides. Defaults are `seams` from the fakes plus `gitStub`. Never imports `git-repo`. |
| fake `land` | `tests/command-deps.ts` | Keeps a `main` file map apart from the tree. Runs `plan` on a temp dir seeded from that map. Returns the full `MainLanding` union (landed / unchanged / refused / failed / offline) and records `{ branch, files, message }`. Held to a land contract shared with `landOnMain` (phase 3a). |

## 6. Lesson and principle

- **New lesson** `docs/specs/_ledger/principle-tests-use-real-git-only-for-code-that-runs-git.md`:
  - Frontmatter: `kind: principle`, `paths: [skills/spec/tools/tests/**]`, `seen-in: [live-board, fast-tests]`, `enforced-by: skills/spec/tools/tests/real-git-allowlist.test.ts` (Anton, review 2026-11-13: house rule; recall stays silent and the guard's red message teaches).
  - First paragraph: the rule, the fakes to use, the `*.git.test.ts` suffix and the guard.
  - Write path: `lessons similar` → write → `lessons add`.
- **Existing gotcha:** shorten the cost note at the end of `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner.md` to a pointer.
- **`skills/spec/principles.md` §13:** one sentence. Real git only for code that runs git; `real-git-allowlist.test.ts` enforces it.

## 7. Migration targets (from wave 1)

- **Smoke tests.** A migrated file keeps one real smoke test only when the command itself proves a git behaviour nothing else covers. That test moves to `<name>.git.test.ts`.
- **Assertions.** Assertions that read origin (`git --git-dir … show`, `recordPhase()`) become `docOf(fake, …)` / `recordPhaseOf`.
- **Before deleting a real test,** name where its git behaviour is still proven (land-on-main, record-ref, claims-remote, push, trees-acquire).
- **Handoff.** Each migration phase's handoff lists the test names it removed, each mapped to a fake test or to `<file>.git.test.ts:<test>`.
