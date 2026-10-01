---
needs: [5]
pr: B
---

# Phase 6 — Loop wiring

**Goal:**
- Handoff ends with the board's top 3 ready phases and the needs-you items.
- Execute with no spec named and none inferred offers the top ready row.
- `launch execute <spec> <phase>` opens a session on a chosen board row, in that row's workspace or in a
  new worktree.

**Outcome:** "What next" arrives at the end of every session, and "start 1 and 2" is one step with each
session in its own tree, so Anton never rebuilds the picture by hand · small doc and launch changes ·
low risk.

**Files to touch:**
- `skills/spec/tools/launch/command-line.ts` (phase hint, `--in <workspace>`, `claude -w`), `commands/launch.ts`, `tests/launch.test.ts`
- `skills/spec/tools/commands/context.ts` (line ~33: the nothing-named message)
- `skills/spec/handoff.md` (final block; line 172), `skills/spec/execute.md` (§0.2 nothing named)
- `skills/spec/SKILL.md` (line ~32 no-spec rule; *Tools* → Launch), `skills/spec/list.md` (launching rows), `README.md`, `ROADMAP.md`

## Implementation guidance

See `technical.md` → *Commands* and *Integration points*.

**Reading the board.** Every flow reads `spec.ts board --json`; none re-derives lanes.
- Execute's no-spec-named path uses `--local`: no fetch, no gh.
- Handoff uses the full board. It runs after Commit and publish, so its fetch doesn't race them.

**Handoff block.** Keep `Unblocked:` from `spec.ts graph`, and add `Ready next:` and `Needs you:`.
Amend line 172 ("Do not suggest further work") to allow those lines.

**Launch.** It validates the phase id with the same rule as chunk hints and puts the phase in the
title, so `claude -n` names stay distinct; they become claim `sessionName`s. Which form it runs depends
on the row's `target`:

| Row target | Launch |
|---|---|
| A workspace | `cd <workspace> && claude …` |
| A new worktree | `claude -w <spec>-<phase> …` from the project dir (the user's WorktreeCreate hook places it) |

**Starting rows from the board.** `list.md` tells Claude to "start N" rows by passing each row's target.

## Deliverables

- [ ] `launch execute <spec> <phase> [--in <workspace>]`: `cd` form with `--in`, `claude -w <spec>-<phase>` form without; title carries the phase; bad phase id refused
- [ ] `handoff.md` final block: `Ready next:` top 3 and `Needs you:` from the board; line 172 amended
- [ ] Nothing named and nothing inferred → offer the top ready row: `commands/context.ts` message, SKILL.md no-spec rule, `execute.md` §0.2
- [ ] `list.md` "start N" → launch per row with its target; SKILL.md *Tools* → Launch, README *Session lifecycle and tools*, ROADMAP row
