---
kind: gotcha
paths: [skills/spec/tools/claims/**]
seen-in: [oversee-one-spec]
created: 2026-11-17T17:31:23-08:00
---

# `claim take` refuses a phase whose ticks also sit in another tree, even the same commit

When one PR group's branch is merged or pushed into another (two trees on the same commit), `claim take` in
either tree answers `phase N is in progress in <other tree>`: `takeRefusal` (`claims/rules.ts`) refuses on any
other tree with ticks or edits for the phase, without asking whether this tree holds the same work. Check the
other tree first (`git -C <tree> log -1`, `claim list`); if it is idle and holds nothing this tree lacks, the
user's word and `--take-over` are the way through.

Seen 2026-11-17: `oversee-one-spec` PR A's session merged PR C and pushed into `feat/oversee-one-spec-pr-c`; the
PR C tree then could not claim Phase 3 until Anton said to take it over.
