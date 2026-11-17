---
kind: decision
applies-to: [phase 3+]
created: 2026-11-17T15:20:57-08:00
---

# Spec docs reach feat/<spec> through main, not a second push

With `docs: main`, `merge-back --push` runs `publishDocs` unchanged after the lane lands. The snapshot is on main,
and every lane's next `merge-back` merges main, so the snapshot reaches `feat/<spec>` gated. Nothing pushes the
snapshot merge onto the spec branch, and there is no `mergeCommit` extraction.

- **Rejected:** landing the snapshot merge on `feat/<spec>` off-checkout (the first review's design). It moved the
  spec branch twice per landing, which made every other lane between its merge-back and its push regate, and it
  needed a new off-checkout merge with retries.
- **Follows:** close-out reads the phase's recorded commit (`<sha> on origin/<lane>`), never lane HEAD, which the
  snapshot merge moves.

Source: review 2026-11-17 final-pr-and-mode-ends (PA F7, AT F8/F10, IA F12).
