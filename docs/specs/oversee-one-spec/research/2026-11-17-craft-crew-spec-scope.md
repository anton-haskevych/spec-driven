---
date: 2026-11-17
wave: craft
lens: craft
slug: crew-spec-scope
brief: product-brief.md
---

# Craft Wave — crew-spec-scope

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

T = `skills/spec/tools`, tests in `T/tests/`.

## House conventions every new piece follows
- Logic in a domain folder (`T/crew`, `T/ready`, `T/trees`, `T/publish`, `T/claims`), command file only wires + prints. Kebab-case noun file names, named exports, `Result<T>` (`T/core/result`), tagged-union outcomes + a render function (`MainSync`/`syncLine`, `T/publish/sync-main.ts:8-12,44-55`).
- Deps = interface + `system*Deps()` (`T/crew/deps.ts:11-30`); test overrides as `Partial<Ports>` (`TickPorts`, `T/commands/crew/tick.ts:38-54`).
- Group command: `T/commands/crew.ts` `ACTIONS` table; one file per action `T/commands/crew/<verb>.ts` exporting `CREW_<VERB>_USAGE` + `crew<Verb>(projectDir, args, deps = systemCrewDeps())`; args via `parseArgs({strict:true})`, failure → `usage: …` (`T/commands/crew/overseer.ts:81-97`).
- Output: last stdout line is the result, exit 0 always. Success `Label: … · …` (`Crew: started for …`, `Remote: pushed …`, `Ready now:`); refusal lowercase `<command>: <what happened>; <what to do>`.

## New files: name, home, exemplar
| Piece | Home | Exemplar |
|---|---|---|
| Per-spec run state | extend `T/crew/run-state.ts` (spec frontmatter field) + `T/crew/deps.ts` `runFileStore` (scope param, default `run.md`) | `run-state.ts` `withSection`/`setFrontmatterLine`; briefs already `<spec>#<phase>.md` |
| Build order (batches, longest chain) | new pure `T/ready/<noun>.ts` (e.g. `build-order.ts`) beside `ready-set.ts`; render in `T/ready/render.ts`; surfaced as `ready <spec> --waves` (needs a `READY_USAGE` + `parseArgs` in `T/commands/ready.ts`, usage inline at `T/spec.ts:57` today) or `crew plan <spec>` (`T/commands/crew/plan.ts`) | `ready-set.ts`, `renderPrGroups` (`T/ready/render.ts:15-25`) |
| Tree base | `T/trees/acquire.ts:16-29` `addTree` param renamed `base`; threaded via `PlaceRequest` (`T/trees/place.ts`) | itself |
| Merge-back + push | new `T/publish/<noun>.ts` (e.g. `merge-back.ts`), outcome union + render; command wrapper `T/commands/<verb>.ts` | `T/publish/sync-main.ts` (off-checkout merge, ff, union, render), retry from `T/core/land-on-ref.ts:38-67` |
| PR base | `T/pr/actions/open.ts:97-107` (single spot) + `T/commands/pr/open.ts` | itself |
| Overseer claim id | `T/claims/pr-claim.ts` (add an overseer id beside `prClaimId`) | `pr-claim.ts` (15 lines) |
| Phase-writer warning | `PhaseOutcome.notice` (`T/plan/phase-writer.ts:22-29,73-76`), `withLines` (`T/plan/write-notice.ts:34-38`) | itself |
| Machine-wide ceiling | `crew:` key in `T/playbook/settings.ts` (`CrewSetting` :33-37, default :55, `SECTION_KEYS` :66, `crewSetting()` :149-155, summary :112-120); count from unfiltered `loadAgents` (`T/sessions/agents.ts:27-42`) | commit `c775378` (#29) added the `crew:` keys: list of files it touched is the checklist |

- New sub-command (if `oversee` becomes one): `SKILL.md` :4, :43, :56, :73, :75, :89; `T/context/request.ts:9`; `T/launch/command-line.ts:35-37`; thin skill `skills/spec-<cmd>/SKILL.md` (exemplar `skills/spec-oversee-crew/SKILL.md`); `T/runtime/workflow-capabilities.ts:14`; `README.md:26,28`. Pinned by `skill-wiring.test.ts:92-121`, `launch.test.ts:114,127-128`, `workflow-capabilities.git.test.ts:42`. A spec argument on `oversee-crew` instead changes only :56, :73, :89 prose + launch refusal text.
- Mode doc layout to follow: `oversee-crew.md` (intro, rules, command table, numbered §1–§6); templates in `crew-brief.md`.
- Release: `python3 scripts/version.py --set <v>` (3 manifests, CI checks), ROADMAP section + `in PR` row, flipped to `shipped` after merge; minor + 1 at merge time.

## Fixtures: reuse vs create
**Reuse as-is:** `repoWithOrigin` (`T/tests/git-repo.ts:80-104`, bare origin + clone, takes a branch), `isolatedRunner`/`anonymousRunner` (:17,26); racing-runner + pre-receive patterns (`publish.git.test.ts:47-52,93-145`); `fakeRef` (`fake-ref.ts:25`, `racerBeforeNextPush`) for ff-push-with-retry; `fakeRemote` (`fake-remote.ts:14`); `sequencedRunner`, `stubRunner`, `strictRunner`, `notARepoRunner`, `gitStub({commonDir,…})` (`stub-runner.ts:8,44,65,74,104`); `routeGh`/`cannedGh` (:58,38); `fakeClock`; `createTree`, `withSettings` (`tree.ts`); `phaseState`, `phaseEdges`, `specNode`, `liveSession`, `claim`, `heldClaim` (`factories.ts`); `readyRow`, `specFixture` (`board-factories.ts`); `RUN` fixture (`crew-run-state.test.ts:4-26`); `fixtures/claude-agents.json`.
**Create:** a fast `CrewDeps` builder on `gitStub` (`crew-deps.ts` imports `git-repo.ts` at :4 → any fast test importing it fails the guard; fast-tests phase 8 plans this — if done here, drop `crew-deps.ts` from `HELPER_EXCEPTIONS` in the same diff); a shared `tickPorts` fake (lift `crew-tick.git.test.ts:32-46` into `tests/crew-ports.ts`); per-spec run-file builder; an integration-branch origin only inside a `.git` file built in `beforeAll`.

**Test homes:** extend `crew-run-state.test.ts`, `crew-tick-step.test.ts:68-98` (pickRows; :71-87 change meaning), `crew-overseer.test.ts`, `claims-rules.test.ts` (after :84-98), `pr-claim.test.ts`, `pr-gh-writes.test.ts:11-22`, `trees-acquire.git.test.ts` (REPO_BUILD exception, adding allowed), `settings.test.ts`, phase-writer tests (`phase-task.test.ts` with `phaseDeps`). New: `crew-run-store.test.ts` (gitStub), `ready-build-order.test.ts` (pure), `publish-merge-back.test.ts` (fakeRef) + at most one `publish-merge-back.git.test.ts`, `pr-open-base.test.ts` (gitStub + sequencedRunner), `crew-close-out-run.test.ts` (strictRunner; close-out-run has no direct test today).

**Rules the tests obey:** real git only for code that runs git; every `.git.test.ts` listed in `real-git/allowlist.ts` `REAL_GIT_FILES` with a reason, `REAL_GIT_CAP` (74) raised in the same diff; repos built in `beforeAll` (existing crew/trees exemplars use `beforeEach` under `REPO_BUILD_EXCEPTIONS` — don't copy); fast tier has a git tripwire (`real-git/tripwire/git`); ISO dates near now for `--since`; `realpathSync` for spawned-path compares; explicit `TZ` when crossing processes; bun default 5 s timeout, blackhole/bogus-negotiation workarounds for offline cases.

## Extraction opportunities (do first, each small, already covered)
- **(a)** `runFileStore(projectDir, runner, scope?)` defaulting to `run.md` — 5 callers unchanged; one test added. Low.
- **(b)** `addTree` `defaultBranch` → `base`, one production caller (`T/trees/place-system.ts:38`) — one `.git` case in `trees-acquire`. Low. Mind `gotcha-trees-place-reads-pr-group-from-base`.
- **(c)** `mergeCommit(git, {first, second, message, conflict})` shared by `sync-main.ts:56-62` and `publish.ts:45-48` (argv identical; messages passed in, asserted verbatim in `publish.git.test.ts`, `push.git.test.ts`). Merge-back is the third caller; retry via a `RefPort` whose `commit` runs the merge (`T/core/land-on-ref.ts:19` is file-shaped). Low.
- **(d)** Build order composes `phaseNeeds` (`T/ready/ready-set.ts:39-42`) + `resolvedPhaseKeys` (`T/board/phase-keys.ts:11-17`) as `unblockCounts` does (`T/board/rank.ts:29-30`). New pure file; no shared adjacency helper.
- **(e)** `pickRows` `exclusiveKey(row)` (default `row.spec`) + scope filter; `tick.ts:118-124` builds `busy` with the same key. Pure tests. Low.
- **(f)** `claimTarget(id)` → `{phase} | {pr, group} | {named}` in `T/claims/pr-claim.ts`, branch on it only in `takeRefusal` and `claimKey`; fix `T/crew/close-out.ts:29` hand-rolled `pr-${group}` to `prClaimId`. 10 pr-claim special-case sites otherwise untouched. Low.
- **(g)** optional `branch` on `CloseOutWorld` (`T/crew/close-out-run.ts:12-17,47`); one caller `tick.ts:155`. Medium-low (git).

## Don't extract
- `treeName`/`specOfBranch` rewrite (6 callers) — choose an integration-branch shape the `SPEC_BRANCH` regex parses correctly instead.
- PR docs / PR body generation; the whole-board tick (parameterise store + pick, don't fork); folding publish's retry into `landOnRef`; renaming `pinDefault`/`landOnMain`; moving `needsCycle` onto `resolvePhaseRef`; a claim-kind type across all 10 pr-claim sites; a spec scope inside `Board` (`gotcha-board-lane-json-is-the-whole-model`).

## Craft decisions for create to lock
1. Entry: `oversee-crew <spec>` (spec argument on the existing mode) vs a new `oversee` sub-command (thin skill + wiring tests).
2. Build-order surface: `ready <spec> --waves` vs `crew plan <spec>`.
3. Integration branch name that `specOfBranch` parses and that doesn't collide with `feat/<spec>` (no-`pr:` group branch).
4. Per-spec run file name under `crew/` (e.g. `run-<spec>.md` vs `<spec>/run.md`) and how the whole-board run and spec runs see each other.
5. Machine-wide ceiling key name under `crew:` and its default.
