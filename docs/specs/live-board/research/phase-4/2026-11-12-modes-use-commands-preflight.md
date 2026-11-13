# Phase 4 preflight — the modes use the commands

Inputs: `phases/phase-4-modes-use-commands.md`, the recon note beside this one, `skills/spec/principles.md`.
Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **`landOnMain` lands one file** (`core/land-on-main.ts:9-12,40-42`); tidy writes `progress.md` and every
   phase file in one commit. `commitOnto` (`publish/commit-onto.ts:9`) takes any number of index entries, so
   widen the write plan to `files: FileEdit[]` (`core/apply-edits.ts:5`) and change the five callers
   (`merge.ts:78`, `focus/land.ts:16`, `land-banner.ts:10`, `deployed-land.ts:17`, `land-spec-field.ts:29`)
   to a one-element list. One green refactor commit before tidy.
2. **The file form of a task can't carry its id.** `taskLine` (`plan/state-source.ts:94`) writes
   `- [x] 2.1 Alpha`; `entryTasks` (`plan/entry-tasks.ts:21`) reads that as text `2.1 Alpha`, so a re-join
   after export would match nothing. Export writes `- [x] Alpha — <evidence>`.
3. **Tidy's per-file check has no path-level reader.** `workspaces/changes.ts:36-52` runs the right git
   queries but reduces paths to spec names. Export the query builder and add a path-returning reader beside
   `specNames`; remote branches need a new glob fetch (`claims/remote.ts:43` checks one branch only).
4. **The doctor can't see a broken phase document through the state source.** `readJoinedPlan`
   (`plan/state-source.ts:41-44`) drops a document that doesn't read, which is exactly a task without an id.
   The doctor check reads each listed document with `readPhaseDoc` itself.
5. **Two plan changes have no command**, so "one instruction per plan change" can't be met by the mode
   files: adding, rewording or dropping a task in an existing phase (`phase add --task` only seeds a new
   phase, `commands/phase/add.ts:5`), and `needs-deployed` / `same-files-as` (`commands/phase/set.ts:7`).
   Review edits deliverables of existing phases routinely (`review.md:293`).

## Clean Code / SOLID / Clean Architecture against phase 4

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Small functions, one thing | Bites | `commands/join.ts` (122 lines) gets no tidy body: `commands/join-tidy.ts` beside `join-from-tree.ts` |
| One word per concept | Bites | "edges" = needs, needs-deployed, same-files-as, pr, as `hooks/frozen-plan-edits.ts:38-42` says; tidy and export import one list |
| Pure core, I/O at seams | Bites | `planTidy(texts) → texts`, `planExport(plan, texts) → texts`, `planApply(draft) → docs | problems` pure; commands do git |
| Extract on second use | Violated, fix here | `deliverablesSection` / `outsideFences` private in `state-source.ts:98-118`; tidy and export need them → `plan/deliverables.ts` with a test |
| DIP | Inert | the store already takes `validate`; no new port |
| OCP | Bites | `spec.ts` `COMMANDS` table (`spec.ts:39-66`) gets a `plan` row; `phase` gets a `task` action row |
| DDD | Skipped | tooling and prose, no domain model change |

## Amendments

1. Refactor commit first: `landOnMain` write plan takes `files`.
2. `plan/deliverables.ts`: `deliverablesSection`, `outsideFences`, and `replaceTaskLines(body, lines)` (drops
   checkbox lines and the on-board sentence in the Deliverables section, or outside fences when there is
   none, and puts `lines` where the first one was). Tidy passes the on-board sentence; export passes tasks.
3. `plan/stub.ts`: `progressStub(title, day, spec)` = title, banner, manual read line. Plan apply and tidy
   both write it; `planBanner` keeps detecting the banner by `BANNER_START`.
4. Export writes `needs:` on every phase (record edges are explicit) and leaves the banner in place unless
   `--unjoin`, which removes it with the read line.
5. Doctor: one `doctor/joined.ts` with the three checks, run only for joined specs.
6. Add `phase task <spec> <phase> --add "<text>"… | --edit <task-id> "<text>" | --drop <task-id>` (both
   homes) and `phase set --needs-deployed … --same-files-as …`, so review and update have a command for
   every plan change.

## Defaults applied

- Tidy treats `pr` as an edge (the frozen-plan hook already does).
- Tidy's remote check fetches `feat/<spec>*` branches with a glob refspec and diffs each with
  `<default>...<branch>` (changes made on the branch, not main's later edits).
- Plan apply takes tasks as strings; the tool assigns ids `<phase>.<n>`; a `Gate:` prefix marks a gate task.
- Plan apply writes the stub `progress.md` into the tree once the record write lands.
- Export writes into the current tree only; landing it on main is publish-docs, as for any spec edit.

## Forks for you

None. Finding 5 adds a small command inside deliverable 3's promise; listed under *Say if wrong*.
