---
needs: []
pr: A
---

# Phase 2 — Workspace scan

**Goal:** `workspaces/` lists every worktree, sorts them into merged / live / unknown-base with two repo-level git calls, and returns each live worktree's changed spec docs (committed and uncommitted) through a parallel `AsyncRunner`.

**Outcome:** Groundwork: the tools learn which worktrees hold unmerged spec work, in under a second on CRM's 64 · low risk, read-only git with `--no-optional-locks`.

**Files to touch:**
- `skills/spec/tools/core/run.ts` (`AsyncRunner`, `systemAsyncRunner`, `runAll`)
- `skills/spec/tools/workspaces/list.ts`, `classify.ts`, `changes.ts` (new)
- `skills/spec/tools/tests/stub-runner.ts` (`asyncStubRunner`), `tests/git-repo.ts` (`addWorktree`)
- `skills/spec/tools/tests/fixtures/git-worktree-list.txt`, `git-for-each-ref.txt` (new)
- tests: new `workspaces-list.test.ts`, `workspaces-classify.test.ts`, `workspaces-changes.test.ts`, `run.test.ts`

## Implementation guidance

`technical.md` → *workspaces*. Parsers are pure and carry the logic (porcelain blocks, ahead-behind
lines); the git calls are thin. `AsyncRunner` sits beside `Runner` in `core/run.ts`
(`Bun.spawn` + `await proc.exited`), and `runAll(runner, jobs, concurrency)` keeps at most 8 children.
Leave the sync `Runner` alone. Capture the fixtures from CRM (trim to ~10 entries, keep one detached,
one with `locked`, one `prunable` written by hand from git docs).

## Deliverables

- [ ] `AsyncRunner` + `systemAsyncRunner` + `runAll` (order kept, concurrency capped) with `asyncStubRunner`
- [ ] `parseWorktreeList` from the porcelain fixture: branch, detached, locked, prunable, main first
- [ ] `parseAheadBehind` + `classifyWorkspaces` (merged, live, unknown-base, detached via `rev-list` output) from fixtures
- [ ] `specDocChanges` with stubbed runner: committed via `diff A...B`, uncommitted via `status -z` with `--no-optional-locks`, both scoped to the spec roots; main checkout runs only the uncommitted query
- [ ] `addWorktree(name, branch)` in `tests/git-repo.ts` + one real-git test: two worktrees, one merged, one with an uncommitted spec-doc edit, paths compared after `realpathSync`

## Phase-local notes

- Code under test that spawns git takes `isolatedRunner` (project ledger); real-git tests cost
  0.5–1 s each, so keep it to one.
- CRM is shallow: `unknown-base` must never be diffed (wave 1).
