---
needs: [1, 4]
pr: A
---

# Phase 5 — `pr merge` and the merge line

**Goal:** `pr merge` merges a green PR with the house method pinned to its head SHA (or merges at once with `--now`), fetches the default branch, lands `merged … as <sha>` in the spec's Spec state on main, and logs it.

**Outcome:** A PR merges only when it's really green (or when you say "merge now"), from any worktree, and the spec on main says it merged · small · risk: merging deploys in CRM — guarded by the verdict and the head pin.

**Files to touch:**
- `skills/spec/tools/pr/actions/merge.ts` (new), `pr/actions/gh-writes.ts` (`merge`)
- `skills/spec/tools/core/land-on-main.ts` (new, lifted from `focus/land.ts`), `focus/land.ts`
- `skills/spec/tools/commands/pr.ts`, `commands/pr/merge.ts`
- tests: `pr-merge.test.ts`, `land-on-main.test.ts`, `focus-*.test.ts` (unchanged behaviour), fixtures `gh-merge-200.json`, `gh-merge-405.json`, `gh-merge-409.json`

## Implementation guidance

Lift the commit-onto-origin-tip path out of `focus/land.ts` (`landAttempt`: pin the tip, edit one spec file at the base, commit, push, retry once if main moved) into `core/land-on-main.ts`, taking an edit function — refactor commit, focus tests unchanged and green.

Order: verdict on the head must be `green` unless `--now` → method from `--method`, else `pr.merge`, else refuse naming the setting → `gh api -X PUT repos/{o}/{r}/pulls/<n>/merge -f merge_method=<m> -f sha=<head>` with the exit code checked (a 405/409 body is valid JSON and must not read as success) → `git fetch origin <default>` → land `PR #921 merged 2026-10-10 as 9b0c1d2 (merge).` in Spec state on main (`--date` for tests; keeps the `PR #n` form `pr/resolve.ts:15` and the board's `byLinks` parse) → log `merged`. Use the PUT path, not `gh pr merge`: it fails from a worktree (`execute.md:163`).

Landing on main after the merge works in `docs: main` and `docs: branch` alike, never pushes to a PR branch (no mid-CI push, no shared append across groups), and a refused landing doesn't undo the merge: `pr merge: merged; merge line not landed — <reason>`.

Retry-safe: on an already-merged PR, read `mergeCommit` from `gh pr view`, land the line if it's missing, print `Merged: …`.

## Deliverables

- [ ] `core/land-on-main.ts` lifted from `focus/land.ts`; focus uses it (refactor, green)
- [ ] `gh-writes.ts` `merge(n, method, sha)` → merged with sha, or refused with status and GitHub's message — fixture-driven tests for 200/405/409
- [ ] `pr/actions/merge.ts`: green check (skipped with `--now`), method resolution, head pin, fetch, merge line on main (idempotent, `specPrNumbers` round-trip), already-merged path — tests incl. "head moved", "not green", "landing refused"
- [ ] `pr merge [<target>] [--now] [--method m]` result and refusal lines per technical.md; logs `merged`
