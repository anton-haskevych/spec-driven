---
kind: decision
applies-to: [phase 3+]
created: 2026-10-07T19:16:13-07:00
---

# Focus and `priority:` are separate axes; focus ranks first in ready rows

Prior-art asked why `priority: p1` isn't the focus set. CRM has 22 `p1` specs, with no total order
and no per-person view. Focus is the team's short, totally ordered shipping list; `priority` stays
urgency across all specs.

`rankReady` puts focus rows first (by focus rank), then today's order (overdue → priority → due → …).
No doctor coupling: a "focus spec should be p1" warning would push everything back to p1.
