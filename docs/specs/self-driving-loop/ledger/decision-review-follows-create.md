---
kind: decision
applies-to: [phase 1]
created: 2026-10-10T13:47:09-07:00
---

# A new spec's next session is its review

Anton, 2026-10-10: "The review is always the next step after the spec is created. Unless the human says 'Go ahead without the review' sort of thing explicitly, the agent should just suggest to spawn the review in the next session."

- create's *Next sessions* puts `<spec> review` at row 1 (`spec.ts launch review <spec>`).
- The board gives a spec with phases, no `reviews/` folder and nothing ticked one `next: review` row instead of its phase rows.
- Execute rows come first only when Anton explicitly skips the review.

Trigger: create listed execute rows, "I agree" launched phase 1 of this very spec unreviewed (claim `self-driving-loop#1`, closed before it changed anything).
