# Active Work View — Technical

Ground truth: `research/2026-10-07-wave-1-board-sessions-storage.md` (seams, reuse, blast radius) and
`research/2026-10-07-craft-names-fixtures-extraction.md` (names, exemplars, fixtures, extractions).
`T` = `skills/spec/tools`.

## Focus entry file

`docs/specs/_focus/<spec>.md` (flat; `_` dirs are never specs; already in `READ_SET`). Filename = spec name.

```markdown
---
rank: 20          # required, integer ≥ 0; lower = higher in focus
who: taras        # optional; any name of the person (gh login preferred)
---

Optional one-line why (ignored by tools).
```

```ts
// T/focus/entries.ts
export const FOCUS_DIR = "_focus";
export interface FocusEntry { spec: string; rank: number; who?: string; file: string }
export function loadFocus(projectDir: string): FocusEntry[]          // sorted rank asc, then spec
export function parseFocusEntry(file: string, spec: string, text: string): FocusEntry | undefined
```

Mirror `T/backlog/items.ts` (`markdownFilesIn` guards a missing dir). Wired in `T/mainline/load.ts`
`loadSpecDocs` next to `loadBacklog` → `Mainline.focus` → `BoardInputs.focus: FocusEntry[]`.

**Validation.** `T/doctor/focus-entry.ts` (`checkFocusEntry`: rank is a non-negative integer; spec
exists; unknown keys warn) and `T/doctor/focus.ts` (`focusIssues`: duplicate ranks warn), wired in
`T/commands/doctor.ts` and the spec-file hook (`T/hooks/spec-file-check.ts`, new `FOCUS` path regex).

## Writer: `spec.ts focus`

```
focus add <spec> [--top | --after <spec>] [--who <name>]
focus drop <spec>
focus move <spec> (--top | --after <spec>)
```

Exemplar `T/commands/phase.ts` (`ACTIONS` record, `FOCUS_USAGE`, errors `focus <action>: <reason>`).
Planners in `T/focus/plan.ts` return `EditPlan` (`T/core/apply-edits.ts`), applied by `applyEdits`.

Rank arithmetic (`T/focus/rank.ts`, pure):
- `add` default: `max + 10` (first entry: 10). `--top`: `min − 10`, floored at 0; when `min` is 0,
  renumber all to 10, 20, … first.
- `--after X`: midpoint of X and its successor (successor absent → X + 10). No integer gap → renumber
  only the entries from X's successor down by +10 steps until a gap opens. Renumbering is the only
  multi-file write.
- `move` = recompute the moved entry's rank by the same rules; never touches other files unless a
  renumber is needed.
- Validates: spec exists (`resolveSpec`), not already in focus (`add`), in focus (`drop`/`move`).

The writer never commits. `list.md` tells Claude to commit (`[focus] <verb> <spec>`) and land it like
spec docs: `publish-docs` (carries any `docs/specs/**` path) on a branch; on the default branch in a
`docs: main` project, `spec.ts push` refuses code, not docs.

## Board model (additive, `BOARD_VERSION` 1)

```ts
// T/board/model.ts
export type FocusNow =
  | { kind: "flight"; phases: string[]; next: FlightNext[] }
  | { kind: "ready"; phases: string[]; step: NextStep }
  | { kind: "deploy"; phases: string[] }          // undeployed phases this spec waits on
  | { kind: "blocked"; reason: string }
  | { kind: "branch-only" } | { kind: "unknown" } | { kind: "idle" };

export interface FocusSession { label: string; status: SessionStatus; since: string; mine: true }
export interface FocusWork {
  person: string;                                  // "me" or a display name
  mine: boolean;
  sessions: FocusSession[];
  claims: { phase: string; since: string }[];      // remote claims only (local ones show as sessions)
  prs: PrCell[];
}
export interface FocusRow {
  spec: string;
  rank: number;
  who?: string;
  progress?: { done: number; total: number };
  stage?: SpecStage;
  due?: string;
  overdue: boolean;
  now: FocusNow;
  work: FocusWork[];
}
// Board.lanes.focus: FocusRow[]   Board.footer.otherSessions?: string[]
// AttentionRow += { kind: "idle-claim"; spec; phase; since } | { kind: "focus-shipped"; spec }
```

## Builder and attribution

- `T/board/focus.ts` — `focusRows(entries, board-so-far, inputs, now): FocusRow[]` (pure, plural-noun
  idiom). Called once from `buildBoard` (`T/board/lanes.ts`) after the other lanes exist, so it reads
  finished `inFlight` / `ready` / `blocked` rows filtered by `row.spec` (no shared group-by helper).
  Finished specs are skipped (they go to `focus-shipped`).
- `T/board/attribution.ts` — `attributeSessions(sessions, inputs): Map<spec, LiveSession[]> & { other }`:
  1. claim with this `sessionId` → that claim's spec;
  2. `ownerOf(session.cwd, workspace paths)` → that workspace's `states` keys, if exactly one;
  3. `parseSessionName(name)` → `<spec>` when `nameSource` is `user` or absent, the first token is a
     known spec node and the second is in `SUB_COMMANDS`; phase via `isPhaseId`.
  Own session (`ownSessionId`) is included (the board isn't a tree-safety check).
- `T/sessions/live.ts` gains optional `nameSource?: "user" | "derived"` (explicit read; anything else →
  undefined) — the only reader of session files (`gotcha-claude-session-files-are-undocumented`).
- People: `T/board/people.ts` — `samePerson(a, b)` (normalize: lowercase, strip `[^a-z0-9]`; equal or
  one a prefix of the other, min 3 chars), `myName` from `BoardInputs.me` (git author name, loaded in
  `board/load.ts` via the existing `readHolder` path).
- PR author: `T/pr/gh-lists.ts` adds `author` to `OPEN_FIELDS`; `PrRow.author?: string` from
  `author.login` (`isRecord`) in `T/pr/rollup.ts`. PRs join specs through `prLinks` (unchanged).

## Attention

`T/board/attention.ts` adds two private builders spread into `needsYou`:
- `idleClaims`: a local claim whose status is `live` and whose session `status !== "busy"` and
  `olderThanDays(session.updatedAt, now, IDLE_CLAIM_DAYS)` (`IDLE_CLAIM_DAYS = 2`).
- `shippedFocus`: focus entries whose spec `isFinished`.

## Render

`T/board/render-focus.ts` (new; `render.ts` is 106 lines): `focusLane(board, who?)` using `lane()`,
`alignColumns`, `rowName`, `ago`, `prCell` from `T/board/cells.ts`. `render.ts`: `LANES` gains
`"focus"` first; `sections.focus` omitted when `lanes.focus` is empty; header count prefix; two
`attentionCells` lines. `T/commands/board.ts`: `--who <name>` (only with the `focus` lane or none).

## Ranking

`T/board/rank.ts` `rankReady`: focus rank first (rows of focus specs before others, by focus rank),
then today's order (overdue → priority → due → unblocks → updated → name). `markSafe` unchanged.

## Extractions (phase 1, behavior-preserving)

| # | Extract | From | To |
|---|---|---|---|
| 1 | `sessionLabel(name, sessionId)` | `trees/find.ts:92-94`, `claims/rules.ts:59-61` | `T/sessions/label.ts` |
| 2 | `sessionsByWorkspace(sessions, paths)` | `board/joins.ts:40-47`, `trees/find.ts:87-90` | `T/sessions/by-workspace.ts` |
| 3 | `deployWaits(states, nodes)` → `{ waiter, target }[]` | `board/attention.ts:66-75` | `T/board/deploy-waits.ts` |
| 4 | `splitKey(key)` | `board/flight.ts:86-89`, `board/attention.ts:73` | `T/board/phase-keys.ts` |
| 5 | `olderThanDays(then, now, days)` | `board/attention.ts:10,44` | `T/core/age.ts` |
| 6 | `phaseProgress(phases)` → `{ done, total }` | `portfolio/rows.ts:37`, `context/status-table.ts:49` | `T/graph/progress.ts` |
| — | Shared test factories `liveSession`, `claim`, `heldClaim`, `prRow` | ~10 test files (craft snapshot) | `T/tests/board-factories.ts` |

Not extracted: list/board arg parser, group-rows-by-spec, folder-of-markdown reader, `ago`, `isOverdue`,
`ownerOf`, `treeHolder` (reasons in the craft snapshot).

## `list` fix

`T/commands/list.ts`: `--local` is consumed (board with `local: true`; table ignores it) and any other
`--flag` is dropped from the filter instead of filtering on it.

## File tree (new)

```
skills/spec/tools/
  focus/entries.ts  focus/plan.ts  focus/rank.ts
  commands/focus.ts
  board/focus.ts  board/attribution.ts  board/people.ts  board/render-focus.ts  board/deploy-waits.ts
  sessions/label.ts  sessions/by-workspace.ts
  core/age.ts  graph/progress.ts
  doctor/focus-entry.ts  doctor/focus.ts
  tests/focus-entries.test.ts  focus-plan.test.ts  focus-rank.test.ts  focus-command.test.ts
        board-focus.test.ts  board-attribution.test.ts  board-people.test.ts  board-render-focus.test.ts
        sessions-label.test.ts  sessions-by-workspace.test.ts  core-age.test.ts  graph-progress.test.ts
        board-deploy-waits.test.ts
```

## Prose touched

`skills/spec/list.md` (FOCUS lane, focus words → `focus add|drop|move`, "my focus" / "what's <name> on"
→ `board focus --who`), `SKILL.md` (*Tools*: Focus bullet; *List*/*Board* mention the lane),
`handoff.md` (last phase of a focus spec → `focus drop`), `README.md`, `ROADMAP.md` row.
