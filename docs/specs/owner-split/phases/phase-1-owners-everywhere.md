---
needs: []
pr: A
---

# Phase 1 — Owners, assigned and read everywhere

**Goal:** a spec's owner can be assigned on someone's word, reaches every board row, and the tools can tell who is running them (one "me" everywhere) or say they can't.

**Outcome:** "assign this to Taras" becomes one command both machines see, and the board marks whose each ready row is. Nothing is filtered yet · small · low risk: additive fields, the board only gains a marker.

**Files to touch:**
- `skills/spec/tools/core/people.ts` (new), `board/people.ts`, `claims/remote.ts`, `core/git.ts`, `core/spec-meta.ts`
- `skills/spec/tools/board/model.ts`, `board/lanes.ts`, `board/flight.ts`, `board/render.ts`, `board/load.ts`
- `skills/spec/tools/core/land-spec-field.ts` (new), `commands/ship.ts`, `commands/owner.ts` (new), `spec.ts`, `tests/git-repo.ts`
- `skills/spec/SKILL.md` (*Tools*, *Priority, due dates and owners*), `skills/spec/list.md:59`, `skills/spec/idea.md:23`

## Implementation guidance

Start with `core/people.ts`: move `personKey`, `samePerson` and `UNKNOWN` out of `board/people.ts`
(re-import there and in `claims/remote.ts`), then add `hasMatchKey`, `isOffered`, `INVALID_OWNER`
and `ownerOf(meta)`. `readFocusFields` keeps parsing `owner:` exactly as today and sets
`ownerInvalid` beside its problem; `ownerOf` returns `INVALID_OWNER` for it, so `isOffered` fails
closed and the board shows `(owner?)`.

`ReadyRow.owner`, `FlightRow.owner` and blocked rows' `owner` all come from `ownerOf(node.meta)`:
one call site per row builder (`phaseRow`, `stageLanes`, the blocked push in `board/lanes.ts`,
`board/flight.ts`). The ready note shows `(owner)` only when set, so
`board-no-focus-golden.test.ts` stays green.

`runnerName` runs `git -c user.useConfigOnly=true -c user.email=spec-driven@invalid var
GIT_AUTHOR_IDENT` (the placeholder email keeps a name-only config working; probed in the review)
and refuses a name without a 3-char match key. Leave the `authorName` stub at
`tests/git.test.ts:69-70` alone; add `runnerName` tests of their own: a stub keyed on the new argv,
a real-git `anonymousRunner` case, a repo-local `user.name` with no email, and a Cyrillic name.
`anonymousRunner` in `tests/git-repo.ts`: `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`, and
`GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`/`EMAIL` set to `""` (the runner merges `process.env`). Build
repos with `isolatedRunner`; hand the anonymous one only to the code under test.

`board/load.ts:39` passes `runnerName`'s value (absent on failure) as `Board.me`; `authorName` stays
only for claim holders.

Extract `landSpecField` from `ship.ts`'s `shipEdit`/`planShip` first (ship tests stay green), then
write `owner` on it: `me` → `runnerName`, `none` → remove the line, already-set → unchanged.

## Deliverables

- [x] `core/people.ts` with `personKey`, `samePerson`, `hasMatchKey`, `isOffered`, `ownerOf`, `UNKNOWN`, `INVALID_OWNER`; tests (unset, match, prefix, other person, invalid, short, non-ASCII)
- [x] `ownerInvalid` on `SpecMeta`; spec owner parse and doctor messages unchanged (`spec-meta.test.ts:37-43`, `doctor.test.ts:35-41` green)
- [x] Ready, flight and blocked rows carry `owner` via `ownerOf`; `(owner)` / `(owner?)` in the ready note only when set
- [x] `runnerName` fail-closed (placeholder email, 3-char key) + `anonymousRunner`; `Board.me` from `runnerName`
- [x] `landSpecField` extracted; `ship` on it with tests unchanged
- [x] `spec.ts owner <spec> <name|me|none>` lands on `origin/<default>`; refuses short names; registered in `spec.ts` and the commands table
- [x] `SKILL.md` owners paragraph + *Tools* bullet, `list.md:59`, `idea.md:23` say: spec-level, assigned on someone's word via `spec.ts owner`, never the creator; phases and ideas carry none

## Phase-local notes

- Anton, 2026-10-17: "owner doesn't equal a creator… specs should ship with an empty owner at first, unless someone explicitly claims those specs." Never default an owner anywhere.
- Spec-level only: `ledger/decision-spec-level-owners-only.md`.
- `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner` applies to every identity test.
