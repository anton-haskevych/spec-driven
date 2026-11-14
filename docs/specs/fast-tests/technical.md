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

### The trace (phase 3, 2026-11-13)

Each phase 4–8 target file ran once with `systemRunner`/`systemAsyncRunner` wrapped in a recorder (a `--preload`
that logs argv plus the calling function from the stack); calls made by the test's own repo setup are left out. Every
git argv falls in one group, marked **seam** (behind `GitSeams`) or **stub** (answered by `gitStub` or its `answers`).

| Group | Mark | Argv (normalized) |
|---|---|---|
| `recordPorts` | seam, phase 3 | `remote get-url origin`; `fetch -q --no-tags origin +refs/spec-board/record:refs/spec-board-remote/record`; `ls-remote --exit-code origin refs/spec-board/record`; `rev-parse --verify -q refs/spec-board-remote/record`; `update-ref [-d] refs/spec-board-remote/record`; `ls-tree -r -z`; `cat-file blob` / `--batch`; `hash-object -w --stdin-paths`; commitOnto's `read-tree`, `update-index -z --index-info`, `write-tree`, `commit-tree … -m record: …`; `push --porcelain --no-verify --force-with-lease=refs/spec-board/record:…`; the read port's `--git-common-dir` (fetched stamp) |
| `land` | seam, 3a | `rev-parse --verify --quiet refs/remotes/origin/<b>^{commit}`, `hash-object -w --stdin`, commitOnto (non-record message), `push --porcelain --no-verify --force-with-lease=refs/heads/<b>:<sha>` |
| `boardBase` | seam, 3a | board-base's and upgrade-send's `rev-parse --verify --quiet refs/remotes/origin/<b>^{commit}`, pinDefault's `fetch -q origin <b>`, baseProject's `--git-common-dir` + `--show-prefix`, base-cache's `ls-tree -r --name-only -z` + `archive --format=tar` |
| `mainline` | seam, 3a | pinBase's `rev-parse … origin/<b>^{commit}`, `log -1 --format=%cI <sha>`, then the base-cache reads |
| `remote` | seam, 3a | claims remote port: `remote get-url origin` and the `refs/spec-claims/*` pushes and fetches |
| `commonDir`, `toplevel`, `defaultBranch`, `branch`, `head`, `ident`, `treeWork` | stub (named) | `rev-parse --path-format=absolute --git-common-dir`; `rev-parse --show-toplevel`; `symbolic-ref --short refs/remotes/origin/HEAD` (+ `gh repo view` fallback); `branch --show-current`, `symbolic-ref --short -q HEAD`; `rev-parse HEAD`; `var GIT_AUTHOR_IDENT` (plain and `-c user.useConfigOnly=true -c user.email=spec-driven@invalid`); `--no-optional-locks status --porcelain -z --untracked-files=normal`, `remote`, `rev-list --count HEAD --not --remotes` |
| `worktrees` | stub (`answers`) | `--no-optional-locks worktree list --porcelain`; `for-each-ref --format=%(refname:short) %(ahead-behind:<sha>) refs/heads`; workspaceSpecChanges' `diff --name-only -z` + `status --porcelain -z --untracked-files=all` (board load, join's readTreeCopies) |
| `holders` | stub (`answers`) | join-tidy's tidyHolders: `diff --name-only -z <sha>...HEAD`, `status … --untracked-files=all`, `fetch -q --prune origin +refs/heads/feat/<spec>*:…`, `for-each-ref refs/remotes/origin/feat/<spec>*` |
| `push` | stub (`answers`) | publish/push.ts: `symbolic-ref --short -q HEAD`, `rev-parse --verify -q refs/remotes/origin/<b>`, `rev-parse --abbrev-ref --symbolic-full-name @{u}`, `rev-list --count [--first-parent] …`, `fetch -q origin main`, `status --porcelain -z`, `push --porcelain [-u] [--no-verify] origin HEAD:refs/heads/<b>`; push-commit's `fetch`, `merge-base --is-ancestor`, `push` (record-tick, pr-open, publish-commands) |
| `originTip`, `check-attr`, crew and pr facts | stub (`answers`) | `rev-parse --verify --quiet refs/remotes/origin/main^{commit}` outside a seam (join-tidy, trees-prune); doctor's `check-attr merge -- …`; spec-file-check's `show HEAD:./CLAUDE.md`; crew close-out's `fetch -q origin <b>`, `rev-parse origin/<b>`, `log origin/<b> --since … --grep=^\[handoff\]`, `status --porcelain`; pr-log's `log -1 --format=%s`, `rev-parse --short=7 HEAD` |
| mirror, trees, publish-docs | stays real (phases 6, 8, 7) | `archive --format=tar -o <path> <tip>` (record sync's local copy); `worktree add -q -b`, `worktree remove`, `branch -D`, `show-ref --verify`, `fetch -q origin <b>`, `merge-base --is-ancestor` (trees place / prune); `merge-tree --write-tree`, `push -q origin <sha>:refs/heads/main`, `merge -q --no-edit` (publish-docs) |

Per target file (a file's `recordPorts` may include its own seeding through `joinedRepo`; `gitStub` throws on
anything it isn't given, so each migration finds the exact list):

| Phase | Test file | Seams | `gitStub` (+ `answers`) | Real or open |
|---|---|---|---|---|
| 4 | board-command | recordPorts, boardBase, mainline, remote | commonDir, defaultBranch, ident, toplevel, worktrees | — |
| 4 | claim-command | recordPorts, boardBase, mainline, remote | commonDir, defaultBranch, head, ident, push, toplevel, worktrees | — |
| 4 | claims-live | — | commonDir | — |
| 5 | card-command | recordPorts, boardBase | check-attr, commonDir, defaultBranch, head, ident, toplevel, treeWork | — |
| 5 | card-load-command | recordPorts, boardBase | commonDir, defaultBranch, head, ident, toplevel, treeWork | — |
| 5 | plan-command | recordPorts, boardBase | defaultBranch, head | — |
| 5 | question-command | recordPorts, boardBase | commonDir, defaultBranch, head, ident, toplevel, treeWork | — |
| 5 | record-plan-changes | recordPorts, boardBase | commonDir, defaultBranch, head, ident, toplevel, treeWork | mirror archive |
| 5 | session-command | recordPorts, boardBase | check-attr, commonDir, defaultBranch, head, ident, toplevel, treeWork | — |
| 5 | session-stamp-command | recordPorts, boardBase | commonDir, defaultBranch, head, ident, toplevel, treeWork | — |
| 5 | spec-field-commands | recordPorts, land, boardBase | commonDir, defaultBranch, head, ident, toplevel, treeWork | — |
| 6 | board-joined-golden | recordPorts, boardBase, mainline | commonDir, defaultBranch, ident, toplevel, worktrees | — |
| 6 | plan-changed-writes | recordPorts, boardBase | check-attr, commonDir, defaultBranch, head, ident, toplevel, treeWork | — |
| 6 | pr-status-command | recordPorts, boardBase | commonDir, defaultBranch, toplevel | — |
| 6 | record-command | recordPorts | commonDir | mirror archive |
| 6 | record-export | recordPorts, land, boardBase | commonDir, defaultBranch, holders, originTip, worktrees | — |
| 6 | record-newer-layout | recordPorts | commonDir | — |
| 6 | record-tick | recordPorts, boardBase | commonDir, defaultBranch, head, ident, push, toplevel, treeWork | — |
| 6 | record-tick-offline | recordPorts, boardBase | check-attr, commonDir, defaultBranch, head, push, toplevel | mirror archive |
| 6 | record-upgrade | recordPorts, boardBase | check-attr, commonDir, defaultBranch, head, ident, toplevel, treeWork | real `gh pr view` |
| 6 | trees-place-joined | recordPorts, boardBase, mainline, remote | commonDir, defaultBranch, ident, toplevel, worktrees | worktree add/remove |
| 6 | workflow-capabilities | recordPorts | commonDir | — |
| 7 | deployed-land | land, boardBase | defaultBranch | — |
| 7 | focus-land | land, boardBase | — | — |
| 7 | join-command | recordPorts, land, boardBase | defaultBranch, head, toplevel, worktrees | real `gh pr view` |
| 7 | join-tidy | recordPorts, land, boardBase | commonDir, defaultBranch, holders, originTip, worktrees | — |
| 7 | land-on-main | land, boardBase | — | — |
| 7 | owner-command | recordPorts, land, boardBase | defaultBranch, ident | — |
| 7 | publish-commands | land, boardBase | defaultBranch, push | publish-docs merge |
| 7 | ship-command | recordPorts, land, boardBase | defaultBranch | — |
| 8 | codex-entry | recordPorts | commonDir, toplevel, worktrees | — |
| 8 | context-stored-runtime | recordPorts | commonDir, worktrees | — |
| 8 | crew-check | — | branch-facts, commonDir, worktrees | — |
| 8 | crew-launch | recordPorts | commonDir | — |
| 8 | crew-overseer-command | — | commonDir, ident | — |
| 8 | crew-tick | — | commonDir | — |
| 8 | pr-log | — | commonDir, head | — |
| 8 | pr-merge | recordPorts, land, boardBase | commonDir, defaultBranch, toplevel | — |
| 8 | pr-open | recordPorts, boardBase | commonDir, defaultBranch, head, push, toplevel | — |
| 8 | pr-wait | — | commonDir, head | — |
| 8 | trees-command | recordPorts, boardBase, mainline | commonDir, defaultBranch, toplevel, treeWork, worktrees | worktree add/remove |
| 8 | trees-place-owner | recordPorts, boardBase, mainline | commonDir, defaultBranch, toplevel, worktrees | worktree add/remove |
| 8 | trees-prune | boardBase | commonDir, defaultBranch, originTip, worktrees | worktree add/remove |

Findings:
- **Real GitHub.** join-command and record-upgrade run a real `gh pr view <n>` (`copyFromFolder` reads PR lines on a
  join or an upgrade). On fakes, answer it through `answers`; `strictRunner` throws if a test forgets.
- **Nothing in phases 4–8 is stuck on real git** beyond what their phases already keep: record-command's `sync`
  (mirror), trees-command/trees-prune/trees-place-* cutting and removing worktrees, publish-docs' merge.
- **Phase 4's headline holds.** claim-command reaches only the four 3a seams (`recordPorts`, `boardBase`, `mainline`,
  `remote`: the claim ref pushes and `remoteHeldClaims`' origin lookup) plus stub answers, the bulk of them 304
  worktree scans and the branch push after a take. Once 3a lands, nothing in it needs a repo.
- **`board/load.ts:134`** still calls `gitRecordPort` inline (`syncedPrDocs`); 3a routes it through `recordPorts`.

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
