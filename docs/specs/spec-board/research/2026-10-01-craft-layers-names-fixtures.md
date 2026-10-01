---
date: 2026-10-01
wave: craft
lens: craft
slug: layers-names-fixtures
brief: product-brief.md
---

# Craft Wave — layers, names, fixtures

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Three agents: naming and placement, tests and fixtures, extraction. Paths relative to `skills/spec/tools/`.

## Placement conventions

- One folder per **domain**, not per layer (`principles.md:62`: "group by what changes together… beats
  models/ controllers/ views/"). Folders are flat; no sub-subfolders anywhere except `tests/fixtures/`.
- Inside a domain folder the layers sit side by side: `pr/gh.ts` (shells out) + `pr/gh-records.ts`
  (parsers) + `pr/checks.ts` (pure) + `pr/render.ts`. Generic seams live in `core/` (`run.ts`, `git.ts`).
  `commands/` is thin wiring.
- Types sit beside the function that produces them; only `pr/types.ts` is types-only.
- Precedent for one feature across a folder: pr-status (`commands/pr-status.ts` + 9 files in `pr/`),
  publish-docs (`publish/` 4 files), lessons (`commands/lessons.ts` dispatching to `lessons/` 6 files).
  `commands/list.ts` already composes three folders (`graph/`, `backlog/`, `portfolio/`).

## Naming idioms

- `loadX(projectDir)` reads disk; `parseX(text)` / `toX(unknown)` parse; `renderX(view)` builds terminal
  text; `planX` = pure plan before a write; `xFrom(…, reader)` once (`specStateFrom`).
- Commands: `xCommand(projectDir, args)` or `xReport(projectDir, args, …, runner = systemRunner)`.
- Capability interfaces are nouns (`Runner`, `Git`, `GhClient`); function types are verb phrases
  (`ReadSpecFile`); factories are lowerCamel with cwd first (`ghClient(cwd, runner, budget)`,
  `gitAt(cwd, runner)`, `diskReader(dir)`); the default impl is a constant (`systemRunner`).
- `Result<T>` for fallible IO; errors print as `` `${cmd}: ${reason}` ``. `X_USAGE` exported per command.
- Flags: `list` hand-filters `--json` (`commands/list.ts:10,15,22`); others use `node:util parseArgs`
  with `strict: true` (`commands/phase.ts:130`).
- Test files: `<folder>-<file>.test.ts` (`pr-gh`, `pr-render`).

## Name collisions to avoid

- `snapshot` = `publish/snapshot.ts` (`Snapshot`, `buildSnapshot`) → don't call the base read a snapshot.
- `view` already means a gh record (`PrView`) and a render input (`PortfolioView`).
- `session` = `SessionLaunch` (`launch/command-line.ts:6`). `report` = `PrReport` + every `xReport`.
  `rank` = `priorityRank` (`core/schedule.ts:64`). `index` = ledger index.
- Free: `board`, `lane`, `claim`, `workspace`, `activity`, `heartbeat`, `overlay`.

## Exemplar per piece

| Piece | Model on | Note |
|---|---|---|
| Spec docs from a git ref | `publish/snapshot.ts:24 pinDefault`, `:59-75` (plumbing via `Git`); reader seam `core/spec-state.ts:32-41` | blob reader beside `diskReader` |
| Spec docs from a worktree | `diskReader` as is | no new file |
| Workspace listing / classification | `context/infer-spec.ts:7-30` (git + pure path filter) | new domain folder |
| Live sessions (`~/.claude/sessions`) | `backlog/items.ts:21-29` (`loadBacklog` + pure `parseX`) | `loadX` + `parseX`, home dir as a parameter |
| Claims store | none (first writes outside `docs/`); nearest `core/apply-edits.ts`, `core/files.ts:3` | new |
| PRs by branch | `pr/gh.ts:7-21` (add a method) + `pr/gh-records.ts` (`toX` parser) | stays in `pr/` |
| Lanes, rank, overlay | `portfolio/rows.ts:22`, `portfolio/order.ts:7`, `ready/ready-set.ts:16` | pure |
| Terminal view | `portfolio/render.ts:5,19` | `render.ts` per domain folder |
| `--json` | `commands/list.ts:22-25` | in the command |
| `claim` command | `commands/launch.ts` (thin, defaults injected) | only if exposed as a `spec.ts` command; it is not a `/spec` sub-command, so `skill-wiring.test.ts:86-111` does not apply |
| Async runner | `core/run.ts:13-32` | beside `Runner`, separate type |

## Extraction (all additive; no existing signature changes)

| Extract | Where | Callers affected | Test cost |
|---|---|---|---|
| `loadNodeFrom(spec, read)`; `loadNode` delegates | `graph/nodes.ts:35-51` | 0 (10 `loadNodes` sites untouched) | 2 pure tests with a Map reader |
| `loadNodesFrom(specs, readerFor)` without first-wins | `graph/nodes.ts:28-34` | 0 | covered above |
| `specsFromPaths(paths, base)` from `listSpecs`' match logic | `core/spec-folders.ts:23-25` | 0 (`listSpecs` calls it) | 1–2 tests |
| `rollupToChecks(value)` beside `toChecks` | `pr/gh-records.ts:27-35,61-63` | 0 | 1 table test from a fixture |
| `checksState(summary)` from `prState`'s check-only part (optional) | `pr/checks.ts:27-29` | `prState` calls it | existing 7 pass |
| `parsePorcelainZ` from `uncommittedPaths` | `context/infer-spec.ts:28-37` → `core/` | `specsInPlay` | ms-fast pure tests replace real-git cost |
| `compareSchedule(a, b)` (priority, then due) | `portfolio/order.ts:7-25` | `orderSpecs`, `orderBacklog` | existing 11 pass + 1 |
| export `HUB_LIMIT`, `pathUsage`; new `overlapsWith(nodes, name, inFlight)` | `graph/overlap.ts:8,31` | 0 | ~3 tests (overlap has none today) |
| new `ago(then, now)` | `core/schedule.ts` | 0 | a few cases in `schedule.test.ts` |

Blob reader gotcha: pointers like `../ci-optimization/…` need `posix.normalize` and a guard against
leaving the repo (one test). Rollup → bucket map: CheckRun not `COMPLETED` → pending; `SUCCESS`/`NEUTRAL`
→ pass; `FAILURE`/`TIMED_OUT`/`ACTION_REQUIRED`/`STARTUP_FAILURE` → fail; `CANCELLED` → cancel;
`SKIPPED`/`STALE` → skipping. StatusContext `SUCCESS` → pass, `FAILURE`/`ERROR` → fail,
`PENDING`/`EXPECTED` → pending. Name = `name` ‖ `context`; link = `detailsUrl` ‖ `targetUrl`.

## Don't extract / don't touch

- `pr/report.ts buildReport` (several gh calls per PR), `prState` (pr-status depends on its `mergeable`
  behavior), sync `Runner` / `systemRunner`, `defaultBranch` per worktree (gh fallback = network).
- `loadNodes` first-wins rule; `findSpecs` / `resolveSpec` and every writer using `diskReader`
  (`phases/{tick,split,add,deployed}.ts`, `core/apply-edits.ts`) stay disk-only.
- `phases/review-refs.ts:37` and `context/packs.ts executePack` read disk behind the node: never feed
  them blob-loaded nodes.
- `specRow` signature (`list --json` depends on `root`); pass a base dir instead.
- `context/infer-spec.ts branchCommitPaths` (silent `[]` on no merge base, uses `log`): write a new
  per-branch diff instead. `publish/snapshot.ts`: reference, don't generalize.

## Tests and fixtures

- Suite today: 406 pass, 58 files, 23.5 s. `bun:test`, one `describe` per function, behavior-sentence
  names. **No snapshots**: exact render via `toBe(lines.join("\n"))` (`pr-render.test.ts:23-34`,
  `portfolio.test.ts:80-95`) or `toContain` per line. JSON via `JSON.parse(...)` + `toEqual`.
- Factories: `tests/factories.ts` (65 lines), `fn(overrides: Partial<T> = {}): T` single literal, nested
  defaults call other factories. No casts anywhere (user rule). New workspace / session / claim / PR-row /
  board-input factories: a separate `tests/board-factories.ts` keeps it apart.
- Runners: `stubRunner(canned)` (`tests/stub-runner.ts:7-17`, first prefix wins, records `calls`);
  `sequencedRunner` is local to `pr-report.test.ts:16-27` (move to `stub-runner.ts` if reused);
  `isolatedRunner` (`git-repo.ts:17-19`) required for code under test that spawns git. No async
  precedent: add an async stub mirroring `stubRunner` in `stub-runner.ts`.
- Fixtures: `tests/fixtures/` has 3 gh JSON + 1 raw `.txt`, loaded with
  `Bun.file(join(import.meta.dir, "fixtures", name))`. Add `git-worktree-list.txt`,
  `git-for-each-ref.txt`, `gh-pr-list.json` (with rollup), `session-*.json`.
- Time: no fake clock; pass `today` / `now` in (`portfolio.test.ts:11`, `lessons-add.test.ts:14`).
  bun test is UTC, spawned children are local: pass `TZ` to children.
- Real git: `repoWithOrigin` (`git-repo.ts:57-77`) has `clone` but no worktree helper → add
  `addWorktree(name, branch)` beside `clone`. First test that compares git-printed paths to `tmpdir()`:
  normalise with `realpathSync` (macOS `/private`). ~0.5–1 s per real-git test; keep one integration test.
- Env: `HOME` never stubbed; precedent is a parameter (`launchReport(dir, args, env = process.env, runner)`).
  Pass the Claude home / sessions dir in.

## Decisions for create to lock

1. **Folder shape vs the user's layering ask.** Codebase rule is flat domain folders. Options:
   (a) one `board/` folder with layer-named files (`sources`, `lanes`, `rank`, `render`);
   (b) a domain folder per source (`workspaces/`, `claims/`, PRs in `pr/`) + `board/` for model and
   views; (c) `board/` with subfolders `sources/ model/ views/` — breaks the no-sub-subfolder rule.
2. **Board model type name** (`Board` vs `BoardModel`), since `View` and `Snapshot` are taken; name of
   the base read (`base`, `mainline`, `tip`).
3. **Is `claim` a `spec.ts` command** (called from execute/update/handoff) or a flag on existing commands?
4. **Async runner shape:** new `AsyncRunner` in `core/run.ts` vs wrapping the sync runner in workers;
   `Command.run` returning `string | Promise<string>`.
5. **Factories home:** `tests/factories.ts` vs new `tests/board-factories.ts`.
