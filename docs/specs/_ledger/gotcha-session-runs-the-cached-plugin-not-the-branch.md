---
kind: gotcha
paths: [skills/**]
created: 2026-10-12T23:29:44-07:00
seen-in: [self-driving-loop]
---

# A session editing this plugin runs the cached release, not the branch's skills

`/spec` and its sub-skills load from `~/.claude/plugins/cache/…/spec-driven/<released version>/`, so a session working on a branch follows the rules main shipped, not the ones the branch already changed. When the branch has changed a rule the session is about to use (a preflight output format, a report shape), read the branch's file and follow that.

Seen 2026-10-12, self-driving-loop phase 2: the 2.44.0 cache's phase-preflight still printed *Decisions for you*, while phase 1 on the branch had split it into *Defaults applied* / *Forks for you*, which the branch's execute.md §3 reads.
