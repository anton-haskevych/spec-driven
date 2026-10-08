# Active Work View — Technical

Ground truth: `research/2026-10-07-wave-1-board-sessions-storage.md` (seams, reuse, blast radius),
`research/2026-10-07-craft-names-fixtures-extraction.md` (names, exemplars, fixtures, extractions) and
`reviews/2026-10-07-focus-storage-and-landing.md` (what changed after review). `T` = `skills/spec/tools`.

## Focus in spec meta

```markdown
---
…
priority: p1
focus: 20         # optional; finite number ≥ 0; lower = higher in focus
owner: taras      # optional; the documented "one named person" key; gh login preferred
---
```

- `T/core/spec-meta.ts`: `SpecMeta` gains `focus?: number` and `owner?: string`; `readSpecMeta` reads
  them (a non-number `focus` → undefined). The board reads `node.meta.focus` from the base nodes it
  already loads; there is no new loader and no `BoardInputs.focus`.
- Validation: `checkSpecMeta` (`T/doctor/spec-meta.ts`) errors on a `focus` that isn't a finite number
  ≥ 0 and on a non-string `owner`. The spec-file hook already runs it on every `CLAUDE.md` write.
- `T/core/frontmatter-patch.ts` gains `removeFrontmatterLine(text, key)` (with continuation lines), the
  inverse of `setFrontmatterLine`.

## Writer: `spec.ts focus`

```
focus add <spec> [--top | --after <spec>]
focus drop <spec>
focus move <spec> (--top | --after <spec>)
```

Exemplar `T/commands/phase.ts` (`ACTIONS` record, `FOCUS_USAGE`, errors `focus <action>: <reason>`).
Ownership is not the writer's job: Claude sets `owner:` with an ordinary spec-doc edit.

**Base-first** (`ledger/decision-focus-writes-land-on-default-branch.md`). `T/focus/land.ts`:
1. `pinDefault(git, branch)` (`T/publish/snapshot.ts`) → the tip sha.
2. Read every spec's `focus:` at that tip (base nodes, as the board loads them) and the target spec's
   `CLAUDE.md` text at the tip (`git show <tip>:<path>`). Refuse a spec that isn't on the base.
3. `T/focus/rank.ts` (pure) gives the new rank; the planner gives the new `CLAUDE.md` text
   (`setFrontmatterLine` / `removeFrontmatterLine`).
4. Commit that one file onto the tip with a scratch index and `commit-tree -p <tip>`, subject
   `[focus] <verb> <spec>`. Extract the scratch-index part of `snapshotCommit` into a shared
   `commitOnto(git, base, files, message)` in `T/publish/` (second use).
5. `git push origin <commit>:refs/heads/<default>`; a non-fast-forward (`NON_FAST_FORWARD`, exported
   from `T/publish/publish.ts`) retries from step 1 once, as `publishDocs` does; any other refusal
   prints `focus: push to <default> refused: <reason>`.

The working tree is never touched. A checkout catches up the next time it merges main; the added or
removed line is far from `updated:`, so that merge is clean.

**Rank arithmetic** (`T/focus/rank.ts`, pure over `{ spec, rank }[]` sorted by rank then spec; the
moved spec is removed first):
- `add` default: `max + 10` (empty: 10). `--top`: `min − 10`, or `min / 2` when that would be < 0.
- `--after X`: midpoint of X and the next entry with a rank **greater** than X's (none → X + 10).
- `move` = the same over the set without the moved spec. Never touches another spec.
- Refusals: spec not on the base; already in focus (`add`); not in focus (`drop` / `move`); `--after`
  target not in focus. A malformed `focus:` counts as not in focus, so `add` overwrites it.

## Board model (additive, `BOARD_VERSION` 1)

```ts
// T/board/model.ts
export type FocusNow =
  | { kind: "flight"; phases: string[]; next: FlightNext[] }
  | { kind: "ready"; phases: string[]; step: NextStep }
  | { kind: "deploy"; phases: string[] }          // undeployed phases this spec waits on
  | { kind: "blocked"; reason: string }
  | { kind: "paused" }
  | { kind: "merging"; pr: number }               // finished on base, a linked PR still open
  | { kind: "none" };

export interface FocusSession { label: string; sub?: string; phase?: string; status: SessionStatus; since: string }
export interface FocusWork {
  person: string;                                  // display name; me first
  mine: boolean;
  sessions: FocusSession[];                        // this machine's, so only on the mine bucket
  claims: { phase: string; since: string }[];      // remote claims only (local ones show as sessions)
  prs: PrCell[];                                   // open only
}
export interface FocusRow {
  spec: string;
  rank: number;
  owner?: string;
  progress?: { done: number; total: number };
  stage?: SpecStage;
  due?: string;
  overdue: boolean;
  now: FocusNow;
  work: FocusWork[];
  unattributedPrs: PrCell[];                       // open linked PRs with no author
}
// Board.lanes.focus: FocusRow[]   Board.footer.otherSessions?: string[]   Board.me?: string
// ReadyRow.focus?: number
// AttentionRow += { kind: "idle-claim"; session: string; spec: string; phases: string[]; since: string }
```

| `FocusNow.kind` | Copy |
|---|---|
| `flight` | `executing <ids>` or the flight row's `next` text |
| `ready` | `ready <ids>` (max 3, `+N`), `ready: /spec create`, `ready: /spec prep` |
| `deploy` | `needs deploy of <ids>` |
| `blocked` | `blocked: <reason>` |
| `paused` | `paused` |
| `merging` | `merging #<n>` |
| `none` | `—` |

## Builder and attribution

- `T/board/focus.ts` — `focusLane(lanes, inputs, now): { rows: FocusRow[]; otherSessions: string[] }`.
  Called once from `buildBoard` (`T/board/lanes.ts`) after the other lanes exist; reads finished
  `inFlight` / `ready` / `blocked` rows filtered by `row.spec`. Specs with `focus:` that are `paused` or
  open are rows; finished ones are rows only while a linked PR is open (`merging`). Progress, due and
  overdue come from `specSummary` (extraction #6). `otherSessions` = this repo's sessions not on any
  row, and only when there are rows.
- `buildBoard` sets `ReadyRow.focus` from `node.meta.focus` before `rankReady`.
- `T/board/attribution.ts` — `attributeSessions(sessions, inputs, focusSpecs): { bySpec: Map<string,
  LiveSession[]>; unattributed: LiveSession[] }`:
  0. keep sessions with `ownerOf(session.cwd, inputs.worktreePaths)`; `worktreePaths` is every
     `git worktree list` path, loaded in `board/load.ts` the way `claimContext` does
     (`T/claims/held.ts`), not the live-only `inputs.workspaces`;
  1. a claim with this `sessionId` → that claim's spec;
  2. `parseLaunchTitle(name)` (`T/launch/title.ts`) → `<spec>` when the spec is a base node;
  3. `ownerOf(session.cwd, workspace paths)` → a workspace that is **not** `isMain` whose `states` keys
     include exactly one focus spec.
  The own session (`ownSessionId`) is included (the board isn't a tree-safety check).
- `T/board/joins.ts` is unchanged in behaviour (design decision 16).
- People: `T/board/people.ts` — `samePerson(a, b)` (normalize: lowercase, strip `[^a-z0-9]`; equal or
  one a prefix of the other, min 3 chars; `unknown` never matches), `personKey(name)`, and
  `focusFor(rows, who, me): FocusRow[]`. Bucketing: local sessions and anything `samePerson(me)` → me;
  everything else keyed by `personKey`. `me` = one `git var GIT_AUTHOR_IDENT` in `loadBoard`.
- PR author: `T/pr/gh-lists.ts` adds `author` to `OPEN_FIELDS`; `PrRow.author?: string` from
  `author.login` (`isRecord`) in `T/pr/rollup.ts`. Linked PRs come from `linkedPrs` and render through
  `toPrCell` (extraction #7), open only.

## Attention

`T/board/attention.ts` adds one private builder spread into `needsYou`, one spread per line:
- `idleClaims`: local claims whose status is `live`, whose row is on the board (the `shown` filter
  `oldRemoteClaims` uses), whose session's `status` is not `busy` (a `shell` session counts as idle),
  whose `updatedAt` was read from the file (not the `startedAt` fallback; `T/sessions/live.ts` marks it),
  and `olderThanDays(session.updatedAt, now, IDLE_CLAIM_DAYS)` (`IDLE_CLAIM_DAYS = 2`). Grouped to one
  row per session. Sessions unreadable → none.

## Render

`T/board/render-focus.ts` (new): `focusLane` text using `lane()`, `alignColumns`, `rowName`, `ago`,
`prCell` from `T/board/cells.ts`. It takes the filter name only for the title. `render.ts`: `LANES`
gains `"focus"` first; the section is skipped when `lanes.focus` is empty, except `board focus` prints
`FOCUS\n  none`; header count prefix; one `attentionCells` line; the ready row's `focus <n>` note.
`T/commands/board.ts`: `--who <name|me>` (only with the `focus` lane or none) runs `focusFor` before
both `--json` and text.

## Ranking

`T/board/rank.ts` `rankReady`: rows with `focus` first, by `focus` ascending; then today's order
(overdue → priority → due → unblocks → updated → name). `markSafe` unchanged. Agents that read the top
ready row change behaviour with it: `skills/spec/execute.md` (offer the top ready row),
`T/commands/context.ts` (`OFFER_TOP_READY`), `T/tests/context.test.ts`.

## Extractions (phase 1, behavior-preserving)

| # | Extract | From | To |
|---|---|---|---|
| 1 | `sessionLabel(name, sessionId)` | `trees/find.ts:92-94`, `claims/rules.ts:59-61` | `T/sessions/label.ts` |
| 2 | `sessionsByWorkspace(sessions, paths)` | `board/joins.ts:40-47`, `trees/find.ts:87-90` | `T/sessions/by-workspace.ts` |
| 3 | `deployWaits(states, nodes)` → `{ waiter, target }[]` | `board/attention.ts:66-75` | `T/board/deploy-waits.ts` |
| 4 | `splitKey(key)` | `board/flight.ts:86-89`, `board/attention.ts:73` | `T/board/phase-keys.ts` |
| 5 | `olderThanDays(then: Date, now: Date, days)`, strict (`then < now − days`) | `board/attention.ts:10,44` | `T/core/age.ts` |
| 6 | `specSummary(node, today)` → `{ progress, priority, due, overdue }` | `portfolio/rows.ts:30-38` | same file, exported; `specRow` uses it |
| 7 | `toPrCell(pr)` (was private `prCell`), `linkedPrs(prs, links)` | `board/joins.ts:60-74` | `board/joins.ts`, exported |
| 8 | `launchTitle(spec, sub, phase?)` / `parseLaunchTitle(name)`, round-trip test | `launch/command-line.ts:26-27` | `T/launch/title.ts` |
| — | Factories `liveSession`, `claim`, `heldClaim` → `tests/factories.ts`; `prRow` → `tests/board-factories.ts` | ~10 test files (craft snapshot) | migrate a copy only where the defaults fit; thin local wrappers stay |

Not extracted: list/board arg parser, group-rows-by-spec, folder-of-markdown reader, `ago`, `isOverdue`,
`ownerOf`, `treeHolder`, `status-table.ts`'s done count (reasons in the craft snapshot and the review).

## `list` fix

`T/commands/list.ts`: a pure `listRoute(args): { kind: "board"; local: boolean } | { kind: "table";
args: string[] } | string`. `--local` alone → board with `local: true`; `table`/filters (with or without
`--local`) → table; an unknown `--` flag → `usage: list …`. Tested without git, like `parseBoardArgs`.

## File tree (new)

```
skills/spec/tools/
  focus/rank.ts  focus/plan.ts  focus/land.ts
  commands/focus.ts
  board/focus.ts  board/attribution.ts  board/people.ts  board/render-focus.ts  board/deploy-waits.ts
  sessions/label.ts  sessions/by-workspace.ts  launch/title.ts
  core/age.ts
  tests/focus-rank.test.ts  focus-plan.test.ts  focus-land.test.ts  focus-command.test.ts
        board-focus.test.ts  board-attribution.test.ts  board-people.test.ts  board-render-focus.test.ts
        sessions-label.test.ts  sessions-by-workspace.test.ts  core-age.test.ts  launch-title.test.ts
        board-deploy-waits.test.ts  list-route.test.ts
```

## Prose touched

`skills/spec/list.md` (FOCUS lane; focus words → `focus add|drop|move`; "my focus" / "what's <name> on"
→ `board focus --who`, falling back to their remote claims; `claim idle` actions), `SKILL.md` (*Tools*:
Focus bullet; *List*/*Board* mention the lane; *Priority, due dates and owners* mentions `focus:`),
`execute.md` (top ready row now ranks focus first), `README.md`, `ROADMAP.md` row.
