---
kind: gotcha
applies-to: [phase 6]
created: 2026-11-17T18:07:36-08:00
---

# `crew check <id>` runs today's close-out, even for a lane worker

Only `crew tick` passes close-out the layouts and the record's phase tasks (`TickWorld.layouts`,
`phaseTasks`, `commands/crew/tick-ports.ts`). `crew check` (`commands/crew/check.ts`) reads no record, so for a
lane worker in spec-branch mode it still compares HEAD with `origin/<lane>` and can say "commits not on origin"
after a clean `merge-back --push` (the docs snapshot merge moves HEAD past the lane's pushed name).

When `oversee-crew.md`'s one-spec section (Phase 6) leans on `crew check`, give it the same world first
(`readPlansAt` + `specLayout`), or tell the overseer to trust the tick's verdict.

Found in Phase 4: kept out of scope (not in the phase's files).
