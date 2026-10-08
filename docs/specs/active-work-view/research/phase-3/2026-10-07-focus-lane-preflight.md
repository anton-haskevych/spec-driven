# Phase 3 preflight — FOCUS lane (2026-10-07)

Inputs: `phases/phase-3-focus-lane.md`, `research/phase-3/2026-10-07-focus-lane-recon.md`, `principles.md`.
`T` = `skills/spec/tools`.

## Findings that change the plan

1. **`ReadyRow.focus` must be set before `rankReady` (`T/board/lanes.ts:55`), but `focusLane` runs last.** The
   plan has both read focus independently; the lane hides finished specs without an open PR, so the two can
   disagree on positions. → One pure `focusOrder(inputs)` (eligible specs, ranked) feeds both; `ReadyRow.focus`
   is the 1-based **position** (what `focus 2` prints and the lane shows), not the raw `focus:` number.
2. **`lane()` is private to `T/board/render.ts:40-42`; `render-focus.ts` needs it and importing back from
   `render.ts` would be a cycle.** → Move `lane` to `T/board/cells.ts` (exported) as its own green step.
3. **`footer.otherSessions?: string[]` (technical.md) bakes `busy 4h` into JSON at build time or loses the
   status.** → `FocusSession[]` (same shape as row sessions); render formats age. Additive either way.
4. **Phase 3 has no `me` (phase 4).** `FocusWork` per person needs it. → Phase 3 puts this machine's sessions
   on `FocusRow.sessions` (always mine) and renders them unprefixed; phase 4 adds `work` for remote claims and
   PRs and renders `<me>:` in front of the sessions. Recorded as a ledger decision so phase 4 doesn't move them.
5. **`BOARD_USAGE` (`T/commands/board.ts:9`), its SKILL.md copy (`SKILL.md:101`) and
   `board-command.test.ts:50` list the lanes by hand.** Adding `"focus"` to `LANES` changes the unknown-lane
   message. → Update all three in the render step.

## Clean Code against the chunk

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions / one thing | Bites | `focusNow` is a first-match chain of 7 kinds: one small function per kind, a `??` chain picks |
| No flag arguments | Bites | `renderBoard` keeps `options.lane`; empty-FOCUS handling keys on `lane === "focus"`, not a new boolean |
| Names | Bites | `attributeSessions` / `focusLane` / `focusOrder` per technical.md; `updatedFrom` names the flag's source |
| Errors / null | Inert | — |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule | Bites | `board/attribution.ts` is pure over `LiveSession`/`BoardInputs`; only `board/load.ts` touches git for `worktreePaths` |
| Humble object | Inert | — |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | Attribution (who) vs lane building (what) vs render: three files as planned |
| OCP | Bites | Next variant: phase 4's people buckets attach to `FocusRow` without editing attribution |
| ISP/DIP/LSP | Inert | — |

## DDD

Skipped: tooling code, no domain aggregates.

## Guard blindness

The golden "no focus" test must run `renderBoard(buildBoard(boardInputs(...)))` with sessions, claims and
workspaces populated; a factory `board()` can't fail when the builder fills `otherSessions`. Capture the
golden **before** editing `lanes.ts`/`render.ts`.

## Seam deltas vs recon

None beyond findings 2 and 5.

## Amendments

1. `focusOrder(inputs)` in `board/focus.ts`; `buildBoard` uses it for `ReadyRow.focus` (position) and `focusLane`.
2. Move `lane()` into `cells.ts` first.
3. `otherSessions?: FocusSession[]` in `footer`.
4. `FocusRow.sessions: FocusSession[]`; no `work` until phase 4.
5. Lanes list in `BOARD_USAGE`, `SKILL.md` and `board-command.test.ts` gain `focus`.
6. Attribution reads launch titles only when `nameSource !== "derived"` (a derived name is never a launch title).

## Decisions for you

None.
