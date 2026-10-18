---
needs: [1]
same-files-as: [3]
pr: A
---

# Phase 4 — What is X working on

**Goal:** `board --who <name|me>` opens with one person section: the specs they own (any lane), the phases they hold now on any machine, their open PRs, and for me this machine's sessions.

**Outcome:** "What is Taras working on?" gets all six of his specs and whatever he has claimed or opened, from Anton's Mac, and the same for Anton from Taras's Linux · medium · low risk: read-only view.

**Files to touch:**
- `skills/spec/tools/board/person-work.ts` (new), `board/render-person.ts` (new), `board/model.ts`
- `skills/spec/tools/commands/board.ts`, `board/render.ts`
- `skills/spec/list.md:11-12,25`

## Implementation guidance

`personWork(inputs, board, who)` in `board/person-work.ts` is pure and reads `BoardInputs`, which
holds what `Board` doesn't: spec nodes' `meta.owner` (lane state from the board), remote claims by
`holder.user`, open PRs by `author` across all specs, and `attributeSessions` for me. Don't
generalise `focusWork` (`research/…-craft-owner-split.md` → Don't extract). Drop remote claims on
phases done on base (`gotcha-remote-claims-never-read-as-done`); scope sessions to this repo
(`gotcha-session-files-span-every-repo`). `commands/board.ts` calls `loadBoardInputs` + `buildBoard`
when `--who` is set and attaches `Board.people`.

Render with `personSection(work, now)` in `board/render-person.ts`: title = the name in caps, rows
`owns` / `on now` / `PRs` (+ `sessions` for me), `—` when empty, copy in design.md. `--local` skips
claims and PRs: the section says `owns` only and notes `(--local: no claims or PRs)`.

`list.md`: "what is X on" → `board --who X`; delete the grep-the-flight-holders fallback.

## Deliverables

- [ ] `personWork`: owned specs with lane state, live remote claims, PRs by author, my sessions (unit tests from `BoardInputs` fixtures)
- [ ] `personSection` render with design.md copy; empty and `--local` cases
- [ ] `board --who X` prints the section above today's output; `--json` carries `people`; `board-command.test.ts:105` updated
- [ ] `list.md` answers "what is X on" with `board --who X`; fallback removed

## Phase-local notes

- No claim from Taras has ever reached origin (wave 1); his "on now" shows only PRs until he runs `/spec` on his machine.
