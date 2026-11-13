# In-flight state

**Session ended:** 2026-11-13
**Active phase:** 11 — Academy's board moves over

## Where things stand

- Nothing imported, nothing retired. Stopped before the import: CRM's record already holds c1–c3 (made
  2026-11-13: spec cards for one-attendance-engine and staff-ios-app-device-support-and-diagnostics, and c3
  "Print button on the website schedule widget (Dance Nashville)", promised, due 2026-11-14), and `card add`
  can't keep a number. Phase 10a (`card load --file --move-taken`) was added for it; phase 11 now needs 10a.
- Academy on 2026-11-13 18:59 +0200: 99 cards (ids `c01`…`c104`, zero-padded, gaps), 442 sources in
  `card_sources/s<NN><letter>.json` (`card_id`, `occurred_at`, `person`, `app`, `quote`, `ref`, `ref_url`,
  `role`), 26 groups (`name`, `spec`, `summary`, `priority` P0–P3, `priority_note`, `order`). Cards carry
  `assignee`, `note`, `order`, `source`, `status`, `tags`, `title`.

## Implicit context

- Anton, 2026-11-13, asked how to keep numbers: "Ideally, I would love to import the whole Academy board with
  all of the items that are currently on there to join the board that you just created for this spec plugin.
  That's my vision. Also, I would love to start porting the existing CRM Dance specs on there." Read as: keep
  Academy's numbers, move CRM's few cards up, and join CRM specs after the import (task 11.6).
- CRM specs keep joining on their own (any 2.53+ session); each new spec card takes the next number, so the
  set of CRM cards that `--move-taken` moves grows until the import runs.

## Pick up from here

- After 10a merges: tell Taras to stop writing to academy-board, clone it fresh, write the CRM one-off
  mapping script (phase guidance → Mapping) that emits one `card load` file, run it, then `card check`.
