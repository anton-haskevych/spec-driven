# Project Ledger Index

- `gotcha-bun-test-runs-in-utc-but-spawned-children-do-not.md` — `skills/spec/tools/tests/**` — bun test is UTC; spawned children use the system zone
- `gotcha-execute-section-0-is-skipped-on-the-resume-path.md` — `skills/spec/execute.md, skills/spec/resume.md` — A step every execute session must run goes in execute.md §1, not §0
- `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner.md` — `skills/spec/tools/tests/**, skills/spec/tools/publish/**, skills/spec/tools/core/git.ts` — Code under test that spawns git must get `isolatedRunner`, not `systemRunner`
- `gotcha-runner-stdout-is-decoded-text.md` — `skills/spec/tools/core/run.ts, skills/spec/tools/core/git.ts` — Runner stdout is decoded text; byte-framed git output breaks
- `gotcha-git-archive-fails-on-any-unmatched-pathspec.md` — `skills/spec/tools/mainline/**` — git archive exits 128 if any pathspec is empty; archive only matching ones
- `gotcha-git-name-only-quotes-non-ascii-paths.md` — `skills/spec/tools/**` — git quotes non-ASCII paths unless -z; spec-doc matching misses them
- `gotcha-git-status-glob-pathspec-walks-untracked-dirs.md` — `skills/spec/tools/**` — glob pathspec makes git status walk untracked dirs; pass literal roots
- `gotcha-bun-glob-scan-throws-on-missing-cwd.md` — `skills/spec/tools/**` — Bun.Glob scanSync throws ENOENT on a missing cwd; check existsSync
- `workaround-squash-merge-leaves-local-main-diverged.md` — `docs/specs/**` — squash merge leaves local main diverged; verify tree, reset --keep
- `gotcha-squash-merged-branch-is-not-an-ancestor.md` — `skills/spec/tools/trees/**, skills/spec/tools/workspaces/**, skills/spec/tools/board/**` — Squash-merged branches aren't ancestors of main; match the merged PR's head
- `gotcha-clean-check-across-worktrees-stats-every-file.md` — `skills/spec/tools/trees/**, skills/spec/tools/workspaces/**` — git status in every worktree stats every file; let worktree remove refuse
