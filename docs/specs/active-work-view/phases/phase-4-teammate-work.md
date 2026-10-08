---
needs: [3]
pr: B
---

# Phase 4 — Teammate's work and `--who`

**Goal:** Focus rows show who across the team is on each spec: my sessions, a teammate's remote claims,
and the open linked PRs labelled by author. `board focus --who <name|me>` filters to one person, in both
JSON and text.

**Outcome:** You see what Taras is on, and he sees what you're on, without asking · small · risk: a
teammate whose git name and gh login share no prefix shows under two names (harmless, documented).

**Files to touch:**
- new: `skills/spec/tools/board/people.ts`
- `skills/spec/tools/pr/gh-lists.ts` (`author`), `pr/rollup.ts` (`PrRow.author`), `board/focus.ts` (work buckets), `board/load.ts` (`me` in `loadBoard`), `board/model.ts` (`Board.me`), `board/render-focus.ts`, `commands/board.ts` (`--who`)
- `skills/spec/tools/tests/fixtures/gh-pr-list-open.json` (+ `author`), `pr-gh-lists.test.ts`, `pr-rollup.test.ts`, new `board-people.test.ts`, `board-focus.test.ts`, `board-render-focus.test.ts`, `board-command.test.ts`
- `skills/spec/list.md` ("my focus", "what's <name> on")

## Implementation guidance

See `technical.md` → *Builder and attribution* (People, PR author) and `design.md` decisions 4, 5, 7
and 11.

**`samePerson`** is pure and symmetric. Normalize both names, then match when they are equal or one is
a prefix of the other, with a minimum of 3 characters. `unknown` never matches. Test it with:
- the real pairs: "Taras Korpach" / `taraskorpach` / `taras`, and `anton-haskevych` / `anton-haskevych`
- `anton` / `antonio Ruiz`
- `unknown` / `unknown`
- a non-match

**Bucketing.**
- Local sessions, and anything that `samePerson(me)` matches, go to me.
- Remote claims are keyed by `personKey(holder.user)`. PRs are keyed by `personKey(author)`.
- An open PR with no author goes to `unattributedPrs`.
- Order the buckets me first, then the others by name.
- Use open PRs only (`linkedPrs` + `toPrCell` from phase 1).

**`me`** is one `git var GIT_AUTHOR_IDENT` in `loadBoard`, not in `loadBoardInputs`, which `claim` and
`trees place` also call. It is also loaded under `--local`, since it needs no network. Store it as
`Board.me`. Test it with the isolated runner (identity `spec-tests`), or it reads the developer's real
git name.

**`--who`.** `focusFor(rows, who, me)` keeps rows where `owner:` matches or where the person has a
bucket; `--who me` uses `Board.me`. `commands/board.ts` applies it before both `--json` and text. It is
valid only with no lane or with the `focus` lane; otherwise print a usage error.

## Deliverables

- [ ] `author` on `gh pr list` and `PrRow.author`; fixtures and field-string tests updated
- [ ] `samePerson` / `personKey` in `board/people.ts`, tests with real name pairs, anton/antonio and unknown
- [ ] `Board.me` from the git author name in `loadBoard`; isolated-runner test
- [ ] Focus rows carry `FocusWork` per person (sessions, remote claims, open PRs) + `unattributedPrs`; render `<person>: …`; tests
- [ ] `owner:` shown as `— (<owner>)` when nobody is on the row; test
- [ ] `board focus --who <name|me>` filters the model (JSON and text) and gives a usage error otherwise; tests
- [ ] `list.md`: "my focus" / "what's <name> on" → `board focus --who`, falling back to that person's remote claims when it's `none`

## Phase-local notes

- `decision-board-timing-accepted`: no new network call; `author` rides the existing `gh pr list`.
- No branch-to-spec mapping (ROADMAP rule): a teammate's unlinked branch, and PR links still on their branch, stay invisible by design.
