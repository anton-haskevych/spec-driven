# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-babysitter-on-pr-wait-is-not-done.md` — [phase 1, 4] — never stop a session holding a live claim; hand off first
- `gotcha-crew-worker-must-not-end-on-a-question.md` — [phase 1+] — §4 crew branch first; workers can't Write under .git/
- `docs/specs/_ledger/gotcha-pr-status-verdict-none-is-not-no-pr.md` — [general] — pr status verdict none = PR without CI, not no PR; use gh pr view

## Principles

## Domain

## Decisions
- `decision-deploy-babysitting-infra-only.md` — [general, load-bearing] — auto = merge; deploy gate only for deploy.paths
- `decision-one-home-per-crew-state.md` — [general, load-bearing] — roster+claims, in-flight.md, minimal run.md
- `decision-phase-1-ships-small-tools.md` — [general] — launch --bg, pr hold, deployed --land; fix rot as you go
- `decision-roster-wait-not-monitor.md` — [general] — background-Bash roster wait, no Monitor or /loop

## Workarounds
