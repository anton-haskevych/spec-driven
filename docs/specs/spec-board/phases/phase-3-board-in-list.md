---
needs: [1, 2]
pr: A
---

# Phase 3 — Board in list

**Goal:** `/spec list` prints the board — in flight (ticked or half-done on a branch), ready (ranked, ★), blocked (with reasons) — built from `origin/<default>` plus every live worktree, identical from any checkout; `list table` keeps today's view and `list --json` adds a versioned `board`.

**Outcome:** One screen answers "what's where, what can I start, what waits on what" from any worktree, instead of rebuilding it per chat · ~2 s per list run (fetch + scan) · risk: the default `list` output changes.

**Files to touch:**
- `skills/spec/tools/board/inputs.ts`, `overlay.ts`, `lanes.ts`, `rank.ts`, `model.ts`, `render.ts` (new)
- `skills/spec/tools/commands/list.ts`, `spec.ts` (async `run`)
- `skills/spec/tools/tests/board-factories.ts` (new), `tests/commands-table.test.ts`
- tests: new `board-overlay.test.ts`, `board-lanes.test.ts`, `board-rank.test.ts`, `board-render.test.ts`, `board-inputs.test.ts`
- `skills/spec/list.md`, `skills/spec/SKILL.md` (*Tools* → List), `README.md`

## Implementation guidance

`design.md` → *Layers* and *The board*; `technical.md` → *BoardInputs → Board*. `loadBoardInputs` is the
only IO: fetch with a timeout, `gitTreeReader` for base, Phase 2 for workspaces, `loadBacklog` count.
Sessions, claims and PRs are empty inputs in this phase (Phase 4 and 5 fill them), so the model and
render already carry their fields. Build `Board` from typed factories in tests (no casts). Render is
asserted with exact `toBe(lines.join("\n"))` for one full board and `toContain` for state lines,
like `portfolio.test.ts`. Keep `list`'s existing behavior behind `table` and filters, so
`portfolio.test.ts` keeps passing with `table` added where needed.

## Deliverables

- [ ] `Board` model + `BOARD_VERSION` + `board-factories.ts`
- [ ] `mergeSpecViews`: done if done anywhere, `tickedIn` / `wipIn`, spec only on a branch, same phase ticked in two worktrees
- [ ] `buildBoard` lanes: in flight (wip, ticked on branch), ready, blocked with reasons, prep/create-stage specs, finished specs excluded
- [ ] `rankReady` (overdue, priority, due, unblocks, updated, name) and ★ via `overlapsWith` + `same-files-as`
- [ ] `renderBoard`: header (fetched / offline), lanes with caps and `+N more`, `◀ here`, empty lanes, footer counts
- [ ] `loadBoardInputs` with stubbed git (fetch failure → offline header) and `list` wiring: default board, `table`, lane filters, `--json` + `board`; `Command.run` async
- [ ] Real-git test: base + two worktrees; board text from the main checkout equals board text from a worktree except `◀ here`
- [ ] `list.md` §1 rewritten for the board (print as given; `table`; lanes); SKILL.md *Tools* → List; README

## Phase-local notes

- `bun test` runs in UTC and spawned git in local time: pass `now` into `buildBoard`; render `ago` from `generatedAt`.
- The `list.md` §2 no-Bun fallback stays the table.
