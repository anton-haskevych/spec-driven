---
needs: [3]
pr: C
---

# Phase 4 — Teammate's work and `--who`

**Goal:** Focus rows show who is on each spec across the team: my sessions, a teammate's remote claims
and the linked PRs labelled by author; `board focus --who <name|me>` filters to one person.

**Outcome:** You see what Taras is on (and he sees you) without asking · small · risk: a name that
matches nobody shows under two labels (documented fix: put the gh login in `who:`).

**Files to touch:**
- new: `skills/spec/tools/board/people.ts`
- `skills/spec/tools/pr/gh-lists.ts` (`author`), `pr/rollup.ts` (`PrRow.author`), `board/focus.ts` (work cells), `board/inputs.ts` + `board/load.ts` (`me`), `board/render-focus.ts`, `commands/board.ts` (`--who`)
- `skills/spec/tools/tests/fixtures/gh-pr-list-open.json` (+ `author`), `pr-gh-lists.test.ts`, `pr-rollup.test.ts`, new `board-people.test.ts`, `board-focus.test.ts`, `board-render-focus.test.ts`, `board-command.test.ts`
- `skills/spec/list.md` ("my focus", "what's <name> on")

## Implementation guidance

`technical.md` → *People*, PR author; `design.md` decisions 4, 5, 7, 11. `samePerson` is pure and
symmetric (normalize, then equal or prefix, minimum 3 characters); test it with the real pairs
("Taras Korpach" / `taraskorpach` / `taras`, `anton-haskevych` / `anton-haskevych`) and a non-match.
`me` is the git author name, loaded once in `board/load.ts` beside the claim holder read (no new
process if one already runs there).

`FocusWork` groups by person: local sessions are always `me`; remote claims by `holder.user`; PRs by
`author` (absent → no label, counted under the spec). Order me first, then others by name.

`--who` filters rows whose entry `who:` or any `FocusWork.person` matches; `--who me` uses `me`. It is
valid only with no lane or the `focus` lane; otherwise usage error.

## Deliverables

- [ ] `author` on `gh pr list` and `PrRow.author`; fixtures and field-string tests updated
- [ ] `samePerson` / normalization in `board/people.ts`, tests with real name pairs
- [ ] `BoardInputs.me` from the git author name; test
- [ ] Focus rows carry `FocusWork` per person (sessions, remote claims, PRs); render `<person>: …`; tests
- [ ] `board focus --who <name|me>` filter and usage error; tests
- [ ] `list.md`: "my focus" / "what's <name> on" → `board focus --who`

## Phase-local notes

- `decision-board-timing-accepted`: no new network call; `author` rides the existing `gh pr list`.
- No branch-to-spec mapping (ROADMAP rule): a teammate's unlinked branch stays invisible by design.
