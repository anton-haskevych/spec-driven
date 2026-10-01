---
needs: []
pr: A
---

# Phase 2 — Workspace scan

**Goal:** `workspaces/` lists every worktree and sorts it into merged, live, unknown-base or unreadable
using two repo-level git calls. For each live worktree it returns the changed spec docs (committed and
uncommitted) through a parallel `AsyncRunner`.

**Outcome:** Groundwork: the tools learn which worktrees hold unmerged spec work, in under a second on
CRM's 64 · low risk, read-only git with `--no-optional-locks`.

**Files to touch:**
- `skills/spec/tools/core/run.ts` (`AsyncRunner`, `systemAsyncRunner`, `runAll`)
- `skills/spec/tools/core/git-status.ts` (new, `parsePorcelainZ`), `context/infer-spec.ts` (uses it)
- `skills/spec/tools/workspaces/list.ts`, `classify.ts`, `changes.ts` (new)
- `skills/spec/tools/tests/stub-runner.ts` (`asyncStubRunner`), `tests/git-repo.ts` (`addWorktree`, `isolatedAsyncRunner`)
- `skills/spec/tools/tests/fixtures/git-worktree-list.txt`, `git-for-each-ref.txt` (new)
- tests: new `workspaces-list.test.ts`, `workspaces-classify.test.ts`, `workspaces-changes.test.ts`, `core-git-status.test.ts`, `run.test.ts`

## Implementation guidance

See `technical.md` → *workspaces*.

**Parsers and git calls.** The parsers are pure and carry the logic (porcelain blocks, ahead-behind
lines). The git calls are thin and always take the pinned `baseSha`, never `origin/<b>`.

**Runner.** `AsyncRunner` sits beside `Runner` in `core/run.ts` (`Bun.spawn` + `await proc.exited`,
with a timeout). `runAll(runner, jobs, concurrency)` keeps at most 8 children running, keeps results in
order, and never rejects: a failed job becomes a result. Leave the sync `Runner` alone.

**Spec docs.** Map paths to specs with the existing `isSpecDocPath` and `locateSpecFile`; there is no
new path matcher. The function is `workspaceSpecChanges` (`publish/snapshot.ts` already exports
`specDocChanges`).

**Classification.** It takes a `forceLive` set of paths, from claims and live session cwds, supplied by
Phases 4–5. Until then the set is empty.

**Fixtures.** Capture them from CRM and trim to ~10 entries. Keep one detached entry. Write one `locked`
and one `prunable` entry by hand from the git docs.

## Deliverables

- [ ] `AsyncRunner` + `systemAsyncRunner` + `runAll` (order kept, concurrency capped, a failing job doesn't reject) with `asyncStubRunner`
- [ ] `parsePorcelainZ` moved to `core/git-status.ts` with pure tests (rename/copy pairs, untracked, empty); `specsInPlay` uses it
- [ ] `parseWorktreeList` from the porcelain fixture: branch, detached, locked, prunable, main first
- [ ] `parseAheadBehind` + `classifyWorkspaces` (merged, live, unknown-base, unreadable; detached via `rev-list`; `forceLive` overrides merged) from fixtures
- [ ] `workspaceSpecChanges` with stubbed runner: committed via `diff <baseSha>...<head>`, uncommitted via `status -z` with `--no-optional-locks`, both scoped to spec docs; the main checkout runs only the uncommitted query
- [ ] `addWorktree(name, branch)` + `isolatedAsyncRunner` in `tests/git-repo.ts` + one real-git test: two worktrees, one merged, one with an uncommitted spec-doc edit, paths compared after `realpathSync`

## Phase-local notes

- Real-git tests cost 0.5–1 s each, so keep it to one.
- CRM is shallow: `unknown-base` must never be diffed (wave 1). A diff that fails for any other reason
  is `unreadable`.
