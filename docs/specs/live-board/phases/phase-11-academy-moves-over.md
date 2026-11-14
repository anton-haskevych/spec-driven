---
needs: [8, 10a, 10aa]
code: false
gate: outward
---

# Phase 11 — Academy's board moves over

**Goal:** the Academy Ballroom board's cards and sources are on CRM's one board under an Academy Ballroom tag,
the Academy skill works against it, and the separate board repo is retired.

**Outcome:** one board for all of CRM Dance; Academy is a tag view. Card numbers stay, so every reference in
chats, specs and seeds still points at the right card · an afternoon · the risk is losing a quote, so the import
is checked by count and by `card check` before anything is retired.

## Implementation guidance

The source is the private repo `CRM-Dance/academy-board`: 90 cards, 399 sources and 24 groups when measured
(wave 1 → *The Academy board as built*); 99 cards (c01–c104, with gaps), 442 sources (`card_sources/`) and
26 groups on 2026-11-13, still being written by Taras. The import is a one-off script in the CRM repo that
maps that repo into one file of record documents and lands it with phase 10a's `card load --file
--move-taken`; it ships in a CRM PR, not in the plugin. `card add` can't be used: it always takes the next
number. CRM's record already has c1–c3 (2026-11-13), which move to the first free numbers after Academy's.

Order on the day: tell Taras to stop writing to `academy-board`, run the import from a fresh clone, then
`card check`; join CRM specs only after it, so their spec cards number after Academy's.

Mapping:
- card → card, same number; `status` todo/doing/done → open/doing/done; `urgent` → `p0`; `assignee` and
  `claimed_by` → assignee.
- every card gets the tag `Academy Ballroom`; its old scope tags stay as tags; the tag `Shipped` is dropped
  (those cards are `done`).
- group → tag, with its priority (`P0` → `p0`) and summary; its `projects` are dropped (each named a spec).
- source → source, unchanged; quotes are never re-typed.
- a note starting `Spec: <name>` → a covering link, with phases when the note names them; 50 notes name 30
  specs, all of which exist. A note starting `Backlog:` → a link to that idea's card once it exists.
  The rest of the note stays as the card's note.

Then the Academy skill in CRM (`.claude/skills/academy-ballroom-board/SKILL.md`) is pointed at the card
commands, keeping its own rules (promise audit, deadline rules, sources to check), and the `academy-board` MCP
server, `pnpm board` scripts and `ops/src/academy-board/` are removed in the same CRM PR. The old repo is
archived, not deleted.

## Deliverables

- [x] The import has run: 90 cards, 399 sources and the groups are on CRM's board with their numbers, and `card check` is clean — 2026-11-13: academy-board 2c92ff4 → CRM record ff131e652a: 99 cards (c01–c104 kept), 442 sources, 26 tags; CRM c1–c3 → c105–c107; card check clean
- [x] Gate: Anton confirms the Academy tag view reads right — Anton, 2026-11-13: "everything is aweomse and looks great" (CRM page on 2.60.0; screenshots in research/phase-11/)
- [x] The Academy skill uses the card commands; its MCP server, scripts and `ops/src/academy-board/` are removed in a merged CRM PR — CRM PR #1260 merged 2026-11-14 (df1ef19df9), merged by Anton
- [x] `CRM-Dance/academy-board` is archived read-only — Archived 2026-11-13 on Anton's word; still at 2c92ff4, no writes after the import
- [ ] Taras's Claude has read the Academy tag view and added a source to a card
- [ ] CRM's open specs start joining the board after the import, so their cards number after Academy's (Anton, 2026-11-13: "start porting the existing CRM Dance specs")

## Phase-local notes

- Card references in CRM spec docs (about 19 folders mention cards in prose) need no edit: numbers are kept.
- The frozen claude.ai artifact from before 2026-11-03 stays retired; nothing reads it.
