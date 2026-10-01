---
kind: decision
applies-to: [general]
created: 2026-09-30T20:34:00-07:00
---

# No Bash write guard; the `spec.ts` writers are conveniences, not mandates

Anton (2026-09-30) dropped phase 8. Scripted edits (python with `assert old in s`) are often the efficient path, e.g. one call changing six spec files where Edit needs a Read plus an Edit per file. Blocking them would force agents onto a growing command surface to prevent drift that the doctor already catches at handoff.

Standing rule for this plugin: a `spec.ts` command earns its place only by removing a repeated, observed failure, not by being the "proper" tool. Mode files name a command in the one step that uses it; the agent never chooses from a catalog. Hand edits stay allowed everywhere.

Kept: `phase tick` (it also flips the progress box), `phase add`, `phase split` (Anton: will be needed a few times), `phase deployed`, `lessons add`.
