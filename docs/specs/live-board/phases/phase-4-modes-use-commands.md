---
needs: [3b]
pr: B
---

# Phase 4 — The modes use the commands

**Goal:** every mode (create, review, execute, update, handoff, resume, status, list) reads and changes a spec
through the commands, a new spec's plan is written straight to the record, the frozen lines are removed from a
joined spec's files once it is safe, and one command takes a spec back to files.

**Outcome:** Claude stops hand-editing checkboxes and status lines, which are writes nobody else can see. This
completes the version that fixes the clashes; still off until phase 5 · medium · medium risk: instructions
change in eight mode files at once.

**Files to touch:**
- `skills/spec/create.md`, `review.md`, `update.md`, `execute.md`, `handoff.md`, `resume.md`, `status.md`,
  `list.md`, `prep.md`, `SKILL.md`
- `skills/spec/tools/plan/apply.ts`, `plan/export.ts` (new), `plan/join.ts` (tidy), `commands/plan.ts` (new),
  `commands/join.ts`, `commands/record.ts`
- `skills/spec/tools/doctor/` (joined-spec checks)
- `skills/spec/tools/tests/skill-wiring.test.ts`, `commands-table.test.ts`
- `ROADMAP.md`, the three version manifests

## Implementation guidance

Wave 2 (*The write seam*) lists every line that tells Claude to hand-edit state: `update.md:131-142`
(status), `update.md:187`, `review.md:291-295`, `create.md:105,200,287-290`, `create.md:142`, `prep.md:84`,
`execute.md:171-173`, and the "Without Bun" paths. The phase commands now work on both homes (phases 3 and
3a), so each of these becomes **one** instruction, "run the command", with no "if the spec has joined" in the
prose: a branch in prose is one no test catches. The hand-edit text stays only under "Without Bun". The one
exception is `create.md`, which keeps two cases: with the board on the plan goes through `plan apply`;
otherwise it scaffolds files as today, word for word.

`plan apply` exists so create makes one call, not thirty: Claude writes a JSON draft (phases, tasks, edges, PR
groups) to its scratchpad and the tool validates it with the same readers and cycle check as the doctor, then
writes one batch. Edges must be explicit in the draft. With the board on, create scaffolds a stub
`progress.md` (the banner and the manual read line) and phase files without a Deliverables section or edge
frontmatter.

**`progress.md` never goes away.** Routing, *Preconditions*, `prep.md` and cloud or no-Bun sessions tell a
spec from a prep folder by that file (`SKILL.md` *Routing*; `mainline/load.ts:72`). A joined spec keeps a
one-line stub. `SKILL.md` documents the manual read:
`git fetch origin refs/spec-board/record` then `git show FETCH_HEAD:specs/<spec>/phases/<id>.json`.

Execute's entry joins a spec that has not joined when the board is on, before it takes the claim, and says so
in one line. Review, update and handoff do the same before they change a plan.

`join --tidy` replaces `progress.md` with the stub and removes the task checkboxes and edge frontmatter of a
joined spec in one commit on the default branch. It runs only when no worktree of this clone **and no remote
branch of the spec** (`feat/<spec>*`, which is where the other machine's work is) differs from the default
branch in those files; check per file, not per spec (`workspaces/changes.ts:42-52` returns spec names today).
Handoff calls it; when it can't run it says which tree or branch holds it.

`record export <spec>` writes `progress.md`, the checkboxes with their done marks and evidence, and the edge
frontmatter back into the current tree from the record; the pack renderer already builds that text.
`--unjoin` then removes the spec's documents in one batch. This is the way back: for one spec that misbehaves,
and for every joined spec if the board is turned off.

`SKILL.md`'s layout sections (*progress.md rules*, *Per-phase entry rules*, *Phase edges*, *in-flight
semantics*) describe both homes: "for a spec on the board, this lives in the record".

## Deliverables

- [ ] `spec.ts plan apply <spec> --file <draft.json>`: a new spec's documents in one batch; explicit edges, cycles and task ids validated; refuses a spec that is already joined
- [ ] `create.md`: with the board on, the plan goes through `plan apply`; a stub `progress.md`; phase files hold goal, guidance and notes
- [ ] `review.md`, `update.md`, `execute.md`, `handoff.md`, `resume.md`, `status.md`, `list.md`: one instruction per plan change (the command), join at entry, tick by task id, report lines taken from the record; hand-edit text only under "Without Bun"
- [ ] `SKILL.md`: layout sections and *Tools* describe both homes; routing and *Preconditions* unchanged in rule (a joined spec has `progress.md`); the manual read path for a joined spec; `skill-wiring` and `commands-table` tests updated
- [ ] `join --tidy`: leaves the stub, removes the frozen lines; only when no local tree and no remote `feat/<spec>*` branch differs in those files; handoff calls it and names the blocker otherwise
- [x] `record export <spec> [--unjoin]`: after it, the file-based ready set equals the record's (round-trip test: join → tick → export → same `SpecState`)
- [ ] Doctor checks for a joined spec: leftover checkboxes after tidy, a phase document whose prose file is missing in this tree, a task without an id
- [ ] ROADMAP row and version bump for PR B

## Phase-local notes

- `gotcha-publish-docs-skips-deleted-files`: tidy edits `progress.md` through its own commit on the default
  branch and deletes no file, so publish-docs has nothing to skip.
