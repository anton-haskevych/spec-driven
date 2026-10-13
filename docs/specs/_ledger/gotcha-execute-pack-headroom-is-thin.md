---
kind: gotcha
paths: [skills/spec/tools/context/**]
created: 2026-10-12T22:42:31-07:00
seen-in: [self-driving-loop]
---

# The execute pack's capped blocks already add up to ~28K of the 30K limit: cap anything new

A tool result over ~30K characters is written to a file, and sessions then read their start-up context back from it. The execute pack's capped blocks (phase entry 8K, ledger rows 6K, code map, CLAUDE.md, project lessons, playbooks 3K each, in-flight 2K) sum to about 28K, and *Related specs*, the ready set and the doctor lines are uncapped. Any new block, or a bigger limit, needs a budget and a CRM measure before it ships.

Evidence: self-driving-loop phase 4 put lessons in 3K pointers and clipped playbooks at 3K. CRM's 92 open specs went from max 69,043 / median 20,963 to max 29,193 / median 16,708 chars; the max (academy-ballroom-migration) is filled by capped blocks plus 2.3K of Related specs.
