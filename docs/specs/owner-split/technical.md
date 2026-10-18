# Owner Split — Technical

Paths relative to `skills/spec/tools/`. Ground truth: `research/2026-10-17-wave-1-owner-seams.md`
(seams) and `research/2026-10-17-craft-owner-split.md` (names, fixtures, extraction).

## Data

| Where | Field | Read by |
|---|---|---|
| spec `CLAUDE.md` | `owner: <name>` (exists) | `readOwnerField` (lifted out of `readFocusFields`, `core/spec-meta.ts:93-97`) |
| phase file frontmatter | `owner: <name>` (new read) | `loadPhase` → `PhaseState.owner` (`core/spec-state.ts:14-28,55-73`) |
| backlog idea frontmatter | `owner: <name>` (new read) | `parseBacklogItem` → `BacklogItem.owner` (`backlog/items.ts:9-19,36-46`) |
| `ReadyRow` | `owner?: string` = phase owner ?? spec owner | `phaseRow` (`board/lanes.ts:162-182`), `stageLanes` (`:139-160`, spec owner) |

`readOwnerField(data) → { owner?: string; problems: string[] }`, shaped like `readShipField`
(`core/spec-meta.ts:44-47,101-105`). Problem text unchanged: `owner <json> is not a name`.
Phase problems ride on `PhaseState` like `schedule.problems` (`doctor/schedule.ts:15`); backlog
problems in `doctor/backlog-item.ts`.

## Identity

```ts
// core/git.ts, beside authorName
export function runnerName(git: Git): Result<string>
// git -c user.useConfigOnly=true var GIT_AUTHOR_IDENT → name before " <"
// fails: { ok: false, reason: "can't tell who you are; set git user.name" }
```

`authorName` stays for the board's display "me" and claim holders (`claims/remote.ts:22` keeps
`?? "unknown"`). One exported `UNKNOWN` replaces `claims/remote.ts:16` and `board/people.ts:4`.

## Matching

```ts
// board/people.ts
// Offer a row to a person when nobody owns it or they do.
export function isOffered(owner: string | undefined, person: string): boolean
// owner === undefined || samePerson(owner, person)
```

## CLI contracts

| Command | Change |
|---|---|
| `spec.ts owner <spec> <name\|me\|none>` | New. Model: `commands/ship.ts` (`landOnMain`, `setFrontmatterLine` / `removeFrontmatterLine`, `findSpecs`). `me` → `runnerName`. Lines in design.md → CLI copy. Registered in `spec.ts` and the commands table (`tests/commands-table.test.ts`). |
| `board [lane] --who <name\|me>` | Guard at `commands/board.ts:45` lifted. `boardFor` filters ready / flight / blocked rows to `isOffered(row.owner, who)`; FOCUS keeps `focusFor`. Bare `board --who X` renders the person section, then the filtered lanes. `--json` returns the filtered model. `--who me` with no runner name → unfiltered model + `who: { unknown: true }` and the "Can't tell…" line in text. |
| `BOARD_VERSION` | 2 → 3 (`board/model.ts:8`); `tests/board-command.test.ts:36` pin. |
| `crew start` | Resolves `runnerName`; refuses on failure; success line adds `for <name>`. Run file frontmatter gains `runner: <name>` (`crew/run-state.ts:29-42,62-65`). |
| `crew tick` | `TickWorld` gains `me: Result<string>`; `systemTickPorts.world()` fills it and passes it to `buildBoard` (`commands/crew/tick.ts:25-30,133-139`). Failure → `crew tick: can't tell who runs this crew; …` and no refill. |
| `pickRows` | New `me: string` param; guard `if (!isOffered(row.owner, me)) continue;` (`crew/pick.ts:18-20`). |
| `launchCrewSession` | For `execute`: owner read from base before `placeForLaunch` (`commands/crew/launch-session.ts:42`) via an injected `OwnerReader` port; refusal `crew launch: <spec> is <owner>'s; this crew is <me>'s. …`. Babysit not gated. |

### Base owner read (launch gate)

```ts
// commands/crew/owner-on-base.ts
export type OwnerReader = (spec: string, phase: string) => string | undefined;
export function ownerOnBase(projectDir: string, runner: Runner): OwnerReader
// originTip (no fetch) → baseProject(git, sha).dir → findSpecs(dir, spec)
// → readOwnerField(CLAUDE.md) and loadSpecState(folder) phase owner; phase ?? spec
// not on base → same read against projectDir (trees/place.ts:106-107 precedent)
```

Tick passes a reader built from the nodes and states it already loaded (`tick.ts:135-138`)
instead of reading base again.

## Suggestions (prose that changes)

| File | Change |
|---|---|
| `SKILL.md` *Next sessions* step 1 | `board ready --who me --json`; the session's own spec keeps row 1; on `who.unknown` print the "Can't tell…" line |
| `SKILL.md` *Priority, due dates and owners* | owner = assigned on someone's word via `spec.ts owner`; never the creator; phase beats spec |
| `SKILL.md` *Tools* | one bullet for `spec.ts owner` |
| `execute.md` §0.2, `commands/context.ts:30-31` `APPLY_TOP_READY` | `board ready --who me --json --local` |
| packs (`context/packs.ts:43-48`, `commands/context.ts:94-106`) | ready list filtered with `isOffered` before `firstUnheld`; a chunk hint still wins |
| `oversee-crew.md` §1–§2, refusal list `:92-94`, `:119`; `crew-brief.md` | pick rule adds "owned by someone else"; new refusal bullets; "Anton" → "the person running the crew" |
| `list.md:11-12,25,59`; `idea.md:23` | "what is X on" → `board --who X`; "X is Taras's" → `spec.ts owner X taras` |

## Person section

```ts
// board/render-person.ts
export function personSection(board: Board, now: Date, who: string): string
```

Data, all already on the board model or its inputs:
- **owns:** every spec node whose `meta.owner` matches, with its lane state (ready phase, blocked reason, in flight, done). Needs the spec owner on flight/blocked rows too: `owner?` added there the same way as on `ReadyRow`.
- **on now:** remote claims whose `holder.user` matches (`claims/held.ts:27-33`), dropping phases done on base; for me, local claims too.
- **PRs:** open PRs whose `author` matches (`pr/checks/rollup.ts:94`), all specs, not only focus-linked.
- **sessions (me only):** `attributeSessions` (`board/attribution.ts`), repo-scoped.

`Board` gains `people?: { who: string; owns: …; claims: …; prs: … }` only under `--who`, so
the unfiltered JSON is unchanged apart from the version.

## File tree

```
skills/spec/tools/
├── core/git.ts                     runnerName, UNKNOWN
├── core/spec-meta.ts               readOwnerField
├── core/spec-state.ts              PhaseState.owner
├── backlog/items.ts                BacklogItem.owner
├── board/model.ts                  owner on ready/flight/blocked rows, people, BOARD_VERSION 3
├── board/lanes.ts                  phase ?? spec owner
├── board/people.ts                 isOffered, boardFor over every lane
├── board/render.ts                 (owner) in readyNote
├── board/render-person.ts          NEW personSection
├── commands/owner.ts               NEW spec.ts owner
├── commands/board.ts               --who on every lane
├── commands/crew/owner-on-base.ts  NEW OwnerReader
├── commands/crew/launch-session.ts gate before placement
├── commands/crew/tick.ts           me in TickWorld
├── commands/crew/overseer.ts       crew start resolves me
├── crew/pick.ts                    owner guard
├── crew/run-state.ts               runner: in frontmatter
├── context/packs.ts                filtered ready before firstUnheld
└── tests/git-repo.ts               anonymousRunner (no identity)
```

New files stay under 250 lines, functions under 50 (`principles.md`).
