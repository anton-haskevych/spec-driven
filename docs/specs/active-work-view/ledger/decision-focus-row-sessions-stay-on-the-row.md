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

As built in phase 4: `FocusWork = { person, mine, claims, prs }` with no sessions; `person` is
`personKey(name)` for everyone (me included), so a row reads `spectests: … ; taraskorpach: …`, or `me:`
when git gives no name. `FocusRow.position` (1-based place in the whole lane) exists so `--who` keeps a
row's number after filtering. PRs in the who cell reuse `prCell` (`#7 ✗ 2`, `#8 draft`), not the design's
`2 failing` / `checks pass` copy, so FOCUS and IN FLIGHT read the same.

`ReadyRow.focus` is the 1-based position in the FOCUS lane (one `focusOrder` feeds both), not the raw
`focus:` number.

`nameSource` is read (`sessions/live.ts`) but attribution does not gate launch titles on it: the
recorded fixture `tests/fixtures/session-busy.json` has `nameSource: "derived"` with a launch-style name,
so "derived" doesn't prove the name isn't a launch title. Requiring the title's spec to be a base node
is the guard.
