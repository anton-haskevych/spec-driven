---
kind: decision
applies-to: [phase 3b+]
created: 2026-11-12T01:21:07-08:00
---

# Plan changes on the record as phase 3a built them

What 3b and later build on:

- **Two plan shapes** (`plan/ops/change.ts`). `planChangePlan(spec, action, edit, see)`: the edit returns the
  spec's whole new phase list; the wrapper raises `planVersion`, writes `spec.json` (`phases`, `planVersion`)
  and RFC 7386 patches per changed phase (never `replace`, so a field a newer plugin wrote survives), and
  refuses problems the change *introduces* (`specPlanProblems`, which now includes `needs cycle: 3 → 5 → 3`).
  `phaseStatePlan` changes one phase's state (`deployed`, `parks`) and leaves `planVersion` alone.
- **Only `add`, `split`, `move`, `set` raise `planVersion`.** Each reports `(plan vN)` at the end of its line;
  `ChangeSeen { kind, line, added }` is what the plan saw at the tip. 3b's "plan changed" line diffs versions.
- **Intents.** `PLAN_INTENTS` (`plan/plan-intents.ts`) is one row per command: `read(args)` for the outbox and
  overlay, `plan(intent, see)`. A new action is an op file plus a row. `INTENT_PLANNERS` and `intentRunners`
  spread them in; only tick needs a network step first.
- **Send.** `recordPlanCommand` (`plan/record-plan.ts`) plans the intent against the record this command read
  first: a refusal there prints `phase <action>: …` and sends nothing. Then `sendRecordIntent` plans it again
  at the tip; a refusal there prints `<action>: refused, nothing written. …`.
- **Not checked on the record:** cross-spec edge refs (`other#2`) — there are no file nodes to resolve them
  against. Local refs and cycles are.
- **Parks** live in `PhaseDoc.parks` (`ParkEntry[]`, the in-flight shape). `joinedSpecState` renders them into
  the phase's in-flight note after any file note, so board, packs and crew read them unchanged. A park still
  open in a file is answered in the file. Phase 7 moves them to question documents.
- **New phases on the record** get `outcome: ""` and their prose file from the template with no deliverables
  (`phaseFileText({ onBoard: true })`), written when the change lands or is queued. `phase add --task` (both
  homes) is the only way to give a new joined phase tasks; ids are `<phase>.<n>`, n past every id with that
  prefix anywhere in the spec.
- **`move`** names tasks by id on the record (`--from` only hints); in files it needs `--from` and selects
  as tick does. **`set`** takes `--needs | --pr | --gate | --title | --outcome`; `none` clears.
