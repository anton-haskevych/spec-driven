---
needs: [1, 5]
same-files-as: [6]
pr: C
---

# Phase 7 — Publish and push

**Goal:** Handoff pushes the session's work and, in `docs: main` projects, publishes the spec docs to main safely, then prints one `Remote:` line.

**Outcome:** Work never sits only on the laptop, and spec docs reach main without lost ledger rows or clobbered edits (the $150 budget-line incident). Risk: pushing is outward-facing — confined to the current branch, and to spec files only on main.

**Files to touch:**
- `skills/spec/tools/git/push.ts`, `git/publish.ts`, `git/index-merge.ts` (new)
- `skills/spec/tools/commands/push.ts`, `commands/publish-docs.ts` (new); `spec.ts`
- `skills/spec/tools/tests/git-repo.ts` (new — bare origin + worktree + fixed identity), `tests/publish.test.ts`, `tests/push.test.ts`
- `skills/spec/handoff.md` (§3, §4), `update.md` (§9), `SKILL.md` (*Tools*)

## Implementation guidance

Algorithm in `technical.md` → *publish-docs algorithm*; reproduced pitfalls in wave 2 (folder adds delete rows; branch INDEX copy drops main's rows; deletions can't be published; push races; shared `refs/remotes/origin/*` across worktrees).

`index-merge.ts` is pure: `(mainText, branchText) → mergedText` — main's lines kept verbatim, branch rows missing from main inserted after the last row of the same `##` section. It is the core of the guard: every main line must survive.

Tests run real git in `git-repo.ts` repos (CI has no git identity — set `GIT_AUTHOR_*`/`GIT_COMMITTER_*`). Cover: files land on origin/main only; worktree HEAD/index untouched; concurrent push → one rebuild then error; deletions reported, not staged; INDEX merge keeps both sides.

`push`: current branch with upstream → `git push`; none → `git push -u origin HEAD`. On the default branch, refuse when unpushed commits touch paths outside `docs/specs/` and say so. `Remote:` line: `Remote: pushed <branch> (+N) · docs → <default> <sha> · behind <default> M` (omit parts that don't apply).

handoff §3: commit → `spec.ts push` → `publish-docs <spec>` when `docs: main`. No Bun → prose fallback: `git push` and the manual recipe pointer.

## Deliverables

- [ ] `tests/git-repo.ts` helper (bare origin, worktree, identity env)
- [ ] `index-merge.ts` pure merge + main-lines-survive guard
- [ ] `publish-docs` happy path: only spec files onto origin/main; worktree untouched
- [ ] `publish-docs` guards: deletions skipped, race → one rebuild, `docs: branch` → no-op message
- [ ] `push` with upstream creation and default-branch refusal
- [ ] handoff/update prose + `Remote:` line
