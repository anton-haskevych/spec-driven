---
needs: [1, 5]
pr: C
---

# Phase 6 — PR status

**Goal:** `spec.ts pr-status [<pr>|<spec>]` answers "where is this PR?" in one call: merged/closed/draft/mergeability, checks by bucket, failed jobs with a clean log tail (even while the rest of the run is still going), and whether the same job fails on main.

**Outcome:** No more polling loops or hand log-scraping; "is main red too?" gets a real answer instead of a guess. Costs a handful of gh calls (capped at 30); risk is gh output drift, covered by fixture tests.

**Files to touch:**
- `skills/spec/tools/pr/checks.ts`, `pr/main-compare.ts`, `pr/log-tail.ts`, `pr/render.ts` (new)
- `skills/spec/tools/commands/pr-status.ts` (new); `spec.ts` table
- `skills/spec/tools/tests/fixtures/gh-*.json` (captured shapes), `tests/pr-status.test.ts`
- `skills/spec/execute.md` (§10), `SKILL.md` (*Tools*)

## Implementation guidance

Contract in `technical.md` → *pr-status*; output in `design.md` → *pr-status output*; gh shapes in `research/2026-09-30-wave-2-hooks-gh-git.md`.

- **PR.** Argument; else the current branch's PR (`gh pr view --json number`); with `<spec>`, every PR link in `pr-opening.md` Spec state — report the last open one, name the others (CRM specs often list several).
- **Checks.** `gh pr checks --json name,state,bucket,workflow,link` already buckets CheckRuns and StatusContexts; don't re-normalise `statusCheckRollup`. Exit 1 on failures is data. `settings.checks.external` names are counted separately.
- **State precedence.** `merged`/`closed` → `conflicting` → `draft` → `red` → `pending` → `green` → `unknown`. `red` before `pending` so a known failure isn't hidden.
- **Failed-job logs.** Job ids from `gh run view <run> --json jobs` (one fetch per run, reused); logs from `gh api repos/{owner}/{repo}/actions/jobs/<id>/logs`. `gh run view --log-failed` prints only "still in progress" until the whole run ends — CRM lesson `docs/specs/_ledger/workaround-read-a-failed-job-log-while-the-run-is-still-going.md`, prior art `crm/ops/src/e2e-debug.ts:123-137`. Non-Actions checks have no job → name only. Tail cleaner strips BOM, ANSI and the `<ISO>Z ` prefix; last 30 lines.
- **Main comparison.** `gh run list --branch <default> --workflow <file>`; walk back past skipped/cancelled/absent (cap 15 runs per job, 30 gh calls per invocation), else "not run in the last N runs".

Always exits 0; the first line after the header is `state: …` so an agent (or a Monitor until-loop, if a user asks) can key on it. It never waits or polls.

## Deliverables

- [ ] `pr/checks.ts`: bucket counts + external filter from `gh pr checks` fixtures; state precedence incl. merged/closed, conflicting, draft, UNKNOWN re-poll
- [ ] `pr/log-tail.ts`: jobs-API log fetch + cleaner (BOM, ANSI, ISO prefix) from a captured sample; missing-job guard
- [ ] `pr/main-compare.ts`: walk-back with per-job and per-invocation caps and "not run" message
- [ ] PR resolution: arg → current branch → spec's links (multi-PR fixture); command + render; execute §10 prose
