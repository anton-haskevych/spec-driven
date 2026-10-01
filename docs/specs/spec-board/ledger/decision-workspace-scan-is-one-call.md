---
kind: decision
applies-to: [phase 3+]
created: 2026-10-01T15:05:13-07:00
---

# The workspace scan is one call: `scanWorkspaces(git, runner, baseSha, forceLive)`

Preflight (2026-10-01) put the pipeline in `workspaces/scan.ts` so `board/load.ts` stays one call per
source. It returns `{ scans: WorkspaceScan[], counts: { merged, unknownBase, unreadable } }`, where
`scans` holds every live worktree (main checkout first, possibly with `specs: []`) and only an
unreadable `git worktree list` fails the whole call.

Rules a consumer relies on:
- The main checkout is always live. The committed diff runs only when a worktree has commits off base
  (`aheadOfBase`); otherwise only `status` runs, over the spec roots on disk.
- `forceLive` paths (claims, session cwds, phases 4–5) must be realpath'd: `loadWorkspaces` resolves
  worktree paths with `realpathSync` (macOS `/var` → `/private/var`). `canonicalPath` in
  `workspaces/list.ts` is private; export it on the second use.
- A worktree whose diff fails becomes `unknown-base` (merge-base exit 1) or `unreadable`, and is left out
  of `scans`.
- CRM, 64 worktrees: ~0.9 s warm; 43 merged, 4 unknown-base, 18 live.
