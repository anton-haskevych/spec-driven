---
date: 2026-10-10
wave: craft
lens: craft
slug: placement-fixtures-extraction
brief: product-brief.md
---

# Craft Wave — placement, fixtures, extraction

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Three Explore agents worked from the brief and waves 1–2. Paths are under `skills/spec/tools/` unless they are written in full.

## Shared conventions

- **Commands**
  - Each command lives in `commands/<command-name>.ts` (kebab case, named like the command: `pr-status.ts`, `publish-docs.ts`).
  - It exports `<NAME>_USAGE` and `xxxCommand|xxxReport(projectDir, args, deps = systemXDeps())`, which returns `string | Promise<string>` (`commands/push.ts:6-13`, `commands/claim.ts:25-54`).
  - Registration is an import plus a `COMMANDS` row in `spec.ts:2-50`. `tests/commands-table.test.ts:5-13` checks that usage starts with the name.
  - Sub-actions use either a destructured `[action, …]` (`commands/claim.ts:48-54`) or `parseArgs` with `strict: true` (`commands/board.ts:34-41`).
- **Output**
  - One prefixed line per step: `Remote:` (`publish/render.ts:6-13`), `claim:` (`commands/claim.ts:158-174`), `Tree:` and `Fresh tree: work through gate X` (`commands/trees.ts:44-55`), `Launched:` (`commands/launch.ts:30-35`).
  - Errors are `<command>: <reason>`.
  - A composite command joins its steps' lines (`commands/publish-docs.ts:19-31`).
- **Plumbing**
  - `Result<T>` (`core/result.ts:1`).
  - `gitAt(cwd, runner)` returns a `Git` with `.run` and `.out` (`core/git.ts:4-19`). Pure code takes `Git`; commands build it.
  - `Runner`, `systemRunner`, `runAll` and `defaultBranch` (`core/run.ts`).
- **Settings key.** Commit 34a9518 is the template: `playbook/settings.ts` (interface, `SECTION_KEYS`, `parseSettings`, `describeSettings`), then `doctor/settings.ts:20-22`, `tests/settings.test.ts:77-80`, and the SKILL.md:95 prose.
- **SKILL.md *Tools* bullet.** Format: `- **Name.** \`bun ${CLAUDE_SKILL_DIR}/tools/spec.ts <usage>\` what it does; the exact output line; which mode runs it. A tool command, not a \`/spec\` sub-command.` Exemplars are at SKILL.md:98-104. No test pins tool bullets. `skill-wiring.test.ts:84-112` pins only `SUB_COMMANDS`.

## New files: name and placement → exemplar

| New thing | Home | Exemplar | Notes |
|---|---|---|---|
| Session start / close composites | `commands/<name>.ts`. Not `sessions/`, which means Claude process liveness | `commands/publish-docs.ts:11-32`. Parts: `placeTree` (`trees/place.ts`), `claimCommand` (`commands/claim.ts:47`), `gatesReport` (`commands/gates.ts:9`), `pushReport` (`commands/push.ts:9`), `doctorReport`, `boardCommand` (`commands/board.ts:21`) | `XDeps extends BoardDeps` plus `systemXDeps()` (`commands/claim.ts:27-33`). Keeps each step's own line. |
| Sync with main | Pure logic as a new kebab noun file in `publish/` (the git-write family); command in `commands/` | Fetch and behind count: `publish/push.ts:18-51`. Dry-run conflict list: `mergeTreeOutcome` (`publish/publish.ts:20-27`). Spec-doc split: `isSpecDocPath` (`core/spec-folders.ts:62`), `pathsOutsideSpecDocs` (`publish/push.ts:13-15`). Merge with a recovery hint: `mergeSnapshotBack` (`publish.ts:59-62`). Gate print: `renderGates` (`commands/gates.ts:31-39`) | Returns `Result` with a `kind` union (`Published`, `publish.ts:11-13`). Rendered by `publish/render.ts`-style `string[]` functions. |
| Printed-rows store | `<common>/spec-board/<dir>/`, next to claims | `claims/store.ts:33-40` (`claimsDir`, `claimFile`), `claims/atomic-file.ts:9`, `ownSessionId` (`sessions/own.ts:3-5`) | Never committed (`core/git.ts:39`). Scoped by repo and session (`gotcha-session-files-span-every-repo`). |
| Reply parser | `launch/` (`command-line.ts`, `terminal.ts`, `title.ts`) or the `context/request.ts` family | `context/request.ts:11-40` (regex consts, `tokenize`, exported predicates) | Rows come from `board/render.ts:59-61`. Identity is `rowKey` (`board/phase-keys.ts:19`). |
| Git-derived `updated` | `mainline/` as a new kebab noun file | `baseCache` (`mainline/base-cache.ts:10-28,54-69`), git at the pinned sha (`mainline/load.ts:40`), parser style `parseAheadBehind` (`workspaces/classify.ts:26-36`) | Swap point: `SpecNode.meta.updated` (`graph/nodes.ts:35-50`). Only the board and list paths need it. `loadNodes` has 11 callers. |
| Per-phase in-flight | Spec layout. The reader is `core/spec-state.ts:29,45` | Per-item file naming: `claimFile` `${spec}#${phase}.json` | Must match a `READ_SET` glob (`mainline/base-cache.ts:6`), and every glob must match at least one file (`gotcha-git-archive-fails-on-any-unmatched-pathspec`; the guard is `matchingPatterns` at :30-35). |
| Behind-main on the board PR cell | `board/` model, joins, cells | `PrCell` (`board/model.ts:19-27`), `toPrCell` / `attachPrs` (`board/joins.ts:29-53`), `prCell` (`board/cells.ts:71-80`). Data is already parsed and dropped: `workspaces/scan.ts:25` → `classify.ts:26-36` | Wording follows `behind main N` (`publish/render.ts:10`). Bump `BOARD_VERSION` (`model.ts:6`). |
| Version launcher | New `/bin/` at the plugin root. No family exists | — | `.claude-plugin/plugin.json` has no `bin`, `hooks` or `commands` keys. Claude Code adds `<plugin>/bin` to PATH. `tsconfig.json` includes only `skills/**/tools/**/*.ts`, and `bunfig.toml` sets the test root to `skills`, so `bin/` is outside typecheck and tests unless both are widened. `scripts/version.py:12-14` syncs the versions. |
| Lessons budget in the pack | `context/packs.ts` | Caps at `:29-32`, `withinBudget` at `:110-119`, and the hidden-rows note in `ledgerBlock` (`:96-108`). Uncapped today: `projectLessonsBlock` (`:136-141`) | Add an `UPPER_SNAKE_LIMIT` const and end with "N more …; scan X". |

## Fixtures: reuse vs create

- **Run and cost.**
  - `bun test` and `tsc --noEmit` run in CI (`.github/workflows/plugin-metadata.yml:20-25`, bun 1.4.2). `bunfig.toml` uses root `skills` and ignores `**/fixtures/**`.
  - There are no tags or timeouts. 24 files and about 150 of the 866 tests use real git, at about 0.5–1 s each.
  - Real-git blocks are labelled `describe("… (real git)")`. Read-only suites share a repo in `beforeAll`. Suites that change the repo use `beforeEach` and `cleanup`.
- **Reuse as-is.**
  - `tests/git-repo.ts`: `isolatedRunner` (:17), `isolatedAsyncRunner` (:21), `WorkingCopy` (:25), `TestRepo` with `clone` and `addWorktree` (:32), `repoWithOrigin` (:63).
  - `tests/stub-runner.ts`: `stubRunner`, `asyncStubRunner`, `cannedGh`.
  - `tests/tree.ts:15`: `createTree().spec()`.
  - `tests/factories.ts`: `phaseLine`, `phaseState`, `specMeta`, `specNode`, `claim`, `heldClaim`, `liveSession`.
  - `tests/board-factories.ts`: `NOW`, `specFixture`, `boardInputs`, `readyRow`, `flightRow`, `board`, `prRow`.
  - Raw fixtures in `tests/fixtures/` (`git-for-each-ref.txt`, …).

| Test | Where | Reuse | Create |
|---|---|---|---|
| Merge main with spec-doc and code conflicts | New `tests/<sync-module>.test.ts`: pure resolver cases first, then 1–2 real-git cases | `repoWithOrigin`, `clone()` as the main mover, the `publish.test.ts` shape (`mainMoves` :47-52, `onOrigin` :45), `mergeTreeOutcome` cases (:9-23) | Seeds: a same-line `updated:`, an `in-flight.md` overwrite, a `progress.md` tick, a `src/*.ts` edit (pattern from `publish.test.ts:82-91`) |
| Two sessions publish one spec | Extend `tests/publish.test.ts` (:27) and `publish-commands.test.ts:8-70` | `addWorktree` or `clone`, the race runners (:96-119), the `docs: main` settings | The case of two branches on the same spec |
| Git-derived `updated` | New pure parser test; extend the real-git `mainline-load.test.ts:11-82` | Fixture-loader idiom (`workspaces-classify.test.ts:6`) | Optional captured `git log -z` fixture. Update the assertions in `board-rank.test.ts:11,15`, `portfolio.test.ts:18-56`, `schedule.test.ts:72,77` |
| Per-phase in-flight | `context.test.ts:122-236`, `doctor.test.ts:112-119`, `hook.test.ts:31-47`, `spec-state.test.ts:4-18` | `phaseState` and `phaseLine` | In-flight files in the `context.test.ts:130-140` setup (no pack test writes one today) |
| Row store and reply parser | New tests | Store: `createTree`, `claims-store.test.ts:20-50`, `ownSessionId`. Parser: `test.each` tables as in `request.test.ts:5-30`, `readyRow` | — |
| Launching several rows | Extend `launch.test.ts:132-163` | Inline `PlaceFn` stubs, osascript `stubRunner`, `TERM_PROGRAM` env | Lift `added: Placement` if it is shared |
| Behind count on the board | `board-cells.test.ts:20-36`, `board-joins.test.ts:57,101`, `board-render.test.ts` | `parseAheadBehind` with the fixture, stubbed `for-each-ref` (`workspaces-scan.test.ts:49-52`), `push.test.ts:48-58` | — |
| Start and close composites | New `tests/<command>.test.ts` in the `claim-command` and `trees-command` style. The command table auto-covers them | `ClaimDeps`, `PlaceDeps`, `BoardDeps` builders, fake Claude home, `gatesReport` (`playbook.test.ts:33-64`) | A deps factory. The fake-`ps` runner is copied 3× inline; export it once |
| Prose pins | Extend `skill-wiring.test.ts` | `readFileSync` plus `toContain` (Outcome pin :115-121), section slicing (:91) | — |

- **Fixture gap.** No builder seeds a spec folder in a real-git repo; each suite writes `CLAUDE.md`, `progress.md` and `phases/` inline. A small `seedSpec(repo, name, …)` helper pays off across the new real-git suites.
- **Lessons on tests.** `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner` (pure parsers first, real git only for what git alone proves) and `gotcha-bun-test-runs-in-utc-but-spawned-children-do-not` (pass `TZ` for `%cI`).

## Extraction for reuse (each with its cost)

1. **Move `pinDefault` and `originTip`** (`publish/snapshot.ts:22-30`) to `core/`, with one "fetch, else use the last fetched tip" helper.
   - The fallback has 3 copies: `mainline/load.ts:59-65`, `trees/acquire.ts:24-26`, `trees/prune.ts:39-41`. There are 5 importers.
   - Sync and the session start both need it.
   - Cost: imports, plus existing tests (`mainline-load` 5, `trees-acquire` 5, `trees-prune` 4, `snapshot:45`).
   - `publish/push.ts:21` runs a raw fetch and should use the helper.
2. **Add a sync `isAncestor(git, a, b)`.**
   - Users: `snapshot.ts:61`, the start check "merge main if not an ancestor", and pr-babysit's planned `pr/main-fixed.ts`.
   - Cost: 1 call site plus new tests.
3. **Make `doctor/run.ts:74-77` read `state.inFlight`** instead of re-reading the disk.
   - After that, `core/spec-state.ts` is the only in-flight reader, so the per-phase switch has one seam.
   - Cost: `spec-state.test.ts:17` and `doctor.test.ts:114-117`.
4. **Lift the Spec-state parser into `core/`** (`pr/resolve.ts:14-21`, the `SPEC_STATE` and `PR_LINK` regexes plus `specPrNumbers`).
   - The same file read is copied 4× (`pr/resolve.ts:30`, `board/load.ts:88`, `commands/gates.ts:19`, `doctor/run.ts:39-40`).
   - **pr-babysit decision 9 plans the same move.** Do it once, in whichever spec lands first.
   - Cost: 1 test import (`pr-status.test.ts:3`).
5. **One constant for "All phases complete — see pr-opening.md for the PR gate."** It has 4 copies: `execute.md:24`, `update.md:177`, `commands/context.ts:105`, `context/packs.ts:80`. No test pins it.
6. **Promote `sequencedRunner`** (`tests/pr-report.test.ts:16-27`) into `tests/stub-runner.ts`. Shared with pr-babysit.
7. **Split `needsYou` into a source list** (`board/attention.ts:16-20`) before adding the "far behind main" source. Shared with pr-babysit.
8. **A shared report-header rule** as a new SKILL.md section, like *Next sessions*, that the mode templates point at.
   - "Refresh the Spec state" prose is copied 4× with drifting fields (`handoff.md:20`, `update.md:175`, `execute.md:117,156`). The definition is at SKILL.md:435.

## Don't extract

- **The two behind counts.** `rev-list` against a ref and `for-each-ref` against a pinned sha with shallow guards (`classify.ts:38-41`) stay separate.
- **The async is-ancestor and merge-base batches** (`prune.ts:67`, `scan.ts:50`). They are `runAll` jobs, not the sync helper.
- **`fetchClaims` (`claims/remote.ts:39`) and the branch fetch (`trees/acquire.ts:21`).** They fetch other refs.
- **`pinBase` keeps returning its fetch result.** The board header uses it (`board/lanes.ts:169-172`).
- **"Project dir = repo toplevel."** The project dir can legitimately be a subfolder (`core/spec-folders.ts:50`, `mainline/load.ts:52` `--show-prefix`). The subfolder fix must find the *spec root*: walk up to the nearest `docs/specs`. It must not jump to the toplevel.
  - Known gap: CRM's `_playbook` sits at the root only, so running from `landing/` loses settings today.
  - `spec-bump.sh` stays bash (the no-Bun path, `schedule.test.ts:118-119`) and needs its own fix.
- **`referencedGates` and `SPEC_STATE`.** Different sections, different parsers. `core/markdown.ts` has no section-body accessor.
- **Board `inFlight` names** (`lanes.ts:24,43,84`, `attention.ts`, `rank.ts`, `graph/*`). They mean flight rows or session holders, not the file.
- **The duplicated `updated` tie-break** (`board/rank.ts:17`, `portfolio/order.ts:10`). Two sort orders on different row types.
- **Per-mode report bodies.** Handoff, update, review and status carry different facts. Share the header only.
- **The `${CLAUDE_SKILL_DIR}/tools/spec.ts` invocations.** Pinned by `skill-wiring.test.ts:11-74`.

## Decisions for `create` to lock (surfaced, not resolved)

1. **Stale plugin version: how much to build.** It shows up as about 66 stale calls in 14 long sessions spanning a release; every session starts on the newest version.
   - (a) A `bin/spec` launcher forwarding to the newest cached version. Risk: new tools running under old prose; outside typecheck and tests.
   - (b) `spec.ts` adds one line when a newer version sits in the cache: "plugin 2.42.0 installed; this session runs 2.41.0 — /reload-plugins". Cheap and honest.
   - Recommend (b).
2. **`pr-opening.md` Spec state: derive vs write (crosses pr-babysit).**
   - Derivable: phases, PR groups, branch, PR state.
   - Not derivable: gate evidence, timings, and Anton's ordering decisions. Those go to the ledger or the PR body.
   - pr-babysit decision 9 adds a merge-record *writer* to the same section.
   - Recommend: a tool renders the Spec state, and pr-babysit takes merge facts from the PR. Needs Anton, as it changes a neighbor's plan.
3. **Sync while pr-babysit watches the PR.** A push restarts CI.
   - Recommend: sync never pushes on its own when the PR has checks running; pr-babysit calls sync when it decides.
4. **Gate, prep and create rows.**
   - Recommend: this spec adds no gate row kind or launch target; pr-babysit owns the PR moment.
   - Launched prep and create keep their real stops.
   - Fix the board labelling a brief-only spec as `create` while recon is unfinished (`mainline/load.ts:83-85`)?
5. **In-flight shape.** `in-flight/<phase>.md` (new `READ_SET` glob, legacy fallback to `in-flight.md`), or a per-phase file inside `phases/`.
6. **`updated:` written vs derived.**
   - Recommend: derive it for board and list from one cached git pass, and stop writing it in sessions.
   - `spec-bump.sh <name>` would become a no-op. The doctor and hook would stop requiring the field.
7. **Spec `ledger/INDEX.md` and `code-map.md`.**
   - INDEX can be derived like the project ledger.
   - code-map collided once.
   - Recommend: derive INDEX, leave code-map (value first).
8. **Names.**
   - Commands: `spec.ts start <spec> <phase>`, `spec.ts close <spec>`, `spec.ts sync`.
   - Reply: `spec.ts launch pick <n…>`, reading the session's printed rows.
   - A SKILL.md *Reports* section.
9. **Pack overflow.** Cap the project-lessons block, which is 17.7K of a 47K pack and has no budget. Pick the limit so the pack stays under about 28K.
