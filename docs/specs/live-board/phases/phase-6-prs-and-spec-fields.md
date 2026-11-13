---
needs: [4]
pr: C
---

# Phase 6 — PRs and spec fields on the record

**Goal:** each PR group of a joined spec has a document with its branch, number and state; a phase's state is
computed in one place; and a spec's stage, owner, focus and ship mode live on the record instead of in commits
on main.

**Outcome:** "built, but nobody opened the PR" shows up as a row needing you, "where is PR C" needs no lookup,
and changing an owner or focus no longer puts a commit on main · medium · low risk: additive documents, with
the existing commands keeping their names.

**Files to touch:**
- `skills/spec/tools/plan/docs/pr-doc.ts`, `plan/phase-stage.ts`, `board/record-rows.ts` (new)
- `skills/spec/tools/pr/actions/open.ts`, `pr/actions/merge.ts`, `pr/actions/merge-line.ts`, `pr/resolve.ts`
- `skills/spec/tools/graph/nodes.ts`, `core/land-spec-field.ts`, `focus/land.ts`, `phases/deployed-land.ts`,
  `commands/owner.ts`, `ship.ts`, `focus.ts`, `commands/spec-status.ts` (new)
- `skills/spec/tools/core/land-on-main.ts` (becomes a caller of `core/land-on-ref.ts`), `record/layout.ts`, `plan/kinds.ts` (upgrade step)
- `skills/spec/tools/board/flight.ts`, `lanes.ts`, `attention.ts`, `trees/place-system.ts`,
  `commands/crew/launch-session.ts`
- `skills/spec/update.md`, `execute.md`, `babysit.md`, `SKILL.md`

## Implementation guidance

A PR document is created `not-opened` for every `pr:` group when a spec joins or a group first appears.
`pr open` fills branch and number; `pr merge` fills the merge fields. For a joined spec these replace the
`PR #n · branch` line and the merge line in `pr-opening.md` (`pr/actions/merge-line.ts:17-33`,
`pr/resolve.ts:17-24`); `specPrNumbers` reads the record first. `green` is refreshed from `pr status`, not
polled. A PR opened or merged outside our commands (on github.com, with plain `gh`) must still move its
document: `pr status` and the board's existing read of open PRs write the document when its state or number
differs, matching by branch and `headRefOid`.

`phaseStage` (`design.md` → *Phase state*) is one pure function over a phase document, its PR document and
whether a session holds it. It is not called `phaseState`: `PhaseState` is already the loaded phase in 19
files and a test factory. `board/flight.ts` and `lanes.ts` use it in place of "any box ticked", which is what
called phases in progress with no branch (session S44). `built` with a `not-opened` PR adds an attention row, built in `board/record-rows.ts` (`board/model.ts` is at 224 lines).

Spec fields move onto `SpecDoc`. `loadNodes` (`graph/nodes.ts:30`) is the funnel; the two true copies of its
frontmatter read (`trees/place-system.ts:84`, `commands/crew/launch-session.ts:77`) go through one reader.
`owner`, `focus` and `ship` keep their names, result lines and "only on the user's word" rule; for a joined
spec they call `writeRecord` instead of `landOnMain`. The field is `status`, as in the taxonomy and
`graph/nodes.ts:49`; the command is `spec-status` because `/spec status` is already a mode. Until phase 8,
priority and due date stay as spec fields.

**This release moves data that joined specs already hold in files** (CRM has had the board on since phase 5).
Raise `RECORD_LAYOUT` to 2 and add the upgrade step: the next command that touches a spec whose
`SpecDoc.layout` is 1 copies `status`, owner, focus, ship, the lifecycle notes and relations from `CLAUDE.md`,
and the PR numbers and merge lines from `pr-opening.md`, into the record in one batch. Until a spec is
upgraded, `loadNodes` and `specPrNumbers` read those fields from its files. A session still on PR B refuses to
write once the layout is 2, so it can't put an owner in the old home (`technical.md` → *Releases*).

`landOnMain` (2 tries, no timeout, can wait on a credential prompt) becomes a thin caller of
`core/land-on-ref.ts`, which phase 1 lifted out of it: it gains the retries, the timeout and the no-prompt
setting, and keeps its `MainLanding` result. `core/` never imports `record/`. Don't touch `claims/` beyond
phase 1's move, or `publish/publish.ts`.

## Deliverables

- [ ] `pr-doc` reader; PR documents created `not-opened` for each group at join, at upgrade and when a group first appears
- [ ] `pr open` and `pr merge` write the PR document for a joined spec; `specPrNumbers` reads the record; a PR merged on github.com moves its document at the next `pr status` or board load
- [ ] `phaseStage`: todo, doing, built, merged, deployed; the board's in-flight and ready lanes use it; `built` with no PR is a *Needs you* row
- [ ] Spec fields on `SpecDoc`; `loadNodes` serves joined specs from the record; the two direct frontmatter reads share one reader
- [ ] `owner`, `focus`, `ship` and `phase deployed` write the record for a joined spec; new `spec.ts spec-status <spec> <value>` for both homes
- [ ] Layout 2: a spec joined under PR B is upgraded on its next touch (fields and PR numbers copied in one batch); until then its readers use the files; a PR B plugin refuses to write (test with a layout-1 fixture)
- [ ] `landOnMain` calls `core/land-on-ref.ts`: 5 tries, a timeout and no credential prompt; its result type and callers unchanged
- [ ] `update.md`, `execute.md`, `babysit.md`, `SKILL.md` updated; ROADMAP row and version bump for PR C
- [ ] `record export` keeps free-text lines inside the phase list where they were (CRM's `v1:` / `v2:` labels came back below the list on 2026-11-12) (unit test on that fixture)

## Phase-local notes

- `gotcha-squash-merged-branch-is-not-an-ancestor`: `merged` comes from the PR's own state and `headRefOid`,
  never from ancestry.
- `gotcha-remote-claims-never-read-as-done`: `phaseStage` must not depend on claim status for `done`.
