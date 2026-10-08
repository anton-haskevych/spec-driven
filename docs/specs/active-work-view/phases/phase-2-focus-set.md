---
needs: []
pr: B
---

# Phase 2 — Focus set: spec meta, validation, base-first writer

**Goal:** A team keeps a ranked focus set as a `focus:` field in each spec's `CLAUDE.md`, plus the
documented `owner:` key. The set is written by `spec.ts focus add|drop|move` straight onto
`origin/<default>` and validated by the doctor and the spec-file hook.

**Outcome:** You say "put X on top of focus", and Claude records it on main for the whole team in one
commit · medium · risk: the push to main is refused (branch protection, offline). The writer says why
and writes nothing.

**Files to touch:**
- new: `skills/spec/tools/focus/rank.ts`, `focus/plan.ts`, `focus/land.ts`, `commands/focus.ts`
- `skills/spec/tools/core/spec-meta.ts` (`focus`, `owner`), `doctor/spec-meta.ts`, `core/frontmatter-patch.ts` (`removeFrontmatterLine`), `publish/snapshot.ts` + `publish/publish.ts` (extract `commitOnto`, export `NON_FAST_FORWARD`), `spec.ts` (command table)
- `skills/spec/tools/tests/`: new `focus-rank`, `focus-plan`, `focus-land`, `focus-command`; `spec-meta` / doctor tests, `frontmatter-patch` tests, `commands-table.test.ts`, publish tests stay green
- `skills/spec/list.md`, `skills/spec/SKILL.md` (*Tools* → Focus; *Priority, due dates and owners*), `README.md`

## Implementation guidance

Follow `technical.md` → *Focus in spec meta* and *Writer*. Mirror `commands/phase.ts` for the command:
an `ACTIONS` record, `FOCUS_USAGE`, and errors of the form `focus <action>: <reason>`.

**Rank arithmetic** lives in `focus/rank.ts` as pure functions over `{ spec, rank }[]`, returning one
new rank. Remove the moved spec before looking for its neighbour. Test these cases without touching
disk:
- an empty set
- `--top` when the minimum is 0 (gives `min / 2`)
- after the last entry
- after an entry with an equal-rank neighbour (midpoint to the next *greater* rank)
- moving after the entry's own neighbour
- a malformed `focus:` counting as not in focus

**Landing** (`focus/land.ts`):
- Steps 1–5 in `technical.md`: pin → read the set at the tip → plan → commit one file onto the tip →
  push. On a non-fast-forward, retry once.
- Pull the scratch-index code out of `snapshotCommit` into `commitOnto` before reusing it. That is its
  second use.
- Test against a bare origin plus clones with the isolated runner
  (`gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`). Cover:
  - a stale clone: the rank is computed from the origin's set
  - a concurrent push between pin and push: the retry handles it
  - a protected or refusing remote: you get the refusal line
  - a spec only on a branch: you get the refusal line
  - a drop: the line is removed on origin

**Validation.** `checkSpecMeta` errors on a bad `focus` (not a finite number ≥ 0) or `owner`. The hook
and doctor already call it, so you add no new path regex.

**Prose:**
- `list.md` gets a short *Focus* section:
  - the words that mean add / drop / move: "focus on X", "put X on top", "drop X from focus", "X after Y"
  - the command each one runs
  - that it lands on main immediately, so Claude runs it only on the user's word
  - "X is Taras's" means an ordinary `owner:` edit to X's `CLAUDE.md`
- `SKILL.md` *Tools* gets one **Focus.** bullet ending "A tool command, not a `/spec` sub-command."
- `SKILL.md` *Priority, due dates and owners* gets one sentence on `focus:`.

## Deliverables

- [ ] `SpecMeta.focus` / `SpecMeta.owner` read and validated (doctor + hook through `checkSpecMeta`), tests
- [ ] `removeFrontmatterLine` next to `setFrontmatterLine`, tests
- [ ] Rank arithmetic (`append`, `top`, `after`, ties, self-neighbour) in `focus/rank.ts`, tests
- [ ] `commitOnto` extracted from `snapshotCommit`; publish tests unchanged
- [ ] `focus/land.ts` base-first commit + push with one retry; stale-clone, race, refusal, branch-only, drop tests
- [ ] `spec.ts focus add|drop|move` with the copy from `design.md` → *Copy*, registered in `spec.ts`, tests
- [ ] Prose: `list.md` *Focus*, `SKILL.md` *Tools* + *Priority, due dates and owners*, `README.md`

## Phase-local notes

- `ledger/decision-focus-rank-in-spec-meta.md`, `ledger/decision-focus-writes-land-on-default-branch.md`: why a field and why straight to main.
- `docs/specs/_ledger/gotcha-publish-docs-skips-deleted-files.md`: why landing through `publish-docs` was rejected.
- Push only what the user asked for: one spec, one commit. Never sweep the checkout's changes into it.
