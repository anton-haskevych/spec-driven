# Phase 4 recon — the modes use the commands

Paths are under `skills/spec/tools/` unless they start with `skills/`.

## The seam

**`plan apply`** (new `commands/plan.ts`, `plan/apply.ts`)
- The batch to model on is `commands/join.ts:86-97` (`joinPlan`: `spec.json` as `create`, phases as `create`;
  a create conflict on `spec.json` = already joined). Validate with `validateRecordDoc` (`plan/kinds.ts`) per
  doc and `specPlanProblems` (`plan/docs/spec-plan.ts`) across docs, as `planJoin` does (`plan/join.ts:58-60`).
- The board-on check lives inside `commands/join.ts:66-77` `readCopies` (`pinDefault` → `baseProject` →
  `loadSettings` → `board.record` and `docs: main`). Plan apply needs the same check: extract it.
- `phaseFileText({ onBoard })` (`phases/template.ts:36`) already writes a phase file with no deliverables.

**`join --tidy`**
- `landOnMain` (`core/land-on-main.ts:9-12,40-42`) lands **one** file. Tidy lands several in one commit:
  `commitOnto` (`publish/commit-onto.ts:9`) already takes any number of index entries. Widen the plan to
  `files: {file, text}[]`; the five single-file callers keep working through a one-element list.
- Frontmatter edits: `removeFrontmatterLine` / `setFrontmatterLine` (`core/frontmatter-patch.ts:6,14`).
- The edge keys the frozen-plan hook already treats as the plan: needs, needs-deployed, same-files-as, pr
  (`hooks/frozen-plan-edits.ts:38-42`). Tidy and export use the same list.
- Checkbox section: `deliverablesSection` / `outsideFences` are private in `plan/state-source.ts:98-118`;
  tidy and export are the second and third users.
- Trees that differ: `workspaces/changes.ts:36-45` runs `diff --name-only -z base...head` and `status
  --porcelain -z` per tree, but reduces paths to spec names (`:47-52`). Tidy needs the paths. Remote branches:
  no helper lists branches by glob (`claims/remote.ts:43` checks one branch with `ls-remote`).
- Banner: `plan/banner.ts` (`BANNER_START`, `bannerLine`, `planBanner`).

**`record export [--unjoin]`**
- Task text: `taskLine` (`plan/state-source.ts:94`) renders the id; `entryTasks` (`plan/entry-tasks.ts:21`)
  would read `2.1 Alpha` back as text, so the file form must drop the id to round-trip through join.
- Progress lines: `progressLine` (`phases/template.ts:32`, always unticked), `deployedMarker`
  (`core/progress.ts:13`); no renderer for a ticked + deployed line.
- `--unjoin`: `delete` ops (`record/plan-writes.ts:6-10,63`) for `spec.json` and each phase doc, one batch.
- `record` command parsing: `commands/record.ts:35-46`.

**Doctor**
- `doctor/run.ts:33-45` builds per-spec checks and skips `progressIssues` when `plans.isJoined`.
- `readJoinedPlan` (`plan/state-source.ts:38-46`) silently drops a phase doc that doesn't read (a task
  without an id is one), so the doctor must read the docs itself to report them.
- `Issue` (`doctor/issue.ts:5-9`).

**Mode files** (full line list from the second explorer)
- Plan-state hand edits: `create.md:105-110,219-221,287-295,313-315`; `update.md:43,47-51,58,60,131-143,187`;
  `review.md:293,312`; `execute.md:133,231`; `prep.md:295`; `SKILL.md:107,291,298,305,309-329`.
- Reading plan state from files: `status.md:19-43` (no-pack fallback), `list.md:62-83`, `resume.md:5,21,111`,
  `review.md:23,26,88`, `update.md:17,22,139,154-171`.
- No mode file mentions `join` or `record` yet. Handoff's commit section is `handoff.md:110-151` (doctor
  112-118, commit 120-138, push/publish 140-147): `join --tidy` slots in after publish.

**Commands with no writer today** (a mode file can't say "run the command" for these): adding, rewording
or dropping a task in an existing phase; `needs-deployed` and `same-files-as`; the spec `status:` (phase 6
adds `spec-status`).

## Reuse
- `joinPlan`'s create batch and `validateRecordDoc` for apply; `commitOnto` for a multi-file landing;
  `frontmatter-patch` for edges; `deliverablesSection` for both tidy and export; `phaseNeeds`-explicit edges
  already on every `PhaseDoc`, so export writes `needs:` on every phase.
- Tests: `tests/join-command.test.ts` (real git, `BOARD_ON`, `onRecord`, `progressOnMain`),
  `tests/joined-repo.ts` (`joinedRepo`, `STUB`, `recordPhase`), `tests/join-fixtures.ts` (`specFiles`),
  `tests/fake-record.ts`, `tests/record-factories.ts`, `tests/plan-join-golden.test.ts` (ready-set equality).

## Testing issues
- Tidy's "differs" check needs real git (worktrees and a remote branch): one real-git suite, the rest pure.
- `commands-table.test.ts` checks only that usages start with the command name and appear in `USAGE`;
  `skill-wiring.test.ts` doesn't check SKILL.md's *Tools* against commands. "Updated" means adding the new
  commands' wiring checks, not rewriting.
- `core/land-on-main.ts` change touches five callers; their tests must stay green.
