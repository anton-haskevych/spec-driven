---
needs: [1, 2]
pr: B
---

# Phase 3 — FOCUS lane on the board

**Goal:** `/spec list` opens with a FOCUS lane: one row per focus spec with progress, what is happening
now and every session on this machine working on it; `other sessions` lists the rest; ready rows rank
focus specs first; `board focus` prints the lane alone.

**Outcome:** You open the board and see your shipping specs and their sessions first, in your order;
"what's next" recommends focus work · medium · risk: a session attributed to the wrong spec (rules are
ordered and conservative; ambiguous ones go to "other sessions").

**Files to touch:**
- new: `skills/spec/tools/board/focus.ts`, `board/attribution.ts`, `board/render-focus.ts`
- `skills/spec/tools/board/model.ts`, `board/lanes.ts` (one call), `board/rank.ts`, `board/render.ts` (`LANES`, header, sections), `commands/board.ts`, `sessions/live.ts` (`nameSource`)
- `skills/spec/tools/tests/board-factories.ts` (`board()` / `boardInputs()` defaults), new tests `board-focus`, `board-attribution`, `board-render-focus`; `board-rank.test.ts`, `sessions-live.test.ts`
- `skills/spec/list.md`, `skills/spec/SKILL.md` (*Tools* → List, Board), `README.md`

## Implementation guidance

`technical.md` → *Board model*, *Builder and attribution*, *Render*, *Ranking*; wireframe and copy in
`design.md`. `focusRows` runs last in `buildBoard` and reads the finished lanes filtered by `row.spec`;
it adds no per-spec state of its own beyond `phaseProgress` and `deployWaits` (phase 1). `now` is the
first match in `design.md`'s order.

Attribution is its own pure module with a test per rule and per ambiguity (two specs in one tree,
derived name, free-text `-n` name, own session). Use `sessionsByWorkspace` (phase 1) so execute 8, 9
and 10 in one tree all show. Read `nameSource` explicitly in `sessions/live.ts`; an unknown value is
`undefined`, and rule 3 then still requires the launch grammar.

Render in a new file; `render.ts` only adds `"focus"` first in `LANES`, skips the section when
`lanes.focus` is empty, and prefixes the header count. With no focus entries the whole board must be
byte-identical to today: assert that in `board-render-focus.test.ts` against the existing full-board
fixture.

Ranking: a focus spec's ready rows sort before every non-focus row, among themselves by focus rank;
the rest of `rankReady` is unchanged (`board-rank.test.ts`).

## Deliverables

- [ ] `nameSource` read in `sessions/live.ts` (`user` / `derived` / undefined), test
- [ ] `attributeSessions` with rules 1–3 and `other`, tests per rule and ambiguity
- [ ] `focusRows`: progress, stage, due/overdue, `now` (flight → ready → deploy → blocked → branch-only → unknown), sessions; finished specs skipped; tests
- [ ] Model fields (`lanes.focus`, `footer.otherSessions`) with factory defaults; `BOARD_VERSION` stays 1
- [ ] Render: FOCUS lane, header count, `other sessions` line; empty set → output unchanged; `board focus` lane word; tests
- [ ] `rankReady` puts focus specs first by focus rank; test
- [ ] Prose: `list.md` lane description, `SKILL.md` *Tools* (List, Board), `README.md`

## Phase-local notes

- `gotcha-board-workspaces-are-live-only`: merged-and-clean trees aren't in `inputs.workspaces`; a session there falls to rule 3 or `other`.
- `decision-tree-held-by-work`: an idle session without a claim is a controller tab; show it, never flag it.
- `decision-prs-and-sessions-join-shape`: tests that run `loadBoard` without `--local` need a temp `claudeHome` and `cannedGh`.
