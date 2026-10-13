---
kind: decision
applies-to: [general]
created: 2026-10-12T20:15:42-07:00
---

# Phase 1 ships small tools where prose is the risky step, and fixes rot as it goes

Phase 1 pulls in four small tools:
- `launch … --bg --brief`, plus the `hold` word for babysit
- `pr hold`
- `phase deployed --land`
- the `deploy:` setting

The overseer never hand-types a `claude --bg` line. Bugs or rotten code found next to this
work get fixed in their own commit and named in the handoff.

Anton, 2026-10-12 (review fork A): "Of course! your work is investment into the codebase. If
you see some rotten pieces or bugs along the way, fix them as you go."

Rejected: phase 1 as prose plus two wiring changes (the prep draft). Under that draft the
most-repeated step was the most error-prone one.
