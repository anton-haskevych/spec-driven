---
needs: [4]
same-files-as: [7]
pr: E
---

# Phase 8 — Cards, sources and tags

**Goal:** Claude can record what someone wants as a card with its quoted sources and tags, link it to the spec
or phases that cover it, and close it with evidence; ideas are cards; every spec has a card.

**Outcome:** the reason for a piece of work, in the customer's own words, sits next to its progress, for any
customer or topic. The Academy board keeps working as it is until phase 11 · large · low risk: new documents
and commands, nothing existing changes shape except ideas.

**Files to touch:**
- `skills/spec/tools/cards/` (new: `card-doc.ts`, `source-doc.ts`, `tag-doc.ts`, cover, close),
  `commands/card.ts` + `commands/card/<action>.ts` (new), `spec.ts`, `record/layout.ts`, `plan/kinds.ts`
- `skills/spec/tools/backlog/items.ts`, `doctor/backlog-item.ts`, `board/lanes.ts`, `board/render.ts`,
  `commands/list.ts`, `context/packs.ts`, `graph/nodes.ts`, `core/schedule.ts`, `playbook/settings.ts`
- `skills/spec/idea.md`, `list.md`, `prep.md`, `create.md`, `SKILL.md`

## Implementation guidance

The document rules come from the Academy board (`ops/src/academy-board/board-schema.ts` and the skill's rules
in the CRM repo; wave 1 → *The Academy board as built*): a quote is verbatim and never edited, a card has
exactly one `origin` source, `due` is a decided date or absent, and a card is never deleted (it is closed or
dropped). Leave behind what that data showed as smells: no `Shipped` tag (it is status `done`), no `order`
field, no sub-projects (a sub-project was a spec), one spelling per person: `board.people` is the list of
display names, and an assignee is matched to it with `samePerson` (`core/people.ts:17`), the matcher owners
already use.

A card number is taken inside the plan function: it reads the highest number at the fresh tip and creates the
next, so two sessions adding at once both land with different numbers and no retry loop of the command's own.
`card add` refuses offline: Claude quotes the number at once, and a queued card could come back with another.
The origin source is written in the same batch as its card, and a second `role: origin` is refused, so "exactly
one origin" holds without a cross-document check. Sources nest under their card so a card's history reads as
one folder.

`backlog/` folds into `cards/`: one folder for one concept (`design.md`: "card" everywhere).

`card cover <id> <spec | spec#phases>` stores the link on the card only, using the ref grammar that
`graph/relations.ts:34-46` already parses. The spec side is computed: a pack for a joined spec lists its
covering cards with each origin quote, which is how a session reads the business need without leaving the spec.

Closing: `card close` requires evidence (a merged commit, a data check, the assignee's word). The board
proposes a close when every covering phase is `merged`, and flags a card marked done while a covering phase is
open (wave 1: c38 read as open nine hours after it was demoed).

Ideas: `/spec idea` writes a card with `commitment: idea` and nothing covering it. A file in
`docs/specs/_backlog/` becomes a card the next time it is touched (promoted, closed, dropped or re-prioritised);
untouched files stay and are still listed. Prep makes a card for a spec that none covers, and join does the same
for an existing spec, carrying its priority and due date. From here a spec's priority and due date are read from
its cards; `p0` is added to `PRIORITIES` in `core/schedule.ts:3`, not declared as a second scale.

All of this applies with `board.record` on. With it off, `/spec idea`, prep and the list work from
`_backlog/` files exactly as today.

**This release moves data joined specs already hold in files.** Raise `RECORD_LAYOUT` to 4. The upgrade step
makes the covering card for a spec joined earlier, with its priority and due date, on its next touch; until
then the spec's own fields are read.

## Deliverables

- [x] `card-doc`, `source-doc`, `tag-doc` readers with the Academy rules; `card check` reports cross-document problems and runs in the doctor
- [x] `spec.ts card add | update | source | list`; the number is taken in the plan (two clones adding at once get c97 and c98); `card add` refuses offline; the origin source lands in the card's batch; an assignee resolves through `samePerson` to a `board.people` name
- [x] `card cover`: link stored on the card, validated against the record; packs list a joined spec's covering cards with their origin quotes
- [x] `card close` with evidence and `card drop`; the board proposes a close when every covering phase is merged and flags a done card with an open phase
- [x] `card tag`; one priority scale `p0`–`p3` (`PRIORITIES`) on cards and tags; the list view groups by tag
- [x] With the board on, `/spec idea` writes a card; a `_backlog` file becomes a card when next touched; the list shows cards and remaining files together; with it off nothing changes
- [x] Prep and join make a card for a spec that none covers; a spec's priority and due date come from its cards
- [x] Layout 4: a spec joined earlier gets its card on its next touch; until then its own priority and due date are read
- [ ] `idea.md`, `list.md`, `prep.md`, `create.md`, `SKILL.md` updated; ROADMAP row and version bump for PR E

## Phase-local notes

- The plugin stays domain-free: the promise audit, the source apps to check and customer rules remain in the
  project's own skill (out of scope in the brief).
- Never put contact details in a card or source; carry the Academy rule into the reader's problems.
