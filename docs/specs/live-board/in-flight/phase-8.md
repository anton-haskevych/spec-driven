# In-flight state

**Session ended:** 2026-11-13
**Active phase:** 8 — Cards, sources and tags

## Where things stand

- Deliverables 1–5 are built, tested and pushed: documents and `card check` in the doctor; `card add | update |
  source | cover | close | drop | tag | list | check`; packs list covering cards; the board proposes closes and
  flags done cards over open phases. `ledger/decision-phase-8-cards-as-built.md` says what each piece is.
- Open: deliverables 6–9 — `/spec idea` writes a card with the board on; a `_backlog` file becomes a card when
  next touched; the list (`commands/list.ts`) shows cards and remaining files together; prep and join make a
  card for an uncovered spec; a spec's priority and due date come from its cards (`graph/nodes.ts`,
  `core/schedule.ts`); `CARDS_LAYOUT = 4` in `record/layout.ts` with one more step in `plan/upgrade.ts`; the five
  mode docs, ROADMAP row and version bump for PR E.
- `SKILL.md`, `idea.md` and `create.md` still say `priority: p1 | p2 | p3`; `p0` is now on the scale. Fix with
  the docs deliverable.

## Implicit context

- This repo's board is off (`join live-board` refuses), so live-board itself stays in files.
- `bun install` was run at the repo root for `bun run typecheck` (node_modules is gitignored).

## Pick up from here

- Deliverable 6: `skills/spec/tools/backlog/items.ts` + `commands/list.ts` — read cards with `cardRows` beside
  `loadBacklog`, and make `idea.md`'s capture call `card add --commitment idea` when `board.record` is on.
