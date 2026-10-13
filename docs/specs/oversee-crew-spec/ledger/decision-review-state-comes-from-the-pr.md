---
kind: decision
applies-to: [phase 3+]
created: 2026-10-12T22:45:09-07:00
---

# Review state comes from the PR, never from the spec's ship mode

The board tells held PRs apart by the PR alone: the `hold-for-review` label (`HOLD_LABEL`, added by
`pr hold`) and gh's `reviewDecision`, both in the open-PR list. It never reads a spec's `ship:`. A label
is what GitHub shows Anton too, and it stays true when `ship:` changes after the PR was held.

Consequences later phases rely on:
- `prNext` (`T/board/joins.ts`) decides in this order: changes requested (any PR) → approved (held) →
  failing CI → awaiting review (held) → merge. A held PR never reads "merge".
- An approved PR babysits in auto even on a `ship: hold-for-review` spec (babysit.md *Mode*); otherwise
  the approval would be held a second time.
- `attentionCells` (`T/board/render.ts`) is an exhaustive switch with a `never` default. Phase 3's
  `question` kind won't compile until it has a line; that is the point.
- Board JSON is version 2 for these kinds. Phase 3 bumps again only if it changes a field's meaning;
  a new kind with no data adds no line (the golden board stays green).
