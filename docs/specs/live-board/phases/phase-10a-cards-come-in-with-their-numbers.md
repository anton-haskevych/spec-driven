---
needs: [8]
pr: I
---

# Phase 10a — Cards come in with their numbers

**Goal:** a prepared file of cards, sources and tags lands on the record under the ids it names, in one batch.

**Outcome:** a whole board, Academy's first, comes onto the record with every card number it already had, so references in chats and specs keep pointing at the right card · half a day · the risk is a move that leaves a source under its old number, so check runs in the same batch

**Files to touch:**
- `skills/spec/tools/commands/card.ts`, `commands/card/load.ts` (new)
- `skills/spec/tools/cards/load.ts` (new: the pure plan)
- `skills/spec/SKILL.md` → *Tools* → Cards

## Implementation guidance

Found while starting phase 11 (2026-11-13): `card add` always takes `nextCardId(view)`, so it can't keep a
number, and Academy's numbers have gaps (99 cards over c01–c104). CRM's record also already holds c1–c3, made
on 2026-11-13 (two spec cards and c3, a Dance Nashville promise due 2026-11-14), and more spec cards arrive as
specs join. Anton (2026-11-13): "Ideally, I would love to import the whole Academy board with all of the items
that are currently on there to join the board that you just created for this spec plugin."

- The file holds record documents already in their final shape (`card-doc`, `source-doc`, `tag-doc`), keyed by
  id. The plugin stays domain-free: mapping Academy's fields is phase 11's one-off CRM script, not this command.
- One `writeRecord` plan at the tip, validated with `validateRecordDoc`, then `cardProblems` over the result
  (a source's card exists, one origin per card) before it is sent; re-planned per tip like every write.
- Never queued, like `card add`: the numbers are quoted at once.
- `--move-taken`: an existing card whose id the file uses moves to the next free number above everything in the
  file and the record, with its sources (`cardId` rewritten) and covers intact; the old path then holds the
  file's card. Without the flag a taken id refuses the whole load and names the ids.
- Ids are compared by number (`c01` and `c1` are the same card); written ids use the record's form (`c1`).
- Big enough for ~100 cards and ~450 sources in one commit; split into batches only if a push proves too large.

## Deliverables

- [x] card load --file <docs.json> writes prepared cards, sources and tags under their own ids in one validated batch at the tip, refusing an id already taken
- [x] card load --move-taken renumbers the existing cards whose ids the file uses (with their sources) to the next free numbers above the file's, and prints each old → new
