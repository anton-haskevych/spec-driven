---
date: 2026-11-11
wave: craft
lens: craft
slug: store-records-tests
brief: product-brief.md
---

# Craft Wave — store, records, tests

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Three agents: naming and placement, test conventions and fixtures, extraction-for-reuse. Paths are relative to
`skills/spec/tools/` (`tests/` is `skills/spec/tools/tests/`); `R/` is the plugin repo root.

## Corrections to wave 2
- **There is one `progress.md` parser, not two.** `graph/nodes.ts:42` calls the same `parsePhaseLines`
  (`core/progress.ts:24`) as `core/spec-state.ts:51`. Only the phase-id derivation is repeated (`nodes.ts:43`,
  `spec-state.ts:61`), with the same result.
- **Only two of the five `pr-opening.md` sites read PR numbers,** and they already share `specPrNumbers`
  (`pr/resolve.ts:20`; `board/load.ts:95`, `pr/resolve.ts:49`). `commands/gates.ts:19` and `doctor/run.ts:41` read gate
  references (`playbook/gates.ts:18`); `pr/actions/merge.ts:86` is the merge-line write.
- **Of the five direct `CLAUDE.md` reads, only two are true copies** of `loadNodes`: `trees/place-system.ts:84` and
  `commands/crew/launch-session.ts:77` (which reads the placed tree's copy).

## Naming and placement

### How the code is organised
- `spec.ts:37-62` is a flat `COMMANDS` registry: `{ usage: X_USAGE, run }`.
- `commands/` holds thin adapters (`parseArgs`, call a domain function, return one line). A command with sub-actions is
  a dispatcher plus a folder with an `ACTIONS` map (`commands/crew.ts:12-28`, `commands/pr.ts`).
- `core/` holds cross-domain pieces; each domain folder owns one concept. The rule is unwritten and broken once
  (`core/land-spec-field.ts:2` imports from `commands/push`).
- Files are 20–80 lines typically; none over 250. Tests are flat: `<area>-<topic>.test.ts`.
- A new command is refused under Codex local-pilot unless listed (`runtime/workflow-capabilities.ts:18-35`).

### Idioms to follow
| Kind | Convention | Exemplar |
|---|---|---|
| Function prefixes | `load*` disk, `parse*` text, `read*` typed fields + problems, `decode*` JSON → `Result`, `check*` → `Issue[]`, `render*`, `plan*` pure, `apply*` local write, `land*` commit onto origin, `mirror*` remote side | `planTick`, `landOnMain`, `mirrorTake`, `decodeClaimDocument` |
| Ports | interface + factory returning `undefined` when unavailable; `Runner = systemRunner` default; bundles named `XDeps` | `RemotePort` / `gitRemotePort` (`claims/remote-take.ts:7-34`), `GhClient` (`pr/gh.ts:8,24`), `GhWrites` (`pr/actions/gh-writes.ts:24-27`) |
| Results | `Result<T>` (`core/result.ts`); outcomes are unions on `kind`, each kind defined in a comment | `MainLanding` (`core/land-on-main.ts:13-16`), `TakeOutcome`, `MirrorTake` |
| Messages | refusal `<cmd>: <reason>`, lower-case, says what was not written and what to do; success `<cmd>: <spec> is <value> (<sha7>)` | `land-spec-field.ts:49`, `land-on-main.ts:28,33` |
| Validation | parsers collect `problems: string[]` through helpers (`oneOf`, `stringArray`, `count`); the doctor turns them into `Issue`s; JSON decoders stop at the first reason | `playbook/settings.ts:36-39,64-95,138-184`, `claims/document.ts:21-37` |
| Versions | a constant (`BOARD_VERSION = 3`, `board/model.ts:8,200`) or an inline `schemaVersion` check with a legacy path (`claims/document.ts:26-27`) | — |

### New pieces and their exemplars
| Piece | Imitate | Home by the existing rule |
|---|---|---|
| Record store (read, version-pinned write, retry) | `claims/remote.ts` + `remote-take.ts` (port, lease, `MAX_ATTEMPTS`, 10 s, no prompt), `pr/actions/gh-writes.ts` (exit code first), `core/land-on-main.ts` (retry wording) | **none clear**: claims keep their own store, `land-on-main` is in `core/` |
| Local mirror for grep | `mainline/base-cache.ts` under `<common>/spec-board/` | next to `base/` and `claims/` |
| Typed records (card, source, tag, spec, phase, PR, session, question) | `claims/document.ts` (decode + version), `board/model.ts` (types), `backlog/items.ts` | **none clear**: overlaps `runtime/sessions.ts`, `pr/`, `core/park.ts`, `crew/run-state.ts`, `backlog/` |
| Reader with file fallback | `core/spec-state.ts:39-53` and `readThroughEdits` (`core/apply-edits.ts:31-35`), which already composes a reader | must not make `core/` import the store |
| Write commands | `commands/owner.ts`, `ship.ts` with `focus/plan.ts` + `land.ts`; grouped verbs like `commands/crew.ts` | `commands/` + a domain folder |
| Settings key | `playbook/settings.ts` (`SECTION_KEYS`, `ProjectSettings`, `DEFAULT_SETTINGS`, `describeSettings`), `doctor/settings.ts`, `SKILL.md:101` | `playbook/` |
| Page | **no precedent** (no server, HTML or port); nearest are `board/render.ts` and `board --json` | none |

A command lands with: the `spec.ts` entry, a `SKILL.md` `## Tools` bullet (`:94-115`, ends "A tool command, not a
`/spec` sub-command."), the mode file's trigger table, a ROADMAP row, and a version bump in three manifests
(`R/scripts/version.py:35-44`). Trace: `owner` (commit `9978d9c`), `focus` (`19130cc`).

### House rules
- Agentic only; no SessionStart hook; Bun + TypeScript, zero dependencies; fail open; degrade gracefully
  (`R/ROADMAP.md:11-27`).
- 250 lines per file, 50 per function, at most 4 parameters, one concept per file (`structural-principles`).
- Two names for one concept is a finding (`code-quality-review:56`): pick one of card / idea / backlog item.
- Lessons: a failed `gh api` still prints valid JSON (`gotcha-gh-api-error-body-is-valid-json`); `spec.ts` exits 0 when
  it refuses.

## Test conventions and fixtures

- Suite: 1511 tests, 205 files, about 120 s; 43 files spawn git (0.5–1 s per real-git test). No snapshots.
- Commands are tested by calling the command function with injected deps and asserting the whole output string with
  `toBe` (`claim-command.test.ts:55-57`, `publish-commands.test.ts:36`). Real-git suites are titled `"X (real git)"`.
- Time is `NOW` / `deps.now` (`board-factories.ts:9`) or `fakeClock()` (`fake-clock.ts:4`); session identity is
  `deps.env.CLAUDE_CODE_SESSION_ID` plus a temporary Claude home (`claim-command.test.ts:16-27`).
- Any code under test that runs git takes `isolatedRunner`
  (`gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`). Keep logic in pure planners.

| Fixture | Verdict |
|---|---|
| `tree.ts` `createTree().spec()` | reuse for the file-fallback suite |
| `git-repo.ts` `repoWithOrigin`, `.clone(name)` (a second machine), `.addWorktree()` | reuse |
| `factories.ts`, `board-factories.ts`, `pr-factories.ts`, `fake-clock.ts`, `stub-runner.ts` (`stubRunner`, `sequencedRunner`, `routeGh`) | reuse |
| `specStateFrom(spec, (path) => files[path])` (`spec-state.test.ts:11`) | reuse: the in-memory reader pattern |
| `context-fixture.ts:7` `contextDeps`, `board-factories.ts` `boardInputs` | extend with a store port / record field |
| Fake versioned document store | **create**; model on `fakeOrigin()` (`claims-remote-take.test.ts:13`: lease rules + `offline` flag), as a flat helper |
| Fake `gh api` transport (if the store uses the Git Data API) | **create**; `stubRunner` / `sequencedRunner` over `["gh","api"]` with JSON fixtures, as `pr-gh-writes.test.ts:57` |
| Card, source, tag, question and `SessionRef` factories | **create**, flat next to `pr-factories.ts` |
| Racing writers | reuse the pattern: a wrapping `racing: Runner` (`land-on-main.test.ts:51`) and `Bun.spawn` racers in `tests/fixtures/` (`claim-taker.ts`, `remote-claim-pusher.ts`) |

Tests that pin today's file behaviour (they become the file-fallback suite or are rewritten): ticks and items 52 tests
in 9 files; add / split 16 in 3; publish 31 in 6; ready and packs 57 in 8; board overlay 89 in 12.

Second exemplar: the Academy board's `doc-writes.test.ts` (8 tests) covers only the pure planner on an in-memory
snapshot (`conflict` returning the current doc, `version_required`, duplicates, delete). Its retry loop and GitHub
calls have no tests.

## Extraction opportunities

| Opportunity | Files | Test cost |
|---|---|---|
| **One item-count rule.** `core/phase-entry.ts:21-23` counts the Deliverables section; `phases/tick.ts:41` and `doctor/phases.ts:19` count every checkbox, so a phase can show complete on the board while tick refuses to close it. | ~10 lines in 3 files | 2 + ~14 + 1 + 5 test files |
| **One "write to the remote with retry" shape.** Claims (3 tries, 10 s, no prompt, own `offline` kind), `landOnMain` (2 tries, no timeout, offline = `failed`), publish (2 tries inline). Shared today: `pinDefault`, `NON_FAST_FORWARD`, `commitOnto`, `Result`. Four outcome unions, no shared loop. The two main-branch pushes run pre-push hooks and can wait on a credential prompt. | ~280 lines in 5 files | 7 + 2 + 2 |
| **One question shape.** Park (`core/park.ts`: asked-at, question, recommendation, answer; committed on the branch; board row `question`), crew questions (`crew/run-state.ts:23,96`: id, spec, phase, prose; one machine only; no board row; `oversee-crew.md:180-187` copies park entries into it), gate (`core/gate.ts`: no asker, time or text; no board row). | 3 modules | 2 + 5 + 1 + 8 |
| `readSpecFrontmatter(folder)` for the two true copies | ~8 lines | 5 |

### Don't extract
- **Claim and session identity:** `codex-runtime-support` phase 2b owns the move to `SessionRef` (26 files use the
  plain `Claim`; 6 use the versioned form); phase 3b owns crew run identity. Rely on `SessionRef`, don't unify here.
- The 5-try loop in `claims/store.ts:30-45`: a local file lock, not a remote write.
- `publish/publish.ts` merge-tree path: whole-snapshot semantics, and the shared record may retire it for state.
- `focus/plan.ts`, `doctor/spec-meta.ts`, `playbook/playbooks.ts:45`: they parse given text, need the invalid / none
  distinction, or need raw fields.
- The phase-id derivation in `nodes.ts` and `spec-state.ts`: one line each, both at the read seams.
- `board/lanes.ts:203`, `pr/babysit/poll.ts`, `pr/actions/rerun-plan.ts:23`: reads and CI waits, not shared-state writes.

## Craft decisions for the spec to lock
1. The folder for the store and for the records (one folder or one per entity), and whether the store is `core/`.
2. Where the store-backed reader lives so `core/` does not import the store.
3. One plan vocabulary (`ok | unchanged | invalid` vs `write | unchanged | refused`) and the name of the version-clash
   outcome (`conflict` vs `stale`).
4. Version style: a `RECORD_VERSION` constant or a `schemaVersion` field.
5. Command shape: one group with sub-actions or several top-level verbs; `board` and `list` are taken.
6. The settings key naming the board's home: its name, project-wide vs per-clone, and its `describeSettings` text.
7. The page's folder and how it is served.
8. One word for card / idea / backlog item across code and docs.
9. Whether the item-count rule, the retry shape and the question shape are unified in this spec or left.
10. Whether Codex local-pilot may run the new commands.
