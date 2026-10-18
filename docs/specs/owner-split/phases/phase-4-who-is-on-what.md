---
needs: [3]
pr: A
---

# Phase 4 — What is X working on

**Goal:** `board --who <name|me>` opens with one person section: the specs they own (any lane), the phases they hold now on any machine, their open PRs, and for me this machine's sessions.

**Outcome:** "What is Taras working on?" gets all six of his specs and whatever he has claimed or opened, from Anton's Mac, and the same for Anton from Taras's Linux · medium · low risk: read-only view.

**Files to touch:**
- `skills/spec/tools/board/render-person.ts` (new), `board/model.ts`, `board/people.ts`, `board/load.ts`
- `skills/spec/tools/commands/board.ts`, `board/render.ts`
- `skills/spec/list.md:11-12,25`

## Implementation guidance

Build the section's data in `boardFor` (or a sibling in `people.ts`) from what the board already
holds: spec nodes' `meta.owner` with their lane state, `remoteHeldClaims` by `holder.user`, open
PRs by `author` across all specs (not only focus-linked), and `attributeSessions` for me. Don't
generalise `focusWork` (`research/…-craft-owner-split.md` → Don't extract). Drop remote claims on
phases done on base (`gotcha-remote-claims-never-read-as-done`); scope sessions to this repo
(`gotcha-session-files-span-every-repo`).

Render with `personSection(board, now, who)` in `board/render-person.ts`, title = the name in
caps, rows `owns` / `on now` / `PRs` (+ `sessions` for me), `—` when empty, copy in design.md.
`--local` skips claims and PRs: the section says `owns` only and notes `(--local: no claims or PRs)`.

`list.md`: "what is X on" → `board --who X`; delete the grep-the-flight-holders fallback.

## Deliverables

- [ ] Person data under `--who`: owned specs with lane state, live remote claims, PRs by author, my sessions (`board-people.test.ts`, `board-focus.test.ts` fixtures)
- [ ] `personSection` render with design.md copy; empty and `--local` cases
- [ ] `board --who X` prints the section above the filtered lanes; `--json` carries `people`
- [ ] `list.md` answers "what is X on" with `board --who X`; fallback removed

## Phase-local notes

- No claim from Taras has ever reached origin (wave 1); his "on now" shows only PRs until he runs `/spec` on his machine.
