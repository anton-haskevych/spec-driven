---
needs: [1]
pr: B
---

# Phase 2 — A spec joins the board

**Goal:** a spec's phases and tasks can be put on the record in one write, built from main and every local
worktree, with every disagreement between the copies named.

**Outcome:** nothing a session sees changes yet: a joined spec is on the record but still read from files
until phase 2a. Off by default · medium · low risk: it writes documents nothing reads yet.

**Files to touch:**
- `skills/spec/tools/plan/docs/spec-doc.ts`, `plan/docs/phase-doc.ts`, `plan/kinds.ts`, `plan/join.ts` (new)
- `skills/spec/tools/core/read-fields.ts` (new, from `playbook/settings.ts:138-177`)
- `skills/spec/tools/playbook/settings.ts`, `doctor/settings.ts`
- `skills/spec/tools/commands/join.ts` (new), `spec.ts`, `tests/record-factories.ts` (new)

## Implementation guidance

`planJoin` is pure: its inputs are the spec at the base commit and each worktree's view (the board already
builds both: `mainline/load.ts`, `workspaces/views.ts`). Use the Nov 11 `schedule-clarity-fixes` state (wave 1
→ *The incident*) as a fixture: three copies, phase 2 done only in one tree, phases 6a and 10 only on main.

Three rules from the review (`technical.md` → *Joining*):

- **Match tasks by text, never by position.** Ids are `<phase>.<n>` in the base copy's order. A tree that
  inserted a task above 2.3 must not get its third box read as main's 2.3. A task that matches nothing or
  matches twice is a disagreement: listed, left open.
- **Write the edges out.** `PhaseDoc.needs` has no "declared" bit, and the ready set treats undeclared edges
  two different ways (`ready/ready-set.ts:17,33-41`). `planJoin` writes what the ready set computes today: no
  edge frontmatter anywhere → each phase needs the one before it; some declared → an undeclared phase needs
  every earlier one. A joined spec's edges are always explicit.
- **A phase only in one tree** whose prose file is not on the default branch is listed, not added: no other
  tree could open its file.

Done anywhere is done. Evidence is the ` — ` suffix when a task has one (`core/checkbox.ts:5,23-29`), otherwise
the head commit of the tree it was ticked in.

The spec and phase readers call the plugin's field readers on the parsed object (`core/spec-meta.ts`,
`core/schedule.ts`) and the helpers moved to `core/read-fields.ts`. `plan/kinds.ts` is the path → reader
registry the store is given.

Join refuses offline (a queued join would let ticks keep going to files and then land old done-marks), needs
`docs: main`, and writes `spec.json` as a `create` so two machines joining at once can't overwrite each other.
The banner lands on `progress.md` through `landOnMain`; a second run that finds the spec joined but the banner
missing lands it. Nothing is deleted here.

The setting is read from the default branch (the base cache), not the checkout: a worktree cut before the
switch must agree with one cut after.

## Deliverables

- [ ] `spec-doc` and `phase-doc` readers that collect problems (unknown phase in `phases`, a `needs` that doesn't resolve, duplicate task ids) and reuse the existing field readers; `core/read-fields.ts`; factories in `tests/record-factories.ts`
- [ ] Settings key `board.record: on | off`, default off, read from the default branch; in `describeSettings`; the doctor warns when it is on without `docs: main`
- [ ] `planJoin`: base + worktree views → documents; tasks matched by text; done anywhere is done with evidence; unmatched tasks and tree-only phases returned as disagreements (Nov 11 fixture; a fixture with a task inserted above a ticked one)
- [ ] `planJoin` writes implied edges; golden test: a linear spec and a partly-edged spec have the same ready set computed from their documents as from their files
- [ ] `spec.ts join <spec>`: one batch with `spec.json` create-only, then the banner; refuses with the board off, without `docs: main`, and offline; a second run says `already on the board` and lands a missing banner; two clones joining at once leave one record (real git)

## Phase-local notes

- This repo runs `docs: branch`, so the board can't be turned on here; every test uses a scratch repo.
