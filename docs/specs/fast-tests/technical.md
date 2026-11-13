# Fast Tests — Technical

Paths are relative to `skills/spec/tools/` unless they start with `docs/`, `skills/` or a repo-root file.
Ground truth: `research/2026-11-13-wave-1-seams-and-inventory.md` (seams, classification of all 74 files) and
`research/2026-11-13-craft-fakes-guard-tiers.md` (names, fixtures, extraction).

## 1. Guard — `tests/real-git-allowlist.test.ts`

```ts
// One line per file: the git behaviour it proves. May only shrink.
const REAL_GIT_FILES: Record<string, string> = {
  "record-ref.git.test.ts": "gitRecordPort: lease refusal, busy lock, offline, ref is not a branch",
  // …
};
const REAL_GIT_CAP = 74; // lowered by every phase that moves a file to the fakes
```

Checks (each a `test`, failure messages as in `design.md`):
1. Every `tests/*.test.ts` that runs real git is named `*.git.test.ts`. "Runs real git" = its imports (via
   `new Bun.Transpiler({ loader: "ts" }).scanImports(src)`, which drops type-only imports) include `./git-repo`,
   `./joined-repo`, or a test helper that imports either (followed one level), or it imports `systemRunner` /
   `isolatedRunner` / `isolatedAsyncRunner`.
2. The set of `*.git.test.ts` files equals `Object.keys(REAL_GIT_FILES)`; every reason is non-empty.
3. `Object.keys(REAL_GIT_FILES).length <= REAL_GIT_CAP`.
4. No `*.git.test.ts` calls `repoWithOrigin`, `joinedRepo`, `.clone(` or `.addWorktree(` inside a `beforeEach`
   callback — `@ast-grep/napi` pattern `beforeEach($$$)` then a descendant `call_expression` search.
5. No non-`.git` test file and no shared helper outside `git-repo.ts`/`joined-repo.ts` imports `git-repo`.

Exemplars: `tests/skill-wiring.test.ts:13-14,38-42` (scan source, exact list), `tests/commands-table.test.ts:30`
(name the offending file). New dev dependency: `@ast-grep/napi` (pinned).

## 2. Tiers and gate

- `package.json`: `"test:fast": "bun test --path-ignore-patterns='**/*.git.test.ts' --path-ignore-patterns='**/fixtures/**'"`.
  Bun: a CLI `--path-ignore-patterns` replaces bunfig's list (`runtime/bunfig.mdx:206`); verify in phase 1 that the
  flag repeats, else use one brace glob.
- `docs/specs/_playbook/gates.md` (new): `# Gates`, `## per-commit` → `- [ ] bun run test:fast`, `## pre-pr` →
  `- [ ] bun test` and `- [ ] bun run typecheck`. `docs/specs/_playbook/settings.md` gains `gates: { per-commit: per-commit }`
  (allowed keys `playbook/settings.ts:64`). CI (`.github/workflows/plugin-metadata.yml`) keeps `bun test`.

## 3. Fakes and the contract suite

`RefPort` (`core/land-on-ref.ts:17-21`), `RecordPort` (`record/ref.ts:12-16`), `RecordReadPort` (`record/read.ts:9-14`),
`RemotePort` (`claims/remote-take.ts:7-13`).

| File | Change |
|---|---|
| `tests/fake-ref.ts` | 40-hex commit ids; `fetchTip` can return `failed` (`failNextFetch`); keep `offline`, `busyFetches`, `racerBeforeNextPush` |
| `tests/fake-record.ts` | `readBlobs` throws `record blob <id> is missing` like `record/ref.ts:112`; add `fakeRecordReadPort(record)` (lifted from `record-read.test.ts:20-38`, fetch moves the tracking tip); `seedRecord(record, docs)` (replaces 3 `landed()` copies); `docOf`, `recordPhaseOf`, `commitLog` read-backs |
| `tests/fake-remote.ts` (new) | `fakeRemote(): FakeRemote` lifted from `claims-remote-take.test.ts:13-39` |
| `tests/record-port-contract.ts` (new, not collected) | `recordPortContract(name, make: () => Promise<{ port: RecordPort; landElsewhere(...): …; goOffline(): void; lock(): void }>)`: absent ref, create-only refusal, lease landing with deletes, refused lease after a race, offline, busy, one-call blob batch, missing blob throws, non-ASCII bytes round-trip |
| `tests/remote-port-contract.ts` (new) | same for claims: create-only push, lease take-over, delete, fetch prunes, offline |
| `tests/fake-record.test.ts` (new) | runs both contracts on the fakes (fast tier) |
| `tests/record-ref.git.test.ts`, `tests/claims-remote.git.test.ts` | run the same contracts on real git in `beforeAll` repos; keep only adapter-only cases (ref not a branch, `.lock` busy, hash-object count) beside them |

"No origin" is not a port case: `gitRecordPort` returns `undefined` (`record/ref.ts:23`) and `recordAccess` maps it
to the `no-origin` kind (§4).

## 4. Command seam

### `plan/record-access.ts` (new)

```ts
export type RecordAccess =
  | { kind: "ready"; git: Git; branch: string; port: RecordPort; read: RecordReadPort }
  | { kind: "no-default-branch" }
  | { kind: "no-origin" };

export interface RecordAccessDeps {
  runner: Runner;
  recordPorts?: (git: Git) => { port: RecordPort; read: RecordReadPort } | undefined; // default: gitRecordPort + gitRecordReadPort
}

export function recordAccess(projectDir: string, deps: RecordAccessDeps): RecordAccess;
```

Replaces the branch → git → port block at `commands/plan.ts:37-43`, `commands/session.ts:41-46,58-60`,
`commands/card/land.ts:21-27`, `commands/join.ts:58-62`, `commands/join-from-tree.ts:14-16`,
`commands/record-export.ts:18,32`, `commands/record.ts:41,58`, `plan/record-send.ts:33-51` (`recordWorld` fills
`port` and the new `read` from it). Each command keeps its own refusal line (tests assert them exactly).

### Reads

`plan/read-plans.ts:34 readPlans(git, …)` gains an optional `read?: RecordReadPort` (default
`gitRecordReadPort(git)`); `readPlansAt` / `readLocalPlans` / `plansOnDemandAt` pass it through. Command paths that
already hold a `RecordAccess` pass `access.read`.

### Other git around commands — optional deps fields, default = today's code

| Field | On | Default | Callers that read it |
|---|---|---|---|
| `recordPorts?` | `PhaseDeps` (`plan/phase-writer.ts:46`), `JoinDeps` (`commands/join.ts:34`), `RecordDeps` (`commands/record.ts:17`), `BoardDeps` (`commands/board.ts:16`) | real ports | `recordAccess`, `board/load.ts:134` |
| `boardBase?: BoardBaseReader` | same | `boardBase` (`plan/board-base.ts:13`) | plan, session, join, card/land |
| `land?: typeof landOnMain` | `PhaseDeps`, `JoinDeps` | `landOnMain` (`core/land-on-main.ts:25`) | `core/land-spec-field.ts:29`, `phases/deployed-land.ts:17`, `focus/land.ts:16`, `plan/land-banner.ts:10`, `commands/join-tidy.ts:42`, `pr/actions/merge.ts:84` |
| `remote?: (git: Git) => RemotePort \| undefined` | `ClaimDeps` (`commands/claim.ts:28`), `BoardDeps` | `gitRemotePort` (`claims/remote-take.ts:26`) | `commands/claim.ts`, `board/load.ts:72` |

`claims/held.ts:27-29 remoteHeldClaims` takes `RemotePort | undefined` instead of `Git` (it hand-copies
`gitRemotePort(git)?.fetch()`). `branchPort` stays private. `stateDir`/`claimsDir` keep resolving through the runner.

## 5. Test helpers

| Helper | Home | Notes |
|---|---|---|
| `joinedDocs(spec, phases)` | `tests/record-factories.ts` | pure doc list; `joinedRepo` (`tests/joined-repo.ts:28-31`) consumes it |
| `joinedFiles(tree, phases)` | `tests/tree.ts` | disk half of `joined-repo.ts:19-23` |
| `withSettings(tree, extra?)` | `tests/tree.ts` | settings `docs: main`, `board.record: on`, people; replaces 11 inline copies as files are touched |
| `gitStub({ commonDir, ident?, head?, branch? }, fallback?)` | `tests/git-stub.ts` (new) | exact argv (`rev-parse --path-format=absolute --git-common-dir`, `var GIT_AUTHOR_IDENT`, `rev-parse HEAD`, `branch --show-current`); unknown argv throws, never code 1 |
| `phaseDeps()`, `joinDeps()`, `recordDeps()`, `claimDeps()` | `tests/command-deps.ts` (new) | `Partial<XDeps>` overrides; default to fakes + `gitStub`; never import `git-repo` |
| fake `land` | `tests/command-deps.ts` | runs `plan` on a temp project dir, records `{ branch, files, message }` |

## 6. Lesson and principle

- `docs/specs/_ledger/principle-tests-use-real-git-only-for-code-that-runs-git.md`: `kind: principle`,
  `paths: [skills/spec/tools/tests/**]`, `seen-in: [live-board, fast-tests]`, no `enforced-by`. First paragraph:
  the rule, the fakes to use, the `*.git.test.ts` suffix and the guard. Write path: `lessons similar` → write →
  `lessons add`. Shorten the cost note at the end of `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner.md`
  to a pointer.
- `skills/spec/principles.md` §13: one sentence — real git only for code that runs git; `real-git-allowlist.test.ts`
  enforces it.

## 7. Migration targets (from wave 1)

Each migrated file keeps one real smoke test only when the command itself proves a git behaviour nothing else
covers; that test moves to `<name>.git.test.ts`. Assertions that read origin (`git --git-dir … show`,
`recordPhase()`) become `docOf(fake, …)` / `recordPhaseOf`. Before deleting a real test, name where its git
behaviour is still proven (land-on-main, record-ref, claims-remote, push, trees-acquire).
