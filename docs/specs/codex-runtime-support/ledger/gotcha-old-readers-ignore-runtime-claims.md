---
kind: gotcha
applies-to: [phase 2+]
created: 2026-11-08T19:10:00-08:00
---

# Older Claude readers cannot safely judge Codex claims

2.51.0 claimStatus compares sessionId only with Claude liveness and can judge a Codex claim closed. Adding a runtime field is not sufficient compatibility. Require a writer-contract activation barrier and compatible fresh sessions before mixed-runtime writes. Unsafe downgrade is refused while qualified claims/workers remain. Evidence: tools/claims/rules.ts:35–42 and claims/store.ts:41–64.

Review refinement: a new marker cannot constrain old code. Require a proved managed installation/entry/resume cutover before enabling mixed writes. Run actual 2.51.0 reader tests; arbitrary manually invoked historical copies are unsupported. If supported native reentry cannot be fenced, park mixed activation for a design decision.
