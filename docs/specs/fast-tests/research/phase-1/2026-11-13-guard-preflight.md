---
date: 2026-11-13
phase: 1
chunk: guard
---

# Phase 1 preflight — guard, renames, tripwire

*Source of record — do not edit.* Inputs: phase entry, `2026-11-13-guard-recon.md`, `principles.md`, design/technical §1–2, §6.
Paths relative to `skills/spec/tools/`.

## Findings that change the plan

1. **The tripwire can't be read by an `afterAll` in the guard** (technical.md §2). Bun runs test files one after
   another; the guard file's `afterAll` fires when that file ends, before files sorted after it run. A leak in
   `tick.test.ts` would never fail the run. → `test:fast` runs a small wrapper (`tests/real-git/fast-tier.ts`, not a
   test file) that puts the shim on `PATH`, points it at a log in the OS temp dir, runs `bun test` with the ignore
   patterns, then fails listing every argv and cwd. The guard keeps one test proving the shim is armed, run only
   when the wrapper's env var is set.
2. **Phase 1 can't end with `test:fast` green unless 16 fast files stop leaking git** (recon). All go through
   `readPlans` → `gitRecordReadPort` (`record/read.ts:57`) with a default `systemRunner`. 14 already accept a runner
   (`phaseCommand` deps, `doctorReport`, `issuesForWrittenFile`); `hookResponse` (`hooks/spec-file-check.ts:105,112`)
   doesn't. These are not real-git tests, so renaming them `.git` would be wrong: give them a runner that answers
   every git call as git does outside a repo. `hookResponse` gains `runner: Runner = systemRunner`, the same shape
   as `issuesForWrittenFile:36`.
3. **`spec-folders.test.ts:110` spawns the `spec.ts` CLI**: nothing to inject. Run the child with `process.execPath`
   and a `PATH` that has no git, so its git calls fail exactly as in a non-repo folder (127 via `failedToRun`,
   `core/run.ts`), and the test says why.
4. **`scanImports` throws on a `#!` line and resolves `.json` imports** (recon). `realGitClosure` strips a leading
   shebang and walks only `.ts/.tsx/.js` under the repo, skipping `node_modules`.
5. **The design's tripwire message names the test file** (`design.md` → *How it behaves*: "(from claims-held.test.ts)").
   A `PATH` shim can't know which test file spawned it. The wrapper prints argv + cwd; the message drops "from <file>".

## Clean Code against phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names | Bites | `realGitClosure`, `repoBuildsOutsideBeforeAll` (technical §1); the no-git runner is named for the world it fakes: `notARepoRunner` |
| Small functions | Bites | `scan.ts` holds two scanners + the closure walk; split `repo-builds.ts` out if `scan.ts` nears 250 lines |
| No side effects | Bites | scanners take source text / a file path and return data; only the thin test reads the tree |
| Comments | Bites | allowlist reasons are data, not comments |
| Tests (F.I.R.S.T.) | Bites | scan rules get in-memory source cases; the tree-wide checks are the guard itself |
| Boundaries | Bites | `@ast-grep/napi` wrapped inside `scan.ts` only |
| Errors / null | Inert | |

## Clean Architecture against phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | production `hooks/spec-file-check.ts` gains only a `Runner` parameter; nothing in production imports `tests/` |
| Humble object | Bites | the wrapper (spawn + log read) stays thin; pure `formatTripwireLog(lines)` is tested |
| Component cycles | Inert | |

## SOLID against phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | data (`allowlist.ts`), rules (`scan.ts`), assertions (`real-git-allowlist.test.ts`): three actors, three files, as planned |
| OCP | Bites | a new builder name is one entry in a `REPO_BUILDERS` list |
| DIP | Bites | `hookResponse` depends on `Runner`, the existing port |
| LSP, ISP | Inert | |

Pass D (DDD) skipped: test tooling, no domain model.

## Guard blindness

- Check 1 as specified sees only static imports. Dynamic `import()` or a subprocess (`spec-folders`, `codex-packaged-entry`)
  is invisible to it; the tripwire covers in-process and subprocess git alike, so the two together are not blind.
- Check 4 (`beforeAll`) follows same-file helpers one level only: a helper calling a helper calling `repoWithOrigin`
  is missed. Accepted per technical.md; noted.
- The tripwire is blind when a test sets `env.PATH` itself (`skill-wiring.test.ts:69` — spawns no git; fine).

## Seam and testability

- No file pushed over a cap: `hooks/spec-file-check.ts` 129 lines, `tests/stub-runner.ts` 59.
- No extract-first refactor needed.

## Amendments

1. `test:fast` = `bun skills/spec/tools/tests/real-git/fast-tier.ts`; the shim logs to `$SPEC_GIT_TRIPWIRE_LOG`; the
   wrapper fails on a non-empty log. Guard test "the tripwire is armed" runs only under the wrapper.
2. `hookResponse(payload, fallbackDir, runner = systemRunner)`; tests in lifecycle, graph, hook, settings-checks pass it.
3. `notARepoRunner` in `tests/stub-runner.ts`: git argv → code 128 `not a git repository`; any other argv throws.
   The 16 leaking files pass it; spec-folders' CLI child runs with a git-less `PATH`.
4. Scanner strips shebangs, walks only code files.
5. Tripwire message: `real git in the fast tier: git <argv> (in <cwd>)`.

## Defaults applied

- Leaking fast files are fixed with a no-repo runner, not renamed `.git` (they never needed git).
- Fast-tier result read by a wrapper script, not a guard `afterAll`.

## Forks for you

None.
