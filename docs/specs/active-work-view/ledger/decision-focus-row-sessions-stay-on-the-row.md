---
kind: decision
applies-to: [phase 3, 4]
created: 2026-10-07T19:52:01-07:00
---

# Focus rows keep this machine's sessions on `FocusRow.sessions`; phase 4 adds `work` beside it

Phase 3 has no `me`, so it can't build technical.md's per-person `FocusWork`. This machine's sessions are
always mine, so they stay on `FocusRow.sessions` for good (JSON stays additive). Phase 4 adds `work` for
remote claims and open PRs by person, and renders `<me>: <sessions>` by merging the row's sessions into
the me bucket at render time. `footer.otherSessions` is `FocusSession[]` too, not strings.

`ReadyRow.focus` is the 1-based position in the FOCUS lane (one `focusOrder` feeds both), not the raw
`focus:` number.
