---
date: 2026-11-13
wave: 2
lens: craft
slug: fakes-guard-tiers
brief: product-brief.md
---

# Craft Wave — fakes, guard, tiers

*Source of record — do not edit. Distilled into the spec by `/spec create`.*
Three Explore agents: naming & placement, fixtures reuse map, extraction. Paths relative to `skills/spec/tools/`.

## Naming & placement (each matched to an exemplar)

| New thing | Name + place | Exemplar |
|---|---|---|
| Optional port on command deps | field on the existing `<Thing>Deps`, default via `deps.x ?? system` or a `system<Thing>Deps()` default | `RecordDeps.runners(git)` / `intentRunners` (`commands/record.ts:21,33`); `RecordWorld.port?` (`plan/record-send.ts:19,43`); `deps.spawner ?? detachedSpawner` (`commands/trees.ts:41`) |
| Board base source | `BoardBaseReader` type + `boardBase?` deps field in `plan/board-base.ts` (a function, not a `*Port`) | `HeldReader` / `ContextDeps.readHeld` (`commands/context.ts:42,46`) |
| landOnMain injection | inject the `landOnMain` function (deps field), not `branchPort` | `AnswerDeps.send` (`page/answer.ts:16-21`) |
| Fake read port | `fakeRecordReadPort(record)` in `tests/fake-record.ts` (lifted from `record-read.test.ts:20-38`) | `fakeRecord` (`tests/fake-record.ts:13,17`) |
| Shared claims fake | `tests/fake-remote.ts` → `fakeRemote(): FakeRemote` (alt. `fake-claims-origin.ts`), lifted from `claims-remote-take.test.ts:13-39` | `fake-ref.ts:10,20` |
| Command deps builders | `tests/command-deps.ts` exporting `joinDeps()`, `recordDeps()`, `phaseDeps()` (`<area>Deps(overrides: Partial<XDeps> = {})`) | `tests/crew-deps.ts:6,8`, `tests/context-fixture.ts:7` |
| Contract cases | `tests/record-port-contract.ts` exporting `recordPortContract(name, make)` (no `.test.ts`, not collected); run by `fake-record.test.ts` and `record-ref.git.test.ts`. Claims: `remote-port-contract.ts` run by `claims-remote-take.test.ts` + `claims-remote.git.test.ts` | none (no `describe.each`); closest `test.each` at `plan-phase-stage.test.ts:10` |
| Real-git tier | `<name>.git.test.ts` (first double suffix in the repo); a SMOKE-ONLY file splits into `<name>.test.ts` + `<name>.git.test.ts` | module naming `<folder>-<module>.test.ts`, `<cmd>-command.test.ts` |
| Guard | `real-git-allowlist.test.ts`, `describe("real-git test allowlist")` (not `guards.test.ts`, which tests `enforced-by`) | `skill-wiring.test.ts:38-42,109-110`, `commands-table.test.ts:30` |
| Lesson | `docs/specs/_ledger/principle-tests-use-real-git-only-for-code-that-runs-git.md`, `paths: [skills/spec/tools/tests/**]`; run `lessons similar` first (may fold into `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`) | project ledger kinds: `gotcha` 33, `workaround` 2 |
| principles.md | amend §13 (`skills/spec/principles.md:72-76`), one sentence pointing at the guard | `## N. Title` + 1–2 paragraphs |
| Gates | `docs/specs/_playbook/gates.md` (`# Gates`, `## per-commit` with `- [ ]` lines), `gates: { per-commit: per-commit }` in `settings.md`; pre-PR real-git run as `gate:` in pr-opening | `~/IdeaProjects/crm/docs/specs/_playbook/gates.md`; `playbook/gates.ts:5-23`, `playbook/settings.ts:64` |

## Fixture map (reuse / adapt / create)

| Need | Reuse as-is | Adapt | Create |
|---|---|---|---|
| Spec files on disk | `createTree().spec()` `tests/tree.ts:15,23` (50 users); `specFiles` `join-fixtures.ts:24`; `createContextFixture` `context-fixture.ts:11` | — | — |
| Settings file (board on, people) | — | inlined in 11 files | `withSettings(tree, extra?)` in `tree.ts` |
| Joined spec, record side | `fakeRecord`, `landFromAnotherMachine`, record-factories (57 users) | `landed()` (3 copies: `record-read.test.ts:42`, `page-answer.test.ts:23`, `page-preview.ts:17`) → export `seedRecord` | `joinedDocs(spec, phases)` pure, used by BOTH `joinedRepo` and fakes so seeds can't drift |
| Joined spec, disk side | — | disk half of `joined-repo.ts:19-23` | `joinedFiles(tree, phases)` |
| Read port | — | `record-read.test.ts:20-38` → `fake-record.ts` | — |
| Claims origin | — | `claims-remote-take.test.ts:13` → `fake-remote.ts` | — |
| Common/state dir, identity, HEAD | pattern `pr-status-command.test.ts:68`, `context-stored-runtime.test.ts:36`; `RUNNER_IDENT` `git.test.ts:74` | stub the FULL argv (`rev-parse --path-format=absolute --git-common-dir`), else `rev-parse HEAD` gets the dir | `gitStub({commonDir, ident?, head?, branch?})` / `commonDirRunner(dir, fallback)` in `stub-runner.ts` |
| Crew deps | `claudeAnd` logic | `crew-deps.ts:8` drops the `git-repo` import, defaults to a stub | — |
| Read-back assertions | `fake.filesAt(fake.tip)` | `recordPhase` (`joined-repo.ts:38`) | `docOf`, `recordPhaseOf`, `commitLog` in `fake-record.ts` |

Per offender needs: claim-command (claims dir, ps stub, claude home, claim refs → fakeRemote), card/question/
record-plan-changes/spec-field-commands (joined record + outbox + session id; spec-field also lands on main), join/
join-tidy (record + main), codex-entry (pilot workspace common dir), crew-tick/crew-overseer/pr-log/pr-wait (state dir only;
crew-overseer also identity) — these four need no repo at all with a common-dir stub.

## Extraction wins (ranked)
1. **One record-write setup factory** (branch → git → record port with no-origin refusal → boardBase, plus the read
   port): full copies at `commands/plan.ts:37-43`, `commands/session.ts:41-46`, `commands/card/land.ts:21-27`,
   `commands/join.ts:58-62,79`; port-only at `join-from-tree.ts:14-16`, `session.ts:58-60`, `record-export.ts:18,32`,
   `record.ts:41,58`. Returns outcome kinds; each command keeps its own refusal line (tests assert them exactly).
2. **Fake read port** into `fake-record.ts` (move; its fetchTip updates the tracking tip, closing that fake gap).
3. **`fakeOrigin` → `fake-remote.ts`** (move).
4. **`claims/held.ts:27-29` takes `RemotePort | undefined`** instead of `Git` (it is a hand copy of
   `gitRemotePort(git)?.fetch()`; only caller `board/load.ts:72`). Origin-url check repeated 3× (`record/ref.ts:23`,
   `claims/remote-take.ts:27`, `claims/held.ts:28`).
5. **Common-dir stub helper** in `stub-runner.ts` (test-side only; replaces `events()` in pr-merge/pr-open/pr-wait and
   `claims-live.test.ts:23`). Production `stateDir`/`claimsDir` already resolve through one runner call.
6. **Inject `landOnMain` itself** (6 callers: `core/land-spec-field.ts:29`, `phases/deployed-land.ts:17`,
   `pr/actions/merge.ts:84`, `focus/land.ts:16`, `plan/land-banner.ts:10`, `commands/join-tidy.ts:42`); a fake runs
   `plan` on a temp dir and records the files.

## Don't extract
- `branchPort` export: `planAt` (`core/land-on-main.ts:49-58`) still runs `git archive`; nothing gained.
- A production dir source in deps: the runner already is the seam; two paths = split brain.
- `onRecord`/`onOrigin` (`git --git-dir … show`) helpers: identical in 6 files but they lock in real git; moved files
  rewrite to `fake.filesAt`.
- `pr-merge setup()`, `pr-open groupTree()`, `pr-wait setup()`: different fixtures; sharing couples files.
- Repos shared across files: `--parallel` implies `--isolate`; share within a file only.
- `tests/fixtures/runtime-2.51.0/**`: frozen copies, never touched.
- `joined-repo.ts` stays the one real smoke fixture (but consumes `joinedDocs`).
- Refusal strings (9 "no origin" variants, 5 `NO_DEFAULT_BRANCH.replace`): user-facing, asserted exactly; out of scope.
- A general git-emulating stub runner: unknown argv returns code 1 → silent fallback. Stub narrow argv only.

## Template-copy repos
Not safe as proposed: origin URL is absolute in `.git/config` (`tests/git-repo.ts:82,98`); worktrees store absolute
gitdirs both ways; `.git/spec-board/*` state copies over. Safe variant: copy work repo + origin before any worktree or
command, then `git remote set-url origin <copy>`; saves ~5 of 7 setup processes. Modest gain: most cost is commands
fetching/pushing during the test. CI git version on `ubuntu-latest` unchecked.

## Decisions for create to lock
1. Seam shape: per-command optional deps fields (record write+read port, boardBase reader, landOnMain, RemotePort) vs
   one record-setup factory that tests override (extraction win 1). Either way, reads and writes injected together.
2. Lesson vs guard: recall never shows a lesson with `enforced-by` (`lessons/recall.ts:14`). Leave `enforced-by` off
   (lesson stays visible) or change recall. Also a new one-`seen-in` lesson sorts behind 8 existing test lessons.
3. Guard granularity: count files importing `./git-repo` (and `joined-repo`/`crew-deps`, which import it), or only
   files calling `repoWithOrigin`/`joinedRepo`; regex misses nested-brace `beforeEach` (`codex-packaged-entry:17-28`) —
   AST (ast-grep) or the TS compiler API instead.
4. Fake sha shape: keep `c1/t1` and loosen `[0-9a-f]{7}` assertions, or make the fake emit hex.
5. Keep one real command-level lease race (the "Nov 11" regression in record-tick / record-plan-changes) or rely on
   record-race + fake racer.
6. Per-commit gate command: `bun test --path-ignore-patterns='**/*.git.test.ts' --path-ignore-patterns='**/fixtures/**'`
   (whether the flag repeats is unchecked) vs a package.json script. `--parallel` stays a later measurement.
7. Template-copy for surviving real repos: worth it or not.
