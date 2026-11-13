---
kind: gotcha
paths: [skills/spec/tools/phases/locate.ts, skills/spec/tools/phases/tick.ts]
seen-in: [live-board]
created: 2026-11-13T00:53:50-08:00
---

# `phase tick … #N` counts open items: after one tick every later number shifts

`#N` selects the Nth *open* item of a phase in files (`phases/locate.ts:12,26`), not the Nth line. Ticking
`#1`, `#2`, `#3` in a row ticks the 1st, 3rd and 5th deliverables. Tick several items by a text prefix each,
or re-read the numbers the refusal lists before each tick.

Seen 2026-11-13 (live-board phase 7): `#1 #2 #3` ticked the reader, refused the `Gate:` item, then ticked
the crew deliverable that wasn't built. Reverted with `git checkout` of the phase file.
