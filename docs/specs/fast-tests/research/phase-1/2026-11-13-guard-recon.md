---
date: 2026-11-13
phase: 1
chunk: guard
---

# Phase 1 recon — guard, renames, tripwire

*Source of record — do not edit.* Probes run in this session (scripts in the session scratchpad, not kept).
Paths relative to `skills/spec/tools/` unless they start with `docs/` or `skills/`.

## Seam (verified live)

- **Closure probe.** `Bun.Transpiler.scanImports` + `Bun.resolveSync`, walked transitively: 304 collected test files,
  **74** reach `tests/git-repo.ts`/`tests/joined-repo.ts` — the same 74 as wave 1 (`infer-spec` included). Runs in ~0.1 s.
  - `scanImports` **throws on a shebang line** (`#!/usr/bin/env bun`): strip a leading `#!` line first.
  - Resolved `.json` imports (`codex-runtime.json`) must not be scanned as TS: walk only `.ts`/`.tsx`/`.js`.
  - Skip `node_modules`.
- **Tripwire.** A `git` shim first on `PATH` intercepts `Bun.spawnSync`/`Bun.spawn` even when the runner passes its
  own `env` (`core/run.ts:42,59` spread `process.env`), and `sh -c git` too. It is bypassed only when `env.PATH` itself
  is overridden: `tests/skill-wiring.test.ts:69` (spawns no git), `codex-packaged-entry.test.ts:70` (prepends, keeps the shim).
  No `--preload` fallback needed.
- **`--path-ignore-patterns` repeats** on bun 1.4.4 (three patterns honoured in one run).
- **Fast tier today:** the 230 non-closure files run in **2.6 s**, all green — and real git ran **81 times** under the
  tripwire, from 16 files. Every in-process leak is one path:
  `readPlans` (`plan/read-plans.ts:35`) → `gitRecordReadPort` (`record/read.ts:57`) → `gitRecordPort` (`record/ref.ts:23`)
  → `git remote get-url origin`, through a default `systemRunner`. Git fails in the temp dir (not a repo), the command
  falls back to files, and the test passes. Entry points and whether a test can already pass a runner:
  - `phaseCommand(dir, args, workflow?, deps)` — yes (`deps.runner`): add, deployed, park, phase-move-set, phase-note,
    phase-task, review-refs, split, tick.
  - `doctorReport(dir, spec?, runner)` — yes: hook, lessons-add, settings-checks.
  - `issuesForWrittenFile(file, dir, runner)` — yes: doctor-file.
  - `hookResponse(payload, fallbackDir)` — **no runner parameter** (`hooks/spec-file-check.ts:105`): lifecycle, graph,
    hook, settings-checks.
  - `spec-folders.test.ts:110` spawns the `spec.ts ready` CLI as a subprocess: no injection possible.
  - `settings-checks` also reaches `git check-attr` (`doctor/gitattributes.ts:10`, default `systemRunner`) via `doctorReport`'s runner.

## Reuse

- `tests/stub-runner.ts` (`stubRunner` and friends) for a no-repo runner; `tests/skill-wiring.test.ts:13-14,38-42` and
  `tests/commands-table.test.ts:30` for exact-list guard style.
- Phase → file mapping for allowlist reasons: phases 4–9 "Files to touch" (4 claims/board, 5 record writes, 6 record
  reads, 7 land/join, 8 state dir, 9 surviving real git).

## Testing-issue estimate

- The guard scans files; no fixtures needed beyond the real tree. Its unit-testable logic (`realGitClosure`,
  `repoBuildsOutsideBeforeAll`) takes source text / a resolver, so scan rules get small in-memory cases.
- Tripwire ordering: an `afterAll` in one test file can't see files bun runs after it. The fast-tier result must be
  read after the whole run (a wrapper script around `bun test`), with one guard test proving the shim is armed.
- `codex-entry` hashes `skills/`: the tripwire log lives in the OS temp dir, never under `skills/`.
- Renames of 74 files: `git mv`; then grep for old names in fixtures, lessons, other tests.
- Size: `scan.ts` holds two scanners; split if it nears 250 lines.
