---
needs: [6]
code: false
---

# Phase 7 — CRM adoption

**Goal:** One real CRM spec with two or more lanes runs start to finish under `/spec oversee-crew <spec>` on the released plugin, while a second overseer runs another spec.

**Outcome:** The one-spec overseer is proven on real work, with what went wrong written down · a night of crew time · risk: real PRs to CRM, each under its spec's ship mode.

## Implementation guidance

Pick a CRM spec with parallel lanes and no deadline. Run a second overseer on another spec at the same
time to exercise the machine limit and the whole-board skip. Record each surprise as a lesson in this
spec's ledger or the project ledger.

## Deliverables

- [ ] An overseer runs a CRM spec end to end in spec-branch mode: link the final PR
- [ ] Two overseers ran at once under the machine limit: note the counts and any overshoot
- [ ] Lessons from the run written to the ledger: list them

## Phase-local notes

- Uses the released plugin (`gotcha-session-runs-the-cached-plugin-not-the-branch`).
