---
needs: [1, 4]
pr: A
---

# Phase 5 — `pr merge` and the merge record

**Goal:** `pr merge` merges a green PR with the house method pinned to its head SHA (or merges at once with `--now`), records `merged … as <sha>` in Spec state, fetches the default branch and logs it.

**Outcome:** A PR merges only when it's really green (or when you say "merge now"), from any worktree, and the spec always knows it merged · small · risk: merging deploys in CRM — guarded by the verdict and the head pin.

**Files to touch:**
- `skills/spec/tools/pr/merge.ts` (new), `pr/gh-writes.ts` (`merge`), `pr/record.ts` (merge half)
- `skills/spec/tools/commands/pr.ts` (`pr merge`)
- tests: `pr-merge.test.ts`, `pr-record.test.ts`, fixtures `gh-merge-200.json`, `gh-merge-405.json`, `gh-merge-409.json`

## Implementation guidance

Order: verdict on the code head must be `green` unless `--now` → method from `--method`, else `pr.merge`, else refuse naming the setting → `gh api -X PUT repos/{o}/{r}/pulls/<n>/merge -f merge_method=<m> -f sha=<head>` with the exit code checked (a 405/409 body is valid JSON and must not read as success) → record in Spec state (`PR #921 merged 2026-10-10 as 9b0c1d2 (merge).`, `--date` for tests) → `git fetch origin <default>` → log `merged`. Use the PUT path, not `gh pr merge`: it fails from a worktree (`execute.md:163`).

## Deliverables

- [ ] `gh-writes.ts` `merge(n, method, sha)` → merged with sha, or refused with status and GitHub's message — fixture-driven tests for 200/405/409
- [ ] `pr/merge.ts`: green check (skipped with `--now`), method resolution, head pin, fetch — tests incl. "head moved" and "not green"
- [ ] Merge record writer (`EditPlan`, idempotent, keeps `PR #n` parseable, round-trip test)
- [ ] `pr merge [<target>] [--now] [--method m]` result and refusal lines per technical.md; logs `merged`
