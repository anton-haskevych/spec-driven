---
kind: decision
applies-to: [phase 1, phase 5, phase 6]
created: 2026-11-17T17:06:36-08:00
---

# A spec run finishes only on a tick that began with nothing launched

`crew tick --spec` writes `state: finished` when the spec has no open phase **and** `## Launched` was already
empty when the tick began, not merely empty after this tick's close-outs.

The tick that closes out the last worker is the one that prints its `PR group ready` line. Had it finished the
run, `specRun` would stop finding `run-<spec>.md`, and the overseer's next `crew launch babysit` would file the
babysitter under the whole-board `run.md`. Waiting one tick lets the babysitter launch and close out under the
spec's run; the next empty tick ends it. Phase 5's final-PR moment relies on the same order. A tick on a finished
or stood-down run launches nothing (`isRunOpen`).
