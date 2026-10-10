# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-settings-read-from-the-working-tree.md` — [phase 5, 6, 7, 8] — settings come from the tree, not main
- `gotcha-e2e-tail-is-container-noise.md` — [phase 6] — CRM E2E tail is MySQL startup log, not the failing test
- `gotcha-ghclient-caches-run-reads.md` — [phase 3, 5, 6] — GhClient caches run jobs; poll with uncached reads, pollUntil
- `gotcha-rerun-leaves-a-stale-failed-row.md` — [phase 3, 6, 7] — queued re-run hides behind old failure; can't re-run a running run
- `docs/specs/_ledger/gotcha-gh-run-list-cannot-name-the-trigger-action.md` — [general] — gh run list has no trigger action: key the ready run on new run ids

## Principles

## Domain
- `domain-docs-only-head-gets-checks.md` — [phase 1, 3, 5, 7] — docs-only tip on code gets pull_request checks; no fallback
- `domain-claude-code-wait-primitives.md` — [phase 3, 4, 7, load-bearing] — fg 120s→bg; idle tab wakes; notice has path not output

## Decisions
- `decision-agent-resolves-merge-conflicts.md` — [phase 3, 5, 7, load-bearing] — conflict → resolve, never stop; not a fix push
- `decision-babysit-runs-in-its-own-tab.md` — [phase 7] — on "babysit", launch a dedicated session in the PR's tree
- `decision-flaky-tests-strict.md` — [phase 6, 7, 8] — re-run infra failures only (attempt ≤3); fix failing tests
- `decision-checks-read-on-the-head.md` — [phase 1, 3, 5, 7] — statusCheckRollup on head; no code head; probe docs-only first
- `decision-pr-found-by-branch-merge-line-on-main.md` — [phase 4, 5, 7] — PR by group branch; merge line landed on main
- `decision-handoff-before-babysit-launch.md` — [phase 7] — hand off in full, then launch babysit last
- `decision-pr-claims-liveness-only.md` — [phase 7] — pr-<group> claims: takeRefusal only, no merged rule

## Workarounds
