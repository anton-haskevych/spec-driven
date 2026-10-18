# Owner Split — Technical

Paths relative to `skills/spec/tools/`. Ground truth: `research/2026-10-17-wave-1-owner-seams.md`
(seams), `research/2026-10-17-craft-owner-split.md` (names, fixtures, extraction) and
`reviews/2026-10-17-crew-gate-and-offer-filter.md` (what changed and why).

## Data

| Where | Field | Read by |
|---|---|---|
| spec `CLAUDE.md` | `owner: <name>` (exists) | `readFocusFields` (`core/spec-meta.ts:93-97`), unchanged parse and doctor message |
| `SpecMeta` | `ownerInvalid?: true` (new) | set when `owner:` is present but not a name; `ownerOf(meta)` returns `INVALID_OWNER` for it |
| `ReadyRow` | `owner?: string` = `ownerOf(node.meta)` | `phaseRow` (`board/lanes.ts:162-182`), `stageLanes` (`:139-160`) |
| `FlightRow`, `BlockedRow` | `owner?: string` (display, person section) | `board/flight.ts:20-39`, blocked push in `board/lanes.ts:113` |

Phases and backlog ideas get no owner (`ledger/decision-spec-level-owners-only.md`).

## People and identity

```ts
// core/people.ts (NEW; personKey, samePerson and UNKNOWN move here from board/people.ts)
export const UNKNOWN = "unknown";          // replaces claims/remote.ts:16 and board/people.ts:4
export const INVALID_OWNER = "?";          // a malformed owner: offered to no one
export function personKey(name: string): string
export function samePerson(a: string, b: string): boolean
export function hasMatchKey(name: string): boolean   // personKey(name).length >= 3
// Offer a row to a person when nobody owns it or they do.
export function isOffered(owner: string | undefined, person: string): boolean
// owner === undefined || (owner !== INVALID_OWNER && samePerson(owner, person))
export function ownerOf(meta: SpecMeta): string | undefined
```

```ts
// core/git.ts, beside authorName
export function runnerName(git: Git): Result<string>
// git -c user.useConfigOnly=true -c user.email=spec-driven@invalid var GIT_AUTHOR_IDENT
//   → the name before " <"
// fails: "can't tell who you are; set git user.name"
//        "git user.name <name> is too short to match anyone; use at least 3 letters"  (!hasMatchKey)
```

`authorName` keeps one job: the claim holder (`claims/remote.ts:22`, `?? UNKNOWN`).
`board/load.ts:39` passes `runnerName` (value only when ok) as `Board.me`.

## Landing a spec key on main

```ts
// core/land-spec-field.ts (NEW, beside core/land-on-main.ts; lifted from commands/ship.ts shipEdit/planShip)
export function landSpecField(projectDir: string, runner: Runner, edit: SpecFieldEdit): Promise<MainLanding<SpecFieldEdit>>
// SpecFieldEdit: { spec, key, value | undefined, same(current) → boolean, message }
// findSpecs on base → refuse none ("land the spec first") / many → unchanged → set or remove line → landOnMain
```

`ship.ts` becomes argument parsing plus copy on top of it; `focus` keeps its own band logic.

## CLI contracts

| Command | Change |
|---|---|
| `spec.ts owner <spec> <name\|me\|none>` | New, on `landSpecField`. `me` → `runnerName`; a name without a 3-char match key is refused. Lines in design.md → CLI copy. Registered in `spec.ts` and the commands table (`tests/commands-table.test.ts`). |
| `board ready --for <name\|me> [--keep <spec>]` | New flags, ready lane only (`board --for` without `ready` filters the ready lane in the full board). Ready rows kept when `isOffered(row.owner, name)` or `row.spec === keep`. Flight, blocked, you, FOCUS untouched. `--for me` with no runner name → unfiltered + `who: { unknown: true }` in JSON and the "Can't tell…" line in text. |
| `board [lane] --who <name\|me>` | Meaning unchanged ("that person's work"). Guard at `commands/board.ts:45` stays for lanes; bare `board --who X` gains the person section (phase 4). |
| `BOARD_VERSION` | 2 → 3 (`board/model.ts:8`); `tests/board-command.test.ts:36` pin. |
| `crew start` | Resolves `runnerName`; refuses on failure; writes `runner: <name>` to run.md (`crew/run-state.ts` `RunFile`/`NewRun`/`parseRunFile`); line becomes `Crew: started for <name> · overseer …` (pins in `tests/crew-overseer-command.test.ts:24,33,41`). Takeover rewrites `runner:` from the new session's `runnerName` and says so when it changed. |
| `crew tick` | Reads `run.runner`. Missing → close-out runs as usual, the refill is held like `--no-launch`, and `crew tick: can't tell who runs this crew; run crew start again. Launching nothing` goes to *for you*. No git call added; `buildBoard` unchanged. |
| `pickRows` | One object param `{ ready, states, busy, unanswered, slots, me }`; guard `if (!isOffered(row.owner, me)) continue;` (`crew/pick.ts:18-20`). `fillSlots` reads `run.runner`. |
| `launchCrewSession` | Reads `runner` from the run file it already parses (`launch-session.ts:36`); no runner → `crew launch: can't tell who runs this crew; run crew start again`. Passes `onlyFor: runner` for `execute` through `placeForLaunch`; babysit unchanged. Signature unchanged. |
| `placeTree` | `PlaceOptions.onlyFor?: string`. After `groupPhases`, owner = `ownerOf` of `inputs.nodes.get(spec).meta`, else of the checkout's `CLAUDE.md` for a branch-only spec. Not offered → `<spec> is <owner>'s; this crew is <me>'s. Open it in your own session instead`, plus `; its work so far is on <branch> in <path>. Push it or hand it to <owner>` when `findTree` finds the group's tree. Never `addPlacedTree`. |

## Suggestions (prose that changes)

| File | Change |
|---|---|
| `SKILL.md` *Next sessions* step 1 | `board ready --for me --keep <this session's spec> --json`; own spec still row 1; on `who.unknown` print the "Can't tell…" line |
| `SKILL.md` *Priority, due dates and owners* | owner = spec-level, assigned on someone's word via `spec.ts owner`, never the creator; phases and ideas have none |
| `SKILL.md` *Tools* | one bullet for `spec.ts owner`; Board bullet names `--for`/`--keep` |
| `execute.md` §0.2, `commands/context.ts:30-31` `APPLY_TOP_READY` | `board ready --for me --json --local` |
| `oversee-crew.md` §1.2 + heartbeat, §2 pick rule, refusal list `:92-94`, `:119`; `crew-brief.md` | plan reads `board ready --for me --json`; pick rule adds "owned by someone else"; new refusal bullets; "Anton" → "the person running the crew" |
| `list.md:11-12,25,59`; `idea.md:23` | "what is X on" → `board --who X`; "X is Taras's" → `spec.ts owner X taras`; ideas carry no owner |

Packs are not touched.

## Person section

```ts
// board/person-work.ts (NEW): pure, from BoardInputs
export function personWork(inputs: BoardInputs, board: Board, who: string): PersonWork
// board/render-person.ts (NEW)
export function personSection(work: PersonWork, now: Date): string
```

- **owns:** spec nodes whose `meta.owner` matches, with lane state from the board (ready phase, blocked reason, in flight, done).
- **on now:** remote claims whose `holder.user` matches (`claims/held.ts:27-33`), dropping phases done on base; for me, local claims too.
- **PRs:** open PRs whose `author` matches (`pr/checks/rollup.ts:94`), all specs.
- **sessions (me only):** `attributeSessions` (`board/attribution.ts`), repo-scoped.

`commands/board.ts` builds it when `--who` is set (`loadBoardInputs` + `buildBoard`, not `loadBoard`) and attaches `Board.people`; the unfiltered JSON is unchanged apart from the version.

## File tree

```
skills/spec/tools/
├── core/people.ts                  NEW personKey, samePerson, isOffered, ownerOf, UNKNOWN, INVALID_OWNER
├── core/git.ts                     runnerName
├── core/spec-meta.ts               ownerInvalid
├── core/land-spec-field.ts         NEW landSpecField (from ship.ts)
├── board/model.ts                  owner on ready/flight/blocked rows, who, people, BOARD_VERSION 3
├── board/lanes.ts, board/flight.ts owner on rows
├── board/load.ts                   Board.me from runnerName
├── board/people.ts                 imports matching from core; offerFilter (--for/--keep)
├── board/render.ts                 (owner) / (owner?) in readyNote
├── board/person-work.ts            NEW personWork
├── board/render-person.ts          NEW personSection
├── commands/owner.ts               NEW spec.ts owner
├── commands/ship.ts                on landSpecField
├── commands/board.ts               --for, --keep; person section under --who
├── commands/crew/launch-session.ts runner from run.md → onlyFor
├── commands/crew/tick.ts           runner from run.md; close out when unknown
├── commands/crew/overseer.ts       crew start resolves and records the runner
├── crew/pick.ts                    object param, owner guard
├── crew/run-state.ts               runner: in frontmatter
├── trees/place.ts                  PlaceOptions.onlyFor
├── launch/place-for-launch.ts      passes onlyFor for execute
└── tests/git-repo.ts               anonymousRunner (no identity, env blanked)
```

New files stay under 250 lines, functions under 50, params at most 4 (`principles.md`).
