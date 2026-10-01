---
needs: []
pr: A
---

# Phase 1 — Board from main

**Goal:** `/spec list` prints a ready and blocked board across every spec, read from `origin/<default>`
through a `git archive` cache, so it's identical from any checkout. `list <filter>` and `list table` keep
today's table. `spec.ts board [<lane>] [--json] [--local]` serves lanes and agents.

**Outcome:** "What can I start next, and what waits on what" is answered on one screen from any
worktree, ranked across specs, instead of being rebuilt per chat · ~1 s cold, under 0.5 s warm ·
risk: the default `list` output changes.

**Files to touch:**
- `skills/spec/tools/core/run.ts` (`RunOptions.timeoutMs`), `core/schedule.ts` (`compareSchedule`), `portfolio/order.ts`
- `skills/spec/tools/mainline/base-cache.ts`, `mainline/load.ts` (new)
- `skills/spec/tools/board/model.ts`, `inputs.ts`, `lanes.ts`, `rank.ts`, `render.ts` (new)
- `skills/spec/tools/commands/list.ts` (`portfolioTable` + board default), `commands/board.ts` (new), `spec.ts` (async `run`, command table)
- `skills/spec/tools/tests/board-factories.ts` (new), `tests/commands-table.test.ts`, `portfolio.test.ts`
- tests: new `mainline-base-cache.test.ts`, `board-lanes.test.ts`, `board-rank.test.ts`, `board-render.test.ts`, `board-inputs.test.ts`
- `skills/spec/list.md`, `skills/spec/SKILL.md` (*Tools* → List, Board), `README.md`

## Implementation guidance

See `technical.md` → *mainline*, *Lanes*, *Rank*, *Model*, *Commands*.

**Base cache.** Run `git archive -o <tmp>.tar` with the read-set patterns that match a path (an empty
pattern makes archive exit 128), extract with `Bun.Archive`, then rename the folder to `base/<sha>/`
under the common dir. Never pipe the archive through `Runner`, which decodes
stdout. The base dir is a project dir: `loadNodes`, `listSpecs` + `loadSpecState`, `loadBacklog` and
`loadSettings` all run on it unchanged. The fetch reuses `pinDefault` with the new `timeoutMs`.

**Preflight amendments** (`research/phase-1/2026-10-01-1-5-preflight.md`): `baseCache` / `loadMainline`
are async; `loadMainline` returns prep/create `stages`; `phaseDependencies` is extracted from
`ready/ready-set.ts` for "unblocks"; needs-you lives in `board/attention.ts`.

**Lanes in this phase.** Only ready, blocked and needs-you (overdue, deploy waited on) are filled. The
model and render already carry the in-flight lane and its fields, which Phase 3 fills. Rows carry
`target` from day one. Build `Board` from typed factories in tests, with no casts.

**Render.** Assert with an exact `toBe(lines.join("\n"))` for one full board, and `toContain` for state
lines, like `portfolio.test.ts`. Pad columns with `Bun.stringWidth`.

**Commands.** Rename today's list body to a sync `portfolioTable(projectDir, args, today)`, so the
portfolio tests change only the function name. `listCommand` dispatches: no args → board, anything
else → table.

## Deliverables

- [x] `RunOptions.timeoutMs` passed to `spawnSync`'s `timeout`; `compareSchedule` shared by `orderSpecs` / `orderBacklog` (existing portfolio tests pass)
- [x] `baseCache`: read-set pathspec for both spec roots; extract into a temp dir, then rename (a concurrent extract of the same sha is safe); keep the newest 2. One `repoWithOrigin` real-git test: both roots, a pointer outside `phases/`, `pr-opening.md` present, `research/` absent
- [x] `loadMainline`: `pinDefault` with timeout; offline / busy / local fall back to the local ref; no origin ref → board unavailable
- [ ] `Board` model + `BOARD_VERSION` + `board-factories.ts`; `buildBoard` ready / blocked / prep- and create-stage specs / finished and paused specs left out / needs-you overdue and deploy
- [ ] `rankReady` (overdue, priority, due, unblocks, updated, name)
- [ ] `renderBoard`: header modes, lanes with caps and `+N more`, empty lanes, footer counts; `ago` via `Intl.DurationFormat` narrow
- [ ] `list` (no args → board, in a code fence; filters and `table` → `portfolioTable`; failure → table + reason), `board [<lane>] [--json] [--local]`; `Command.run` async
- [ ] `list.md` §1 (board; filters → table; lane words → `board <lane>`), SKILL.md *Tools* → List + Board, README

## Phase-local notes

- `bun test` runs in UTC and spawned git in local time. Pass `now` into `buildBoard`, and render
  `ago` and dates from parsed `Date`s with a fixed `now` (project ledger).
- The `list.md` §2 no-Bun fallback stays the table.
- Code under test that spawns git takes `isolatedRunner` (project ledger).
