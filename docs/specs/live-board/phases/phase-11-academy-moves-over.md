---
needs: [8]
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
(wave 1 → *The Academy board as built*). The import is a one-off script in the CRM repo that reads that repo
and calls `spec.ts card …` in batches; it ships in a CRM PR, not in the plugin.

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

- [ ] The import has run: 90 cards, 399 sources and the groups are on CRM's board with their numbers, and `card check` is clean
- [ ] Gate: Anton confirms the Academy tag view reads right
- [ ] The Academy skill uses the card commands; its MCP server, scripts and `ops/src/academy-board/` are removed in a merged CRM PR
- [ ] `CRM-Dance/academy-board` is archived read-only
- [ ] Taras's Claude has read the Academy tag view and added a source to a card

## Phase-local notes

- Card references in CRM spec docs (about 19 folders mention cards in prose) need no edit: numbers are kept.
- The frozen claude.ai artifact from before 2026-11-03 stays retired; nothing reads it.
