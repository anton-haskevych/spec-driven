---
date: 2026-10-07
lens: craft
slug: names-fixtures-extraction
brief: product-brief.md
---

# Craft Wave — names-fixtures-extraction

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

`T` = `skills/spec/tools`. Builds on `2026-10-07-wave-1-board-sessions-storage.md`.

## Conventions to match
- Named exports only; `export function verbNoun`, `UPPER_SNAKE` consts (`BACKLOG_DIR`, `READY_CAP`, `*_USAGE`), `export interface` for records, `export type` for unions, `import type` for types.
- `Result<T>` (`T/core/result.ts:1`) for IO sources; parsers return `X | undefined`; writers return `EditPlan` (`T/core/apply-edits.ts:15-29`).
- One "why" comment line at most. Functions < 50 lines, files < 250 (`skills/spec/principles.md:25`), not enforced by CI.
- One flat domain folder per source (`spec-board/design.md:24`). `board/inputs.ts` holds types only; pure files never import a loader (`decision-board-inputs-types-apart-from-loader`).
- Tests: `tests/<folder>-<file>.test.ts`, exact-value asserts, `NOW` from `tests/board-factories.ts:8`.

## New files: name + placement + exemplar
| New item | Exemplar to mirror | Placement notes |
|---|---|---|
| Focus entry loader + type (`<THING>_DIR`, `load<Thing>s`, `parse<Thing>`) | `T/backlog/items.ts:6-47` (also `playbook/playbooks.ts`, `lessons/project-ledger.ts:6`) | New flat folder `T/<thing>/`; wired in `T/mainline/load.ts:61-74` next to `loadBacklog` (:71) → `Mainline` → `T/board/load.ts` → `T/board/inputs.ts`. Repo folder `docs/specs/_<dir>/` (flat, in `READ_SET`), never under `_playbook/` |
| Focus entry validation | Hook `T/hooks/spec-file-check.ts:27-47` (new path regex); doctor `T/doctor/backlog-item.ts` + `T/doctor/backlog.ts`, wired `T/commands/doctor.ts:30` | |
| Spec-level section builder (plural noun, pure) | `T/board/flight.ts` (`flightRows(activity, inputs)`) | Own file in `T/board/`, one call from `buildBoard` (`T/board/lanes.ts:37-61`); lanes.ts is 165 lines |
| Section row type | `T/board/model.ts:8-40` (`XxxRow extends RowBase`) | Additive `Board` field → `BOARD_VERSION` stays 1 (`decision-remote-claims-landing-shape`) |
| Section render | `T/board/render.ts:40-90` (`lane`, `capped`, `<lane>Cells`), `T/board/cells.ts` (`rowName`, `ago`, `sessionCell`, `prCell`) | Own render file; render.ts is 106 lines. Adding to `LANES` changes `BOARD_USAGE` and the `board <lane>` check (`T/commands/board.ts:9,41`) |
| Session attribution | `T/board/joins.ts:13-51` (`attachSessions`) | Joins stay in `board/joins.ts` (`decision-prs-and-sessions-join-shape`). Session fields only via `T/sessions/live.ts` (`gotcha-claude-session-files-are-undocumented`): add optional `nameSource`, `startedAt`, read explicitly, unknown → safe |
| Session-name parse | `T/launch/command-line.ts:25-27` builds it; parse with `SUB_COMMANDS`, `isPhaseId` (`T/context/request.ts:9,12`) | |
| Idle-on-claim attention kind | `T/board/attention.ts:15,34-48` (private fn per kind), union `T/board/model.ts:66-74` (kebab-case), render line `T/board/render.ts:82-90` (`<what> → <action>`) | |
| Focus writer command | `T/commands/phase.ts:14-40` (`ACTIONS` record, joined usage, `plan<Action>` → `applyEdits`, errors `<cmd> <action>: <reason>`) | Planner in the domain folder (like `T/phases/add.ts`); register in `T/spec.ts:28-46`; `tests/commands-table.test.ts:5-13` requires usage to start with the name and appear in `USAGE`. Prose bullet in `SKILL.md` Tools ending "A tool command, not a `/spec` sub-command." |
| PR author | `T/pr/gh-lists.ts:7-8` field strings; `T/pr/rollup.ts:7-14,66-72` (`toPrRow`, `isRecord` for the `author` object) | Not `pr/types.ts`/`pr/gh.ts` (pr-status's client) |
| List filter words / `--local` fix | `T/commands/list.ts:13-28` word constants | `list` usage in `T/spec.ts:37` is an inline literal |

## Name collisions (decide in `create`)
- **stale**: `isStale` (`T/claims/rules.ts:42`) means safe to take over (done/gone/closed). A live but long-idle claim is not that. Use another word (e.g. "idle").
- **owner**: `ownerOf` (`T/workspaces/owner.ts:4`) = the worktree that owns a path; local `owner` vars mean a worktree or a spec. A person field needs another name, or the prose `owner:` frontmatter meaning kept strictly out of code identifiers.
- **Person words taken**: `Holder {user, host}`, `remoteHolderName`, `holderName`/`heldName` (session names), `TreeHolder.who`. Free: `author`, `mine`, `teammate`.
- **rank / order**: `rankReady` (`T/board/rank.ts:9`), `orderSpecs`/`orderBacklog` (`T/portfolio/order.ts`).
- **focus**: no identifier, but `status-table.ts:51-53` / `status.md:61,73` say "Currently focused: Phase N", and `SKILL.md:99` "without taking focus".
- **lane**: a `Lane` is a `board <word>` argument.

## Fixtures: reuse vs create
**Reuse as-is**
- `tests/board-factories.ts`: `NOW` :8, `specFixture` :16-40, `baseRef` :42, `boardInputs` :46-63 (add defaults for any new `BoardInputs` field), `workspaceView` :66-74, `readyRow` :76, `flightRow` :80, `board` :84-96 (add default for the new section).
- `tests/factories.ts`: `phaseLine`, `phaseState`, `specMeta`, `specNode`, `specRowOf`, `backlogItem` :59, `phaseEdges`.
- `tests/stub-runner.ts`: `stubRunner`, `asyncStubRunner`, `cannedGh` :37-40.
- `tests/git-repo.ts`: `isolatedRunner` :17, `isolatedAsyncRunner` :21, `repoWithOrigin` :63-87.
- `tests/tree.ts`: `createTree(prefix)` :15-30.
- `tests/fixtures/session-busy.json` (has `nameSource:"derived"` with a launch-style name; override one).

**Create (home: `tests/board-factories.ts`)**
- `liveSession(o)`: replaces hand-rolled copies at `board-joins.test.ts:9-11`, `board-claims.test.ts:18-20`, `claims-rules.test.ts:12-14`, `trees-find.test.ts:12`, `board-lanes.test.ts:48`.
- `claim(o)` / `heldClaim(...)`: copies at `claims-store.test.ts:9-11`, `claims-rules.test.ts:10`, `claims-remote*.test.ts`, `claims-live.test.ts:16`, `trees-find.test.ts:10-11`, `board-lanes.test.ts:44`, `board-inputs.test.ts:38,54,57`, `board-claims.test.ts:14-16`, `claims-taken-over.test.ts:5-6`.
- `prRow(...)`: from `board-joins.test.ts:13-19`.
- Focus entry factory next to `backlogItem` (`tests/factories.ts:59`).
- gh fixtures `gh-pr-list-open.json` / `gh-pr-list-all.json` gain `author`.

**Test placement and speed**
- Pure (fast): focus parse, section builder over `boardInputs`, attribution, idle-claim rule, render, gh-lists `author` (`pr-gh-lists.test.ts:6-18` pins field strings), `--local` bug via `portfolioTable` (`portfolio.test.ts:107-140`).
- Temp dir only: focus loader (pattern `backlog.test.ts:69-84`; missing-folder like `sessions-live.test.ts:92-95`), writer (`lessons-add.test.ts:111-126`).
- Real git (slow, ~0.5–1 s each): list routing through the board (`board-command.test.ts:56-63`), `loadBoardInputs` wiring — extend `board-inputs.test.ts:104-128`'s `beforeAll` repo.
- New section render tests go in a new file: `tests/board-render.test.ts` is 175 lines with 30–40-line exact fixtures.

## Extraction (do, each with a test)
1. **Session label**: `T/trees/find.ts:92-94` and `T/claims/rules.ts:59-61` both do `name ?? "session <id8>"`; the focus cell would be the third. Move to `T/sessions/`. ~2 test cases.
2. **Sessions grouped by worktree**: `T/board/joins.ts:40-47` (`sessionsByWorkspace`) and `T/trees/find.ts:87-90` (`sessionsIn`) both map `ownerOf` over sessions; the focus view needs all sessions per tree (joins keeps only the newest). Own file; own-session exclusion stays at the caller. ~20-line test.
3. **Deploy-wait pairs**: `T/board/attention.ts:66-75` builds undeployed → waiters then re-splits on `#`. Extract the pair enumeration; attention groups by target, focus by waiter. Existing pins `board-lanes.test.ts:86-98`, `board-render.test.ts:19,43` unchanged.
4. **Row-key split**: `T/board/flight.ts:86-89` (private `splitKey`) and inline `T/board/attention.ts:73`; move next to `rowKey` (`T/board/phase-keys.ts:19-21`), add cases to `tests/board-phase-keys.test.ts`.
5. **Older-than-N-days**: `T/board/attention.ts:10,44` (`DAY_MS` + cutoff); the idle-claim rule is the second use. Pure `(then, now, days) → boolean`; boundary test at exactly N days.
6. **Progress done/total**: `T/portfolio/rows.ts:37` and `T/context/status-table.ts:49`; the board is the third. Structural helper next to `SpecNode` in `T/graph/` (not `core/progress.ts`, which parses checkbox lines).
7. *(Optional)* **Folder-of-markdown reader**: `backlog/items.ts:21-28`, `playbook/playbooks.ts:15-22`, `lessons/project-ledger.ts:26-35`; focus would be the 4th. ~6-line loop with differing parse signatures; defensible to leave.

## Don't extract
- **Shared `list`/`board` arg parser**: contracts differ on purpose (`decision-board-command-surface`); fix `--local` locally in `list.ts:28` by dropping `--` flags.
- **Generic group-rows-by-spec helper**: nothing groups rows by spec today; filter final lanes by `row.spec` (or `Map.groupBy`) inside the focus module.
- **`ago()`** (`T/board/cells.ts:38-43`), **`isOverdue`** (calendar days, different meaning from #5), **`ownerOf`** (already shared, 5 callers), **`treeHolder`/`treeOccupant`** (tree-safety rules, not spec attribution), **`readSchedule`/`compareSchedule`** (already shared).

## Craft decisions for `create` to lock
- Name of the concept and folder (`focus` vs other; avoid status-table's "focused phase" wording clash).
- Person field name (not `owner` in code), and identity aliases (git author name vs gh login).
- Word for a long-idle live claim (not "stale").
- Section as a new `Lane` word (`board focus`) or a header block outside `LANES`.
- Rank key format per entry file, and what a reorder writes.
- Whether to do extraction #7.
