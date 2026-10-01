---
kind: decision
applies-to: [phase 7, load-bearing]
created: 2026-09-30T15:16:12-07:00
---

# publish-docs = docs snapshot commit, `merge-tree` into main, merged back into the branch

The draft's algorithm (temp index of branch files over `origin/main`, hand INDEX merge, "main's INDEX lines survive" guard) overwrote any non-INDEX spec file main had changed since the fork — the exact $150-budget-line loss it was meant to prevent — and would have made every later "merge main" conflict on the spec's own files.

Chosen algorithm (full steps in `technical.md` → *publish-docs algorithm*):
1. Pin `M = origin/<default>` once after fetch.
2. Snapshot X = base (last `docs(spec): snapshot` reachable from HEAD, else merge-base) + HEAD blobs of changed spec docs (`--no-renames --diff-filter=AM`).
3. `git merge-tree --write-tree M X` — conflict → refuse, push nothing. `.gitattributes` union handles INDEX rows.
4. `commit-tree -p M -p X`, push to `<default>`; non-ff → re-pin and rebuild once.
5. `git merge --no-edit X` into the branch (no-op diff; records ancestry).

Probe 2026-09-30 (throwaway bare origin + worktree): concurrent INDEX rows on both sides kept; branch code not leaked; branch-merge of X empty; later merge of main **clean**; second publish clean; main editing the same line as the branch → refused.

Rejected: per-file divergence guard (merge-tree does it natively); docs-only commit without merge-back (later main-merges conflict); resolve-to-ours after merging main (ancestry makes it unnecessary).

Trap: in zsh `$D:refs/heads/main` applies the `:r` modifier and mangles the refspec. Spawn argv arrays; prose fallbacks write `"${D}:refs/heads/main"`.
