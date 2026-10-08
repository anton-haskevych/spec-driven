# Phase 4 preflight — teammate's work and `--who` (2026-10-07)

Inputs: `phases/phase-4-teammate-work.md`, `research/phase-4/2026-10-07-teammate-work-recon.md`, `principles.md`.

## Findings that change the plan

1. **`technical.md` puts `sessions` inside `FocusWork`; the code and ledger keep them on the row.**
   `board/model.ts:99-108` has `FocusRow.sessions`, and `ledger/decision-focus-row-sessions-stay-on-the-row.md`
   fixes that. `FocusWork` is `{ person, mine, claims, prs }`; the me bucket's sessions are `row.sessions`,
   merged at render time and counted by `focusFor`. The phase deliverable ("sessions, remote claims, open
   PRs") is met by row + work together.
2. **Remote claims need the board's "shown" filter.** `inputs.claims` holds remote claims for phases already
   done on base (`claims/held.ts` → status `remote`, never `done`). `oldRemoteClaims` (`board/attention.ts:43-47`)
   keeps only those whose row key is in flight. Use the same rule (`focusLane` already receives
   `lanes.inFlight`), or finished phases show as claims.
3. **`me` is needed at build time, not only on the model.** Bucketing (`samePerson(me)`) runs inside
   `focusLane`, reached from `buildBoard` (`board/lanes.ts:38`, called only from `board/load.ts:39`).
   `buildBoard(inputs, now, me?)` — optional, so the ~20 test callers stay unchanged.
4. **Git author parsing exists once already** (`claims/remote.ts:21-25`). Extract `authorName(git)` to
   `core/git.ts` with its own test; `readHolder` keeps its `unknown` fallback.

## Clean Code / SOLID against the unit

| Rule | Verdict | Consequence |
|---|---|---|
| Pure functions (principle 3) | Bites | `samePerson`, `personKey`, `focusWork` bucketing, `focusFor` are pure in `board/people.ts`; the only I/O is one `git var` in `loadBoard` |
| Size caps (5) | Bites | `focus.ts` 122 lines: bucketing lives in `people.ts`, `focus.ts` only calls it. `render-focus.ts` 70 → ~110 |
| Second use (9) | Bites | `authorName` (finding 4); `prCell` and `ago` from `cells.ts` reused in the who cell, not re-written |
| Names | Bites | `person` (not `owner`, which `ownerOf` means a path's worktree; design decision 4) |
| Validate at boundaries (12) | Bites | `PrRow.author` read once in `toPrRow` via `isRecord` + `stringField`; renderer trusts it |
| SRP | Bites | `commands/board.ts` parses and filters; the filter itself is `focusFor`, tested without git |
| OCP / LSP / ISP | Inert | |
| DIP | Inert | git reached through the existing `Git` port |
| Clean Architecture | Inert beyond the above: model → render direction unchanged |
| DDD | Skipped | tooling, no domain model |

## Guard blindness

None claimed. The field-string test (`tests/pr-gh-lists.test.ts:17`) does observe `OPEN_FIELDS`; update it.

## Testing deltas vs recon

- Remote claims in tests: `heldClaim("remote", …)` plus `holder`, and the phase must be in flight (a
  claim makes it so: `board-focus.test.ts:49-50`).
- `board-command.test.ts` repo has no `focus:` spec; add one to test `--who` end to end.

## Amendments

1. `FocusWork = { person, mine, claims: { phase, since }[], prs: PrCell[] }`; `FocusRow` gains `owner?`,
   `work`, `unattributedPrs`. Sessions stay on the row.
2. Remote claims counted only when their row is in flight (finding 2).
3. `buildBoard(inputs, now, me?)`; `loadBoard` reads `authorName(git)` and passes it; `Board.me` only when known.
4. Display: others by `personKey`; me by `personKey(me)`, or `me` when the git name is unknown.
5. `--who` matching uses `samePerson` (so `--who taras` finds `taraskorpach`); `--who me` (or a name that
   `samePerson(me)` matches) also counts `row.sessions`. `otherSessions` stays only for `--who me`.
6. `BOARD_USAGE` gains `[--who <name|me>]`; a lane other than `focus` with `--who` returns `usage: …`.

## Decisions for you

None.
