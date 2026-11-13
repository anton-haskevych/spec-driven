# Phase 2 recon — a spec joins the board (2026-11-11)

Paths relative to `skills/spec/tools/`.

## Seam

- **Settings.** `playbook/settings.ts:55-95` `parseSettings`; `SECTION_KEYS:48-54` gains `board: ["record"]`;
  `describeSettings:97-114`. `oneOf:150`, `stringArray:166`, `count:132` move to `core/read-fields.ts`.
  `doctor/settings.ts:17-31` `checkSettings` gets the `docs: main` warning. YAML `on`/`off` parse as strings
  (`Bun.YAML`, checked), so `oneOf(["on","off"])` reads them.
- **Base read.** `mainline/load.ts:51` `baseProject(git, sha)` gives the spec docs at a pinned sha in the base
  cache; `publish/snapshot.ts` `pinDefault` fetches. `loadSettings(baseDir)` there = settings on the default branch.
- **Tree copies.** `workspaces/scan.ts:22` `scanWorkspaces(git, asyncRunner, baseSha, forceLive)` lists live
  trees and the specs each changed; `Workspace.head` (`workspaces/list.ts:5-13`) is the tree's head commit.
  `workspaces/views.ts:9` loads each changed spec with `loadSpecState`. Tree names: `board/cells.ts:45`.
- **Tasks.** `core/phase-entry.ts:18-33` rule: the Deliverables section's checkboxes if any, else all.
  `outlineMarkdown` (`core/markdown.ts`) returns rendered text (backticks dropped), so task text for the record
  is read from raw lines; evidence suffix ` — ` from `core/checkbox.ts:5,23-29`; gate items `core/gate.ts:15`.
- **Edges.** `ready/ready-set.ts:44-48` `phaseNeeds(state, phase, index)` already returns the implied needs
  (linear → previous; partly declared → every earlier). planJoin calls it: one rule.
- **Deployed date.** `core/progress.ts:27-35` keeps only a boolean; the date sits after the pointer.
- **Store.** `record/write.ts:24` `writeRecord(port, plan, { validate })`; `unchanged` when the plan says so;
  `offline` returned, never queued. `record/ref.ts:20` `gitRecordPort(git)` (undefined without origin).
- **Banner.** `core/land-on-main.ts:21` `landOnMain(git, branch, dir => MainEditPlan)`.
- **Command table.** `spec.ts:39-64` `COMMANDS`; `tests/commands-table.test.ts` pins it.

## Reuse

field readers (`readFocusFields`, `readShipField`, `readLifecycleFields`, `readSchedule`, `isCalendarDay`,
`isGateKind`), `phaseNeeds`, `landOnMain`, `writeRecord`, `gitRecordPort`, `baseProject`, `scanWorkspaces`,
`fakeRecord`/`viewOf`, `repoWithOrigin` + `clone` + `addWorktree`, `isolatedRunner`.

## Testing issues

- `playbook/settings.ts` is 192 lines; moving three helpers out keeps it under 250 with the board section.
- `planJoin` is pure over `SpecState` copies: tests build states with `specStateFrom(spec, read)` from in-memory
  files (no git). The Nov 11 fixture is three in-memory copies.
- The command spawns git (fetch, ls-remote, worktree list): real-git suites with `isolatedRunner`; the race
  test wraps the runner to land clone A's join just before clone B's record push.
- Golden ready-set test needs a docs → SpecState conversion; phase 2a owns the real one, so the test builds a
  minimal one inline.
