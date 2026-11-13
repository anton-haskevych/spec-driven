# In-flight state

**Session ended:** 2026-11-13
**Active phase:** 11 — Academy's board moves over

## Where things stand

- Import done and ticked (11.1): academy-board 2c92ff4 → CRM record, 99 cards with their numbers, 442 sources,
  26 tags; CRM's c1–c3 → c105–c107; `card check` clean. Academy's next card is c108. Tag `Academy Ballroom` is
  P0 (customer); scope tags carry the group's priority and plain summary.
- CRM branch `feat/academy-board-moves-over` (tree `~/claude-worktrees/crm/academy-board-moves-over`, commit
  86b67db8b4) is pushed, no PR yet: skill + promise audit on `card` commands, MCP server / `pnpm board*` /
  `ops/src/academy-board/` removed, lockfile -3 lines, `scripts/academy-board-to-record.ts`, journal entry,
  `board.people: [Anton, Taras]` in CRM settings.
- Anton, 2026-11-13: "Design fixes must come before opening the PR" → phase 10aa (page fixes, PR J) launched in
  `live-board-pr-j`; phase 11 needs 10aa.

## Implicit context

- Closed cards can't be edited, so the ~23 "done, but <spec>#<phase> is open" rows can only go through 10aa's rule
  change, not data.
- Taras hasn't been told to stop writing to academy-board yet (Anton's to do). Before archiving, diff that repo
  against 2c92ff4 and bring any later write over with `card source` / `card update` (never re-type a quote).

## Pick up from here

1. After 10aa merges and 2.60+ is installed: re-check CRM's page (chrome-devtools, 1440 and 390 px), get Anton's
   gate word on the Academy view, tick 11.2 with it.
2. Merge origin/main into the CRM branch, run the `pre-pr` gate for ops, ask the PR question, open the draft.
3. After merge: diff academy-board past 2c92ff4, then `gh repo archive CRM-Dance/academy-board` (Anton's word).
4. Taras's Claude reads the Academy tag and adds a source (11.5); CRM specs joining after the import (11.6).
