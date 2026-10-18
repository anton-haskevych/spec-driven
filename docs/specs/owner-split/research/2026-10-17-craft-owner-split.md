---
date: 2026-10-17
wave: craft
lens: craft
slug: owner-split
brief: product-brief.md
---

# Craft Wave — owner-split

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Paths relative to `skills/spec/tools/` (tests: `skills/spec/tools/tests/`). Three agents: naming & placement, tests & fixtures, extraction (which also closed wave 1's base-read gap).

## Verified

**Base read before placement (wave-1 gap, closed)**
- `launchCrewSession` (`commands/crew/launch-session.ts:34-47`) has no `projectDir`; ports are `store`, `deps` (`crew/deps.ts:11-18`) and the `place` closure (captures `projectDir` at `commands/crew/launch.ts:16`, `commands/crew/tick.ts:146`). `shipOf` (`:72-80`) reads the placed tree, so it can't serve the gate.
- Cheapest base read, no fetch: `originTip` → `baseProject(git, sha)` (`mainline/load.ts:49-57`) → `findSpecs(dir, spec)` (`core/spec-folders.ts:54`) → `readSpecMeta(parseFrontmatter(CLAUDE.md).data)` + `loadSpecState(folder)`. Precedent: `core/land-on-main.ts:32-37`. Heavier alternative: `loadMainline(git, branch, {local:true})` (`mainline/load.ts:36-46`) parses every spec. `defaultBranch` (`core/run.ts:87-93`) may call `gh` when `origin/HEAD` is unset.
- Branch-only specs are absent from base; placement falls back to the checkout (`trees/place.ts:106-107`), the owner read needs the same.
- Tick already holds base `inputs.nodes` (`tick.ts:135-138`) and drops them; placement re-reads base (`trees/place.ts:103`).
- Babysit targets a PR group; its phases come from private `wholeGroup` (`trees/place.ts:127-131`).

**Identity probe (git 2.54, macOS)**
- With no config at all, `git var GIT_AUTHOR_IDENT` exits 0 with the GECOS name (`Anton Haskevych <…@Antons-Laptop.local>`): the made-up fallback happens on Mac too, not only Linux.
- `git -c user.useConfigOnly=true var GIT_AUTHOR_IDENT` fails (128, "Author identity unknown") with no configured identity, and still honours `GIT_AUTHOR_NAME`/`EMAIL` env (so `isolatedRunner` tests stay green). Switching to `git config user.name` instead would break `git.test.ts:63`, `board-inputs.test.ts:173`, `board-command.test.ts:100` (isolatedRunner sets env, not config).
- `tests/git.test.ts:69-70` stub matches argv prefix `["git","var"]`; inserting `-c …` before `var` makes it fall through to the default failure and pass vacuously.
- `core/run.ts:34,51` merges `{...process.env, ...options.env}`: tests can override env but never unset it.

## Naming & placement (each with its exemplar)
| New piece | Home | Exemplar / idiom |
|---|---|---|
| Fail-closed "who runs this" | `core/git.ts`, beside `authorName` (`:35-38`) | `Result<T>` (`core/result.ts:1`); helpers `gitCommonDir` `:41`, `stateDir` `:48` |
| "Is this for person X" predicate (owner unset or matches) | `board/people.ts` | `isMe` (`:58-60`, make exported `is…`), `samePerson`; filters named `<thing>For(rows, who, me?)` (`boardFor` `:45`, `focusFor` `:51`); one-line why-comment per export. `ownerOf` is taken (worktrees) |
| Owner reader (spec, phase, idea) | `core/spec-meta.ts` | lift owner out of `readFocusFields` (`:93-97`) as a one-field reader shaped like `readShipField`/`ShipField {ship?, problems}` (`:44-47,101-105`); shared-reader model `readSchedule` (`core/schedule.ts:16`) |
| `owner?: string` on `PhaseState` | `core/spec-state.ts:14-28`, `loadPhase` `:55-73` | `playbook` (`:70`) plain optional |
| `owner?: string` on `BacklogItem` | `backlog/items.ts:9-19,36-46` | flat field list (`created: stringField(...)`) |
| `owner?: string` on `ReadyRow` | `board/model.ts:65-88` | copy `FocusRow.owner?: string` (`:148`), no comment |
| Phase → spec owner fallback | `board/lanes.ts` `phaseRow` `:162-182` | inline `??` like priority `:175`, due `:164`; `stageLanes` destructures `node.meta` `:144` |
| Pick filter | `crew/pick.ts:18-20` | one more `if (…) continue;` guard; `me` threaded through `TickWorld` (`commands/crew/tick.ts:25-30`); `buildBoard(..., me)` like `board/load.ts:39` |
| Launch refusal | `commands/crew/launch-session.ts` after `:39-40`, before `:42` | `crew launch: <reason>` returned as `{ text }` (`:36,40,47`); statement `;` rule form (`commands/crew/check.ts:17`); prose bullet `- \`<line>\` → <action>.` at `oversee-crew.md:92-94`, table row `:119` points to it; §2 pick rule run-on list `:82-85` |
| "Can't tell who you are" lines | crew start / tick / launch | `crew start: CLAUDE_CODE_SESSION_ID is unset; run it from the overseer session` (`commands/crew/overseer.ts:28`), `crew tick: can't read sessions (…); acting on nothing` (`tick.ts:55`) |
| Filtered suggestions & per-person view | extend `--who <name\|me>` | `commands/board.ts:10,38,45` (lift the focus-only guard), `ME` (`people.ts:3`); no `--mine`/`--all` precedent; `ready` and `list` take no `--who` today (`commands/ready.ts:8`, `commands/list.ts:20-21`) |
| Per-person render | `board/render-<name>.ts` exporting `<name>Section(board, now, who)` | `focusSection` (`board/render-focus.ts:12`), title `FOCUS · ${who}` (`:17`), `lane(title, lines)` (`board/cells.ts:9`), cell `${work.person}: …` (`:66-71`); data `FocusWork` (`board/model.ts:136-141`) |
| Owner mark on ready rows | `readyNote` (`board/render.ts:71-74`) | joins band · stale · placement with ` · `; precedent `— (<owner>)` (`render-focus.ts:70`) |
| Prose | `SKILL.md:156-172` Next sessions (one sentence in step 1 `:160` or step 2 `:169`); `SKILL.md:385-387` owners paragraph; `list.md:11-12,25` "what is X on"; `oversee-crew.md:82-94,119`; `idea.md:23` | one-paragraph sibling rules |

## Fixture map
| Need | Action | Where |
|---|---|---|
| Phase / backlog owner | reuse (`Partial` overrides) | `factories.ts:16-29` `phaseState`, `:62-64` `backlogItem` |
| Owner rule messages | reuse, mirror | `spec-meta.test.ts:37-43` bad values `[42, null, ["anton"], " "]` → `owner <json> is not a name`; `doctor.test.ts:35-41` |
| Phase parse in memory | reuse | `spec-state.test.ts:5-18` `specStateFrom` |
| Phase parse on disk + doctor | reuse pattern | `phase-gates.test.ts:7-47` (`createTree`, `tree.spec`, `afterAll(tree.cleanup)`, `onlyPointer`) |
| Backlog parse / doctor | extend | `backlog.test.ts:22-34` (toEqual ignores undefined), `:41-67` `problems()`; don't copy `:69-75` (mkdtemp, no cleanup) |
| Ready row owner, phase beats spec | reuse | `specFixture(name, {meta:{owner}, phases})` (`board-factories.ts:17-44`), `open`/`done` helpers (`board-lanes.test.ts:7-9`); mirror priority fallback test `board-rank.test.ts:53-63` |
| `pickRows` | extend 2 call sites | `crew-tick-step.test.ts:72,86` |
| Tick `me` | extend default | `crew-tick.test.ts:34` `TickWorld` literal; keep `me` in `TickWorld` so it's git-free (no test reaches `systemTickPorts.world()`) |
| Launch refusal | reuse throwing `PlaceFn` | `launch.test.ts:204`, `launch-background.test.ts:91`; assert run.md unchanged + no `briefs/` (`crew-launch.test.ts:82,89,94`); owned spec must be committed + pushed to base (helper `board-command.test.ts:77-82`) |
| Identity-less runner | create | `git-repo.ts` beside `isolatedRunner` (`:17-19`): `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`, no `GIT_AUTHOR_*`; build repo with isolated, pass anonymous only to code under test |
| Git-var stub | fix | `git.test.ts:69-70` prefix must include `-c` if added; stray formatting on `:70` |
| Board version | extend | `board-command.test.ts:36` hard-coded `2`; `board-lanes.test.ts:115`, `board-factories.ts:91` follow the constant |
| `--who` usage test | changes by design | `board-command.test.ts:105-108` |
| Per-person view | reuse | `board-people.test.ts:30-58`, `board-focus.test.ts:148-183` (`heldClaim("remote")` + holder, `prRow({author})`, `ME="spec-tests"`, no-git-name case `:180-182`) |
| Golden render | keep green | `board-no-focus-golden.test.ts:9-53`: render a mark only when an owner is set, never for unowned or when `me` is undefined |
| Base-spec writer | lift on second use | `board-command.test.ts:77-82` → `git-repo.ts` or new `spec-repo.ts` |

Throwing stubs exist (`pr-main-compare.test.ts:7-9` `unused`; "must not place"); no `as unknown as` anywhere in the repo.

## Extraction
- **Worth it**
  - `is…`-style "for person" predicate (owner unset or `samePerson(owner, me)`): serves `pickRows` (`crew/pick.ts:18`), `focusFor` owner clause (`people.ts:55`), the filtered ready view, the per-person view, and packs' phase pick by filtering before `firstUnheld`. Pure; tests in `board-people.test.ts`.
  - Owner reader lifted out of `readFocusFields`: serves `spec-meta.ts:51`, `loadPhase`, `parseBacklogItem`, `doctor/spec-meta.ts:21`, `doctor/backlog-item.ts:12-14`; phase problems kept on `PhaseState` like schedule (`doctor/schedule.ts:15`) instead of a third re-parse of the phase file.
  - Fail-closed identity next to `authorName`, used only on pick/suggest paths (tick, launch gate, filtered suggestions). Claims keep `?? "unknown"`. One exported `UNKNOWN` constant for `claims/remote.ts:16` and `board/people.ts:4` (the `samePerson` guard exists because of the claims fallback).
  - Optional: export `loadNode` (`graph/nodes.ts:38-56`) / a `specMetaIn(folder)` to dedupe the `CLAUDE.md` read at `graph/nodes.ts:39`, `launch-session.ts:75`, `playbook/playbooks.ts:45`; serves the base-side owner read.
  - Phase-else-spec owner stays inline `??` in `phaseRow` (two existing siblings); a helper only if the launch gate needs it too.
- **Don't extract**
  - `focusWork` bucketing (`people.ts:29-42`): per focus row; the per-person view reuses `remoteHeldClaims`/`HeldClaim.holder` (`claims/held.ts:27-33`) and `PrRow.author` directly.
  - `remoteClaims`/`openLinkedPrs` (`board/focus.ts:137-144`): one-spec filters.
  - `attributeSessions` (`board/attribution.ts:15-27`): call it; order fixed by `principle-session-attribution-scope-and-order`.
  - Render helpers `readyNote`, `whoCell`: display only.
  - `firstUnheld` (`context/held-phases.ts:5-13`): feed it a filtered list.
  - Plain `launch` / `placeForLaunch` (`commands/launch.ts:25-42`, `launch/place-for-launch.ts:9-14`): the brief doesn't block a person opening someone else's spec; gate only in `launchCrewSession`.
  - Run-file `QUESTION` regex (`crew/run-state.ts:45`): the owner rule replaces skip rows; don't widen it here.

## Craft decisions for create to lock
- Identity source: `git -c user.useConfigOnly=true var GIT_AUTHOR_IDENT` (fails closed on both OSes, keeps env-based tests green) vs reading `git config user.name`.
- Filtering surface: lift `--who` to every lane (`board ready --who me --json`) so Next sessions and execute §0.2 get a tool-filtered list, vs an owner field on ready rows that prose filters.
- Per-person answer: bare `board --who X` renders a cross-lane person section (new `render-<name>.ts`) vs `--who` filtering each lane in place.
- Launch-gate base read: thin `baseProject` + `findSpecs` path vs `loadMainline({local:true})`; pass tick's already-loaded nodes in vs re-read.
- Babysit gate: does the owner check apply to a babysitter on someone else's PR group?
- Next sessions' own-spec pin at row 1 when the session's spec belongs to the other person.
- Needs-you items, `spec.ts list`, `spec.ts ready`: mark the owner vs filter.
- Hard-coded "Anton" in crew prose: generalize to "the person running the crew" in this spec or not.
- One shared `UNKNOWN` constant across claims and people.
- BOARD_VERSION bump for the additive `owner` field (last bump was for new needs-you kinds).

## Still open
None for craft. Wave 1's base-read gap is closed above.
