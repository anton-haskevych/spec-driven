---
needs: [1, 5]
same-files-as: [6]
pr: C
---

# Phase 7 — Publish and push

**Goal:** Handoff pushes the session's work and, in `docs: main` projects, publishes the spec docs to main through git's own 3-way merge, then prints one `Remote:` line.

**Outcome:** Work never sits only on the laptop, and spec docs reach main without lost ledger rows or clobbered edits: if someone changed the same file on main (the $150 budget-line incident), publishing refuses instead of overwriting. Risk: pushing is outward-facing — confined to the current branch, and to spec files only on main.

**Files to touch:**
- `skills/spec/tools/publish/snapshot.ts`, `publish/publish.ts`, `publish/push.ts` (new)
- `skills/spec/tools/commands/push.ts`, `commands/publish-docs.ts` (new); `spec.ts` table
- `skills/spec/tools/tests/publish.test.ts`, `tests/push.test.ts` (use phase 1's `tests/git-repo.ts`)
- `skills/spec/handoff.md` (§3, §4), `update.md` (§9), `SKILL.md` (*Tools*), `README.md` (command lines)

## Implementation guidance

Algorithm in `technical.md` → *publish-docs algorithm*; it replaces the draft's hand INDEX merge and line guards, which let a branch copy overwrite main's non-INDEX edits. Verified end to end in throwaway repos (`reviews/2026-09-30-pre-execution-collegium.md` → *Probe*; ledger `decision-publish-docs-snapshot-merge.md`).

- `snapshot.ts` (pure-ish, runner-driven): pin `M`; base = last `docs(spec): snapshot` commit reachable from HEAD, else merge-base; files via `--no-renames --diff-filter=AM` filtered by `isSpecDocPath`; temp index from HEAD blobs; `commit-tree` → X.
- `publish.ts`: `merge-tree --write-tree M X` (exit 1 → stop, name files, push nothing) → `commit-tree -p M -p X` → push `D:refs/heads/<default>`; non-fast-forward → re-fetch, re-pin, rebuild once; other rejections → stop. Then `git merge --no-edit X` into the branch and push the branch again.
- `push.ts`: `git push origin HEAD:refs/heads/<current>` (`-u` when no upstream — a bare `git push` goes to `origin/main` for worktree branches created from it); refuse detached HEAD; on the default branch refuse when unpushed commits touch paths outside `isSpecDocPath`. Skip publish-docs on the default branch.
- `Remote:` line: `Remote: pushed <branch> (+N) · docs → <default> <sha> · behind <default> M` (omit parts that don't apply).

Tests run real git in `git-repo.ts` repos (CI has no git identity — set `GIT_AUTHOR_*`/`GIT_COMMITTER_*`). Cover the probe's rows: only spec files land on main; branch code not leaked; INDEX union keeps both sides; branch-merge of X is a no-op; a later merge of main is clean; a second publish is clean; main edits the same file → refused, nothing pushed; a publish after merging main that already holds another spec's snapshot is clean. Plus: `origin/main` moved between steps (pinned SHA wins); rename published as its new path; deletions reported; uncommitted edits not published; `landing/docs/specs` files included.

handoff §3: commit → `spec.ts publish-docs <spec>` when `docs: main` (it pushes the branch first, then publishes and pushes the merge-back), else `spec.ts push` (`decision-publish-docs-pushes-first.md`). `merge-tree` exit 1 = conflict, other non-zero = error; a failed merge-back after a good publish is reported with the `git merge <X>` to run. No Bun → prose fallback: `git push origin HEAD` and the manual recipe pointer (quote `"${sha}:refs/heads/main"` — zsh applies `:r` to `$sha:refs`).

## Deliverables

- [ ] `publish/snapshot.ts`: pinned main, snapshot base, `isSpecDocPath` + `--no-renames` file list, HEAD blobs
- [ ] `publish-docs` happy path: merge-tree → commit-tree → push → merge X back; probe rows as tests
- [ ] `publish-docs` guards: conflict refusal ($150 case), moved ref, one non-ff rebuild, other rejections stop, `docs: branch` / default branch → no-op message
- [ ] `push` with explicit refspec, upstream creation, detached refusal, default-branch refusal
- [ ] handoff/update prose + `Remote:` line
