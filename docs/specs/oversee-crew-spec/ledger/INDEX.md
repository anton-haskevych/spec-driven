# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-babysitter-on-pr-wait-is-not-done.md` — [phase 1, 4] — never stop a session holding a live claim; hand off first
- `gotcha-crew-worker-must-not-end-on-a-question.md` — [phase 1+] — §4 crew branch first; workers can't Write under .git/
- `gotcha-bg-sessions-are-messaged-by-name.md` — [phase 1+] — SendMessage needs the launch title; kill -9 is revived
- `gotcha-session-id-can-change-mid-session.md` — [phase 1+] — overseer: id can go stale under a live overseer
- `docs/specs/_ledger/gotcha-pr-status-verdict-none-is-not-no-pr.md` — [general] — pr status verdict none = PR without CI, not no PR; use gh pr view
- `docs/specs/_ledger/gotcha-spec-ts-exits-0-on-refusal.md` — [general] — spec.ts exits 0 on refusals; read the last line, don't chain on &&
- `docs/specs/_ledger/gotcha-changes-requested-outlives-the-fix.md` — [general] — CHANGES_REQUESTED outlives the fix; act once per REST review id
- `docs/specs/_ledger/gotcha-git-since-ignores-a-date-it-cannot-parse.md` — [general] — git --since ignores a date it can't parse; old commits match

## Principles

## Domain

## Decisions
- `decision-deploy-babysitting-infra-only.md` — [general, load-bearing] — auto = merge; deploy gate only for deploy.paths
- `decision-one-home-per-crew-state.md` — [general, load-bearing] — roster+claims, in-flight.md, minimal run.md, Launched ids
- `decision-phase-1-ships-small-tools.md` — [general] — launch --bg, pr hold, deployed --land; fix rot as you go
- `decision-roster-wait-not-monitor.md` — [general] — background-Bash roster wait, no Monitor or /loop
- `decision-review-state-comes-from-the-pr.md` — [phase 3+] — held = label + reviewDecision; exhaustive needs-you switch
- `decision-park-entries-live-in-the-phase-note.md` — [phase 3+] — park line in in-flight note; worker unparks; handoff keeps it
- `decision-standing-go-lives-in-settings.md` — [phase 6] — pr.ship, crew caps, self-approve read from the repo

## Workarounds
