---
needs: [1, 5]
pr: C
---

# Phase 6 — PR status

**Goal:** `spec.ts pr-status [<pr>|<spec>]` answers "where is this PR?" in one call: draft/mergeability, checks grouped by bucket, failed jobs with a clean log tail, and whether the same job fails on main.

**Outcome:** No more polling loops or hand log-scraping; "is main red too?" gets a real answer instead of a guess. No cost beyond ~5 gh calls; risk is gh output drift, covered by fixture tests.

**Files to touch:**
- `skills/spec/tools/git/pr-status.ts`, `git/pr-render.ts`, `git/log-tail.ts` (new)
- `skills/spec/tools/commands/pr-status.ts` (new); `spec.ts`
- `skills/spec/tools/tests/fixtures/gh-*.json` (captured shapes), `tests/pr-status.test.ts`
- `skills/spec/execute.md` (§10), `SKILL.md` (*Tools*)

## Implementation guidance

Contract and output in `design.md` → *pr-status output*; gh shapes in `research/2026-09-30-wave-2-hooks-gh-git.md`.

1. PR number: argument, or the PR link in the spec's `pr-opening.md` Spec state.
2. `gh pr view <n> --json isDraft,mergeable,mergeStateStatus,headRefOid,statusCheckRollup`; `mergeable == UNKNOWN` → one re-poll.
3. Normalise rollup: `CheckRun` (`name`, `conclusion`, run/job ids parsed from `detailsUrl`) vs `StatusContext` (`context`, `state`). Contexts matching `settings.checks.external` are counted separately.
4. `state:` precedence: `conflicting` → `draft` (when `pr.draft` projects run no CI is unknowable — report draft plainly) → `pending` → `red` → `green` → `unknown`.
5. Each failed CheckRun: `gh run view --job <id> --log-failed`, strip BOM/ANSI/`job\tstep\t<ISO>` prefixes, keep the last 30 lines.
6. Main comparison per failed job: `gh run list --branch <default> --workflow <file> --json databaseId,conclusion,createdAt` (by workflow **file**; map name→file via `gh workflow list --json`), walk back past runs where the job was skipped/cancelled/absent (cap 15), report the last real conclusion with its date, or "not run in the last N runs".

Always exits 0; the first line after the header is `state: …` so an agent (or a Monitor until-loop, if a user asks) can key on it. It never waits or polls.

## Deliverables

- [ ] Rollup normalisation + bucket counts from fixtures (CheckRun + StatusContext + external filter)
- [ ] `state:` precedence incl. conflicting, draft, UNKNOWN re-poll
- [ ] Failed-job log tail cleaner (BOM, ANSI, prefixes) from a captured log sample
- [ ] Main comparison walk-back with cap and "not run" message
- [ ] PR number from `pr-opening.md`; command + render; execute §10 prose
