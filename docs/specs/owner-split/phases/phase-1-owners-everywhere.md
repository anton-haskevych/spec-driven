---
needs: []
pr: A
---

# Phase 1 — Owners, assigned and read everywhere

**Goal:** an owner can be assigned on someone's word, is read on specs, phases and ideas, reaches every ready row, and the tools can tell who is running them or say they can't.

**Outcome:** "assign this to Taras" becomes one command both machines see, and the board marks whose each ready row is. Nothing is filtered yet · small · low risk: additive fields, the board only gains a marker.

**Files to touch:**
- `skills/spec/tools/core/spec-meta.ts`, `core/spec-state.ts`, `backlog/items.ts`, `doctor/backlog-item.ts`, `doctor/schedule.ts` (or a sibling phase check)
- `skills/spec/tools/core/git.ts`, `claims/remote.ts`, `board/people.ts`
- `skills/spec/tools/board/model.ts`, `board/lanes.ts`, `board/render.ts`
- `skills/spec/tools/commands/owner.ts` (new), `spec.ts`, `tests/git-repo.ts`
- `skills/spec/SKILL.md` (*Tools*, *Priority, due dates and owners*), `skills/spec/list.md:59`, `skills/spec/idea.md:23`

## Implementation guidance

Start from the parser and work outward. Lift owner parsing out of `readFocusFields` into
`readOwnerField` (shape of `readShipField`), then call it from `readSpecMeta`, `loadPhase` and
`parseBacklogItem`. Phase problems ride on `PhaseState` so the doctor doesn't re-parse phase files.

`ReadyRow.owner` is `phase.owner ?? node.meta.owner` in `phaseRow`, written inline like
priority at `board/lanes.ts:175`; `stageLanes` rows take the spec owner. Add the same field to
flight and blocked rows now (phase 4 needs it). The ready note shows `(owner)` only when set, so
`board-no-focus-golden.test.ts` stays green.

`runnerName` uses `git -c user.useConfigOnly=true var GIT_AUTHOR_IDENT`. Fix the stub in
`tests/git.test.ts:69-70` so it matches the new argv (with `-c`), or the no-identity test passes
vacuously. Add `anonymousRunner` to `tests/git-repo.ts` (`GIT_CONFIG_GLOBAL=/dev/null`,
`GIT_CONFIG_NOSYSTEM=1`, no `GIT_AUTHOR_*`); build repos with `isolatedRunner` and hand the
anonymous one only to the code under test.

`spec.ts owner` copies `commands/ship.ts` line for line in structure: `landOnMain`, refusal when
the spec isn't on base, `unchanged` when already set, `removeFrontmatterLine` for `none`.

## Deliverables

- [ ] `readOwnerField` lifted from `readFocusFields`; spec owner parse and doctor messages unchanged (`spec-meta.test.ts:37-43`, `doctor.test.ts:35-41` green)
- [ ] `PhaseState.owner` parsed from phase frontmatter; doctor reports a bad phase owner with the same message
- [ ] `BacklogItem.owner` parsed; doctor reports a bad idea owner
- [ ] `ReadyRow`/flight/blocked rows carry `owner` (phase beats spec); `(owner)` in the ready note only when set
- [ ] `runnerName` fail-closed + `anonymousRunner` test helper; one shared `UNKNOWN` constant
- [ ] `isOffered(owner, person)` in `board/people.ts` with tests (unset, match, prefix match, other person)
- [ ] `spec.ts owner <spec> <name|me|none>` lands on `origin/<default>`; registered in `spec.ts` and the commands table
- [ ] `SKILL.md` owners paragraph + *Tools* bullet, `list.md:59`, `idea.md:23` say: assigned on someone's word via `spec.ts owner`, never the creator, phase beats spec

## Phase-local notes

- Anton, 2026-10-17: "owner doesn't equal a creator… specs should ship with an empty owner at first, unless someone explicitly claims those specs." Never default an owner anywhere.
- `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner` applies to every identity test.
