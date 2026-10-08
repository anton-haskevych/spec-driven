---
needs: [1, 2]
pr: B
---

# Phase 3 — FOCUS lane on the board

**Goal:** `/spec list` opens with a FOCUS lane. Each focus spec gets one row: progress, what is
happening now, and every session from this repo on this machine that is working on it. `other sessions`
lists the rest of this repo's sessions. Ready rows rank focus specs first, and `board focus` prints the
lane on its own.

**Outcome:** You open the board and see your shipping specs and their sessions first, in your order.
"What's next" and execute's top-ready offer recommend focus work · medium · risk: a session is
attributed to the wrong spec. The rules are ordered and conservative, and ambiguous sessions go to
"other sessions".

**Files to touch:**
- new: `skills/spec/tools/board/focus.ts`, `board/attribution.ts`, `board/render-focus.ts`
- `skills/spec/tools/board/model.ts`, `board/lanes.ts` (one call + `ReadyRow.focus`), `board/rank.ts`, `board/render.ts` (`LANES`, header, sections, ready note), `board/inputs.ts` + `board/load.ts` (`worktreePaths`), `commands/board.ts`, `sessions/live.ts` (`nameSource`, `updatedAt` read flag)
- `skills/spec/tools/tests/board-factories.ts` (`board()` / `boardInputs()` defaults), new tests `board-focus`, `board-attribution`, `board-render-focus`; `board-rank.test.ts`, `sessions-live.test.ts`, `context.test.ts`
- `skills/spec/list.md`, `skills/spec/SKILL.md` (*Tools* → List, Board), `skills/spec/execute.md`, `README.md`

## Implementation guidance

The spec is in `technical.md` → *Board model*, *Builder and attribution*, *Render*, *Ranking*. The
wireframe and copy are in `design.md`.

**The lane.**
- `focusLane` runs last in `buildBoard` and reads the finished lanes filtered by `row.spec`. Its
  per-spec data is limited to `specSummary` and `deployWaits` from phase 1. Rows come from base nodes
  with `meta.focus`.
- `now` is the first match in `design.md`'s order. That includes `paused` (paused specs are on no other
  lane) and `merging` (finished, but a linked PR is open). Specs that are `abandoned` or `good-enough`,
  or finished with no open linked PR, get no row.

**Attribution** is its own pure module, with a test per rule and per ambiguity. Run its steps in this
order:
1. Scope to this repo: keep only sessions whose cwd is inside `worktreePaths` (every `git worktree list`
   path). Test that a foreign-repo session is dropped.
2. Match by claim.
3. Match by launch title (`parseLaunchTitle` from phase 1). The spec must be a base node.
4. Match by a non-main tree that touches exactly one focus spec. Test with a dirty main checkout that
   names one spec: the session there lands in `other`. Test a launch name that disagrees with its tree:
   the name wins.

Also test: two focus specs in one tree, a free-text `-n` name, and the own session. Use
`sessionsByWorkspace` so that execute 8, 9 and 10 in one tree all show. Read `nameSource` explicitly in
`sessions/live.ts`: an unknown value is `undefined`. Mark whether `updatedAt` was read or fell back to
`startedAt`; phase 5 needs that.

**Render** goes in a new file. `render.ts` only does these things:
- adds `"focus"` first in `LANES`
- skips the section when `lanes.focus` is empty (`board focus` prints `FOCUS\n  none` instead)
- prefixes the header count
- prints `focus <n>` on ready rows

With no `focus:` anywhere, the lanes must match today. Assert it with
`renderBoard(buildBoard(boardInputs(...), NOW))` against a golden string captured from 2.36.7. A
factory-built `board()` can't catch a builder that fills `otherSessions`.

**Ranking.** `buildBoard` sets `ReadyRow.focus`. `rankReady` sorts focus rows before every other row,
ordered among themselves by focus rank. The rest of the order is unchanged (`board-rank.test.ts`). Pin
the new top-ready behaviour in `context.test.ts` (`OFFER_TOP_READY`).

## Deliverables

- [ ] `nameSource` and the `updatedAt`-read flag in `sessions/live.ts`, test
- [ ] `worktreePaths` on `BoardInputs` (every worktree, not just live ones), test
- [ ] `attributeSessions`: repo scope, then claim → launch title → non-main tree touching one focus spec; `{ bySpec, unattributed }`; tests per rule and ambiguity
- [ ] `focusLane`: rows (progress, stage, due/overdue, `now` incl. `paused` / `merging`, sessions) + `otherSessions`; tests
- [ ] Model fields (`lanes.focus`, `footer.otherSessions`, `ReadyRow.focus`) with factory defaults; `BOARD_VERSION` stays 1
- [ ] Render: FOCUS lane, header count, `other sessions` line, ready `focus <n>` note; golden "no focus" test; `board focus` lane word and empty `none`; tests
- [ ] `rankReady` puts focus rows first by focus rank; `board-rank` + `context` tests
- [ ] Prose: `list.md` lane description, `SKILL.md` *Tools* (List, Board), `execute.md` top-ready note, `README.md`

## Phase-local notes

- `ledger/principle-session-attribution-scope-and-order.md`: the repo scope, the main-checkout exclusion and the rule order are load-bearing.
- `gotcha-board-workspaces-are-live-only`: merged-and-clean trees aren't in `inputs.workspaces`, which is why the repo scope uses `worktreePaths`.
- `decision-tree-held-by-work`: an idle session without a claim is a controller tab; show it, never flag it.
- `decision-prs-and-sessions-join-shape`: tests that run `loadBoard` without `--local` need a temp `claudeHome` and `cannedGh`.
