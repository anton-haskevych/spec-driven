---
kind: decision
applies-to: [phase 3+]
created: 2026-11-17T14:54:00-08:00
---

# Main reaches the spec branch through lanes' gated merge-back, not an overseer heartbeat

`merge-back <spec>` merges `origin/feat/<spec>` and then `origin/<default>` into the lane. The worker runs the
`after-merge-main` and per-commit gates before `--push`. Once every lane is done, the final-PR babysitter is the
only writer of main into `feat/<spec>`. There is no `merge-back --main`.

- **Rejected:** the overseer's off-checkout `merge-back --main` at every heartbeat (the design before review). It
  pushed main's code into the shared spec branch ungated (the house gates every main merge: `execute.md`
  after-merge-main, `babysit.md`). Its conflicts had no owner either, since lanes only merged the spec branch
  (prior-art F1, principal F3, adversarial F2).
- **Bonus:** a `needs-deployed` dependent's first merge-back brings in the ship-alone code before it codes
  (adversarial F5).
