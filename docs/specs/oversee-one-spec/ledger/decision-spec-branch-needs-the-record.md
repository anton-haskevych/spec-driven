---
kind: decision
applies-to: [general, load-bearing]
created: 2026-11-17T14:54:00-08:00
---

# Spec-branch mode only for specs joined to the board record

**Status: applied by the reviewer, unanswered: say if wrong.** Review fork 1 (2026-11-17) got no answer in 5 minutes.

`crew start --spec` refuses a spec that isn't joined to the record (`crew start: x is not on the board; …`).

- **Chosen:** record only. Ticks land on the record at once, so the overseer never sees a finished lane phase as open
  and never relaunches it, and `docs: branch` projects can't stall after the first batch (`pick.ts:30` skips
  `readyIn` rows).
- **Rejected:** also support `docs: main` / files specs. That needs a publish retry and a tick that reads phase
  state from `feat/<spec>`, which means more code and more failure paths (adversarial F1, integration F9).
- **Cost:** this plugin repo (board off, docs on branch) can't use spec-branch mode until it turns the board on.
  CRM (`docs: main`, record on) can.
