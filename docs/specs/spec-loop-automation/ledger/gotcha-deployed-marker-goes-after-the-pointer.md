---
kind: gotcha
applies-to: [phase 2]
created: 2026-09-30T15:16:12-07:00
---

# The deployed marker is only read immediately after the phase pointer

`parsePhaseLines` tests `DEPLOYED_SUFFIX` (`core/progress.ts:10`, anchored `^`) against the text right after the `phases/….md` pointer. CRM progress lines carry trailing notes there — `→ phases/phase-5-cutover.md (closed 2026-09-08)` in `backend-ecs-blue-green/progress.md:30`.

The reader works on AST text, where backticks are gone. So in the raw line, "after the pointer" means after its closing backtick (``→ `phases/x.md` · deployed …``). Inserting before the backtick would put the marker inside the code span. `phase deployed` handles both the backticked and the bare pointer (`phases/deployed.ts` `withMarker`).

Appending ` · deployed <date>` at end of line makes the marker invisible to the reader, so `deployed` is not idempotent (it appends again every call) and `needs-deployed` edges never clear. Insert the marker directly after the pointer; keep a trailing-note line in the round-trip fixture.
