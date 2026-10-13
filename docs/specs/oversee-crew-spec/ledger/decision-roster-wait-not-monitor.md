---
kind: decision
applies-to: [general]
created: 2026-10-12T20:15:42-07:00
---

# The overseer waits with one background-Bash roster wait

It does not use a Monitor watcher plus a `/loop` heartbeat. The roster wait polls
`claude agents --json` for the ids the overseer launched. It exits on the first change, on
`<id> gone`, or after 1800 s (`heartbeat`). The overseer reads the last line and starts the
next wait. This is the same primitive as `pr wait`.

Why:
- Monitor dies at its 30-minute cap and needs re-arming (pr-babysit
  `domain-claude-code-wait-primitives`).
- The heartbeat was a second mechanism that also woke the session.
- babysit.md already bans both for the same reasons.

A failed poll is skipped and never replayed. Scope is launched ids, never a path prefix: a
prefix also matches sibling repos and Anton's own tabs. Phase 4 turns it into `crew wait`.
