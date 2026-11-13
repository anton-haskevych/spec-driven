---
kind: gotcha
applies-to: [phase 5, 11]
created: 2026-11-12T23:14:38-08:00
---

# A session on an older plugin only breaks on a spec that has joined

A session started before the board's release reads files, as it always did. That's harmless on specs still in
files, and wrong on a joined spec (frozen `progress.md`, ticks that never reach the record). An old session never
joins anything by itself: only a 2.53+ session's execute, review, update or handoff does. So before a switch, restart
only the sessions that may touch the specs about to join, not every running session.

`/reload-plugins` (Claude Code 2.1.323) loads the new release into a running session. A session that already invoked
`/spec` keeps the old release's tool paths in its context, and that cache folder still exists, so it keeps running the
old tools until `/spec` is invoked again. Reload, then re-run its `/spec` line.

Seen 2026-11-12 on CRM's switch: 6 sessions predated 2.53.0 (installed 20:54); none touched
`explicit-charge-handling`, the first spec joined, and it worked without restarting them (Anton agreed).
