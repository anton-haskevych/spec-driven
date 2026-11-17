---
kind: decision
applies-to: [phase 3, phase 5, load-bearing]
created: 2026-11-17T15:20:57-08:00
---

# Spec-branch mode starts in one record write and ends in prSyncPlan, whoever merged

- **Start:** `crew start --spec` writes `specBranch: { cutFrom, shipAlone }` and the `default` PR document in one
  `specBranchPlan` (invariants checked again at the tip, never queued), then cuts `cutFrom` create-only. A re-run
  with the mode on is a takeover: no checks, cut only if missing.
- **End:** `prSyncPlan`, in the write that records the `default` document merged, copies the final PR's number,
  state and merge onto every lane group's document and removes `specBranch`. Every merge path goes through it: `pr
  merge`, `pr status`, a board load that sees a GitHub merge. A closed final PR keeps the mode.
- **Rejected:** the `ship` field writer (one scalar key per commit, can queue, so half a mode could land);
  clearing in `pr merge` only (a GitHub merge, the usual end under hold-for-review, leaves the mode on forever);
  redirecting lane reads to the `default` document while the mode is on (the redirect dies with the mode, and
  every lane phase reads "built, PR not opened" again).

Source: review 2026-11-17 final-pr-and-mode-ends (PE F1/F3/F4, IA F2/F4, AT F2/F4/F12, PA F1/F4).
