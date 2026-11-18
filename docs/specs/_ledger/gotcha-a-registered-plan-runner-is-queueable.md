---
kind: gotcha
paths: [skills/spec/tools/plan/intents.ts, skills/spec/tools/plan/ops/**, skills/spec/tools/record/outbox.ts]
created: 2026-11-17T16:33:05-08:00
seen-in: [oversee-one-spec]
---

# A plan registered in `PLAN_RUNNERS` can be queued: a never-queued write lands through `writeRecord`

Registering a record plan in `PLAN_RUNNERS` (`plan/intents.ts`) makes it replayable from the outbox, and
`sendIntent` (`record/outbox.ts`) queues it whenever origin doesn't answer. A write that must never be queued (join,
`card add`/`load`, `plan apply`, PR sync, the spec-branch start) stays unregistered and calls
`writeRecord(port, stampedBy(...)(plan), { validate: validateRecordDoc })` directly, mapping `offline` to a refusal.
"Shaped like `fieldPlan`" is fine; "registered like `FIELD_COMMAND`" is not.
