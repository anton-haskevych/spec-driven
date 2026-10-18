---
kind: decision
applies-to: [phase 2]
created: 2026-10-17T20:59:58-07:00
---

# The crew's "me" is run.md `runner:`

`crew start` resolves `runnerName` and writes `runner:`; a takeover rewrites it from the new
session's `runnerName`. The tick and `crew launch` read it from the run file they already parse;
neither calls git for identity. A run file without `runner:` launches nothing (close-out still runs).

- **Rejected:** resolving `runnerName` live on every tick and launch (integration and adversarial
  reviewers' preference). The picker and the gate must agree on one name for the whole run; a
  changed env or config between calls would otherwise make them disagree.
- **Also rejected:** writing `runner:` but never reading it (the spec's first draft).
