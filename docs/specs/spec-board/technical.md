# Spec Board — Technical

Ground truth:
- Mechanics and timings: `research/2026-10-01-wave-1-sources-and-layers.md`.
- Names, exemplars and extraction: `research/2026-10-01-craft-layers-names-fixtures.md`.
- Corrections to both: `reviews/2026-10-01-pre-build-collegium.md`.

Paths are relative to `skills/spec/tools/`. No new dependencies. Files stay under 250 lines, functions
under 50.

## File tree

```
core/
  run.ts               + RunOptions.timeoutMs (spawnSync `timeout`); AsyncRunner, systemAsyncRunner,
                         runAll(runner, jobs, concurrency) — never rejects, results in order
  git-status.ts        new  parsePorcelainZ (moved from context/infer-spec.ts)
  schedule.ts          + compareSchedule(a, b)
mainline/              new domain
  base-cache.ts        baseCache(git, sha, commonDir) → dir (async): git archive -o <tmp>.tar of the
                         matching read-set patterns, Bun.Archive extract, rename to base/<sha>/; keep 2
  load.ts              loadMainline(git, branch, { timeoutMs, local }) → { base, nodes, states, backlog,
                         settings } via pinDefault + baseCache + the unchanged disk loaders
graph/
  overlap.ts           + sharedPaths(node, other, usage) core; undeclaredOverlaps uses it;
                         + inFlightOverlaps(nodes, name, inFlight)
portfolio/order.ts     orderSpecs / orderBacklog use compareSchedule
commands/list.ts       no args → board; filters / `table` → portfolioTable (sync, unchanged output)
commands/board.ts      new  board [<lane>] [--json] [--local]
pr/
  gh-lists.ts          new  ghLists(cwd, asyncRunner, timeoutMs) → openPrs(), recentPrs() (async, beside
                         the sync GhClient)
  rollup.ts            new  checkBucket, rollupToChecks (gh's bucket mapping + latest run per name and
                         workflow), toPrRows
  types.ts             + PrRow
workspaces/            new domain
  list.ts              parseWorktreeList (porcelain), loadWorkspaces(git)
  classify.ts          parseAheadBehind, classifyWorkspaces(…, pinned) → merged | live | unknown-base |
                         unreadable
  changes.ts           workspaceSpecChanges(asyncRunner, workspace, baseSha) — isSpecDocPath +
                         locateSpecFile
sessions/              new domain
  live.ts              parseSessionFile, loadLiveSessions(claudeHome, procStarts) → Result<LiveSession[]>
  proc-starts.ts       psProcStarts(runner): one `TZ=UTC ps -o pid=,lstart=` call
claims/                new domain
  store.ts             claimsDir(git), takeClaim(dir, claim, isStale), releaseClaim, loadClaims
  rules.ts             claimStatus(claim, sessions, workspaces, baseDone) — pure
board/                 new domain
  inputs.ts            BoardInputs, BaseRef, SpecStage — types only (adapters import them)
  load.ts              loadBoardInputs — composes one call per source; loadBoard → buildBoard
  activity.ts          phaseActivity(baseStates, workspaceScans) → Map<key, PhaseActivity> — pure
  lanes.ts             buildBoard(inputs, now) → Board — in flight / ready / blocked
  attention.ts         needsYou(…) — pure
  joins.ts             attachSessions, attachPrs, workspaceForSpec — pure
  rank.ts              rankReady — pure
  model.ts             Board, rows, BOARD_VERSION
  render.ts            renderBoard(board, { lane? }); lanes, header, footer
  cells.ts             cell formatters (ago via Intl.DurationFormat narrow), alignColumns by Bun.stringWidth
context/packs.ts,
commands/context.ts    pick and resume suggestion skip live-claimed phases
commands/claim.ts      new  claim take|release|list
launch/command-line.ts phase hint + target workspace (cd) or claude -w
tests/                 board-factories.ts, stub-runner.ts (+ asyncStubRunner), git-repo.ts
                       (+ addWorktree, isolatedAsyncRunner), fixtures/{git-worktree-list.txt,
                       git-for-each-ref.txt, gh-pr-list-open.json, gh-pr-list-all.json,
                       session-busy.json}
```

## Sources (adapters)

All adapters take their dependencies as parameters (`principles.md` §11): `Git`, `AsyncRunner`,
`GhClient`, `claudeHome`, `now`. Defaults are wired in `commands/board.ts` only.

### mainline (base)

1. Call `defaultBranch(projectDir, runner)` once.
2. Unless `--local`, run `pinDefault(git, branch)` with `timeoutMs: 10_000`.
   - On failure: `rev-parse --verify refs/remotes/origin/<b>^{commit}` and `fetch: { ok: false, reason }`.
   - A `cannot lock ref` reason renders as "busy", not "offline".
   - No origin ref at all → the board is unavailable (see design *States*).
3. Pin `baseSha` and get `baseDate` from `git log -1 --format=%cI <sha>`. Every later git call
   (ahead-behind, diff) uses the sha, never the ref name.
4. `baseCache(git, sha, commonDir)`. The read set is the pathspec
   `:(glob)docs/specs/*/*.md :(glob)docs/specs/*/phases/**/*.md :(glob)*/docs/specs/*/*.md
   :(glob)*/docs/specs/*/phases/**/*.md`.
   - `git archive` exits 128 when any one pattern matches nothing (a single-root repo). List
     `git ls-tree -r --name-only -z <sha>` and keep the patterns that match a path (`Bun.Glob`); none →
     an empty base dir (preflight 2026-10-01).
   - Run `git archive --format=tar -o <tmp>.tar <sha> -- <patterns>`. Use `-o`, because `Runner`
     decodes stdout and would corrupt the tar.
   - Extract with `Bun.Archive` into `<tmp>/`, then `rename` the folder to `base/<sha>/`. If two runs
     extract the same sha, the loser's `rename` fails, so it removes its temp dir and uses the winner's.
   - A cache hit touches the folder's mtime; keep the newest 2 sha folders by mtime.
   - Loaders read `join(base, git rev-parse --show-prefix)`, so the base mirrors the cwd.
5. Run `loadNodes(dir)`, `listSpecs(dir)` → `loadSpecState`, `loadBacklog(dir)` and `loadSettings(dir)`,
   all unchanged. Specs without `progress.md` get a stage: `prep` (no `product-brief.md`, or a
   `seed.md`) or `create`; `BoardInputs.stages` carries it. These are real paths, so every `spec.dir` reader (`pr/resolve.ts`, `portfolio/rows.ts`)
   works.

### workspaces

- `git worktree list --porcelain` gives
  `Workspace { path, head, branch?, detached, locked, prunable, isMain }`.
  - Accept `locked [reason]` and `prunable <reason>` lines.
  - Normalize paths with `realpathSync` when they exist. Claims use the same normalization.
- Ahead/behind per branch:
  `git for-each-ref --format='%(refname:short) %(ahead-behind:<baseSha>)' refs/heads`.
- Unmerged detached heads: `git rev-list --no-walk <detached shas…> ^<baseSha>`.
- Classes:

  | Class | Rule |
  |---|---|
  | `merged` | Behind-only or an ancestor of base, and no claim or live session points at it |
  | `live` | Everything else |
  | `unknown-base` | No merge base (`merge-base` exits 1), checked when a diff fails or when ahead > 1000 |
  | `unreadable` | Any other git failure for that worktree |
  | dropped | `prunable` |

- `workspaceSpecChanges` runs per live workspace, in parallel (`runAll`, concurrency 8):
  - Committed: `git diff --name-only <baseSha>...<head>`, filtered by `isSpecDocPath`.
  - Uncommitted: `git --no-optional-locks -C <path> status --porcelain -z --untracked-files=all --
    docs/specs ':(glob)*/docs/specs/**'`, parsed by `parsePorcelainZ`.
  - The main checkout runs the uncommitted query only.
  - Spec names come from `locateSpecFile`.
- Result: `WorkspaceScan { workspace, specs: string[] }`. The spec's state is read with
  `loadSpecState` on the worktree's own spec folder. A folder without `CLAUDE.md` is skipped.

### sessions

- `<claudeHome>/sessions/*.json` gives `LiveSession { pid, sessionId, cwd, status: "busy" | "idle",
  name?, updatedAt: Date, procStart }`.
- `procStarts` comes from one `ps -o pid=,lstart= -p <pids…>` call.
- A file is kept when its pid's `lstart` equals the file's `procStart`. This defeats pid reuse after a
  crash or reboot.
- Several files with one `sessionId` → the newest `updatedAt` wins.
- `updatedAt` is parsed defensively (epoch ms or ISO).
- `loadLiveSessions` returns `{ ok: false, reason }` when the directory is missing or unreadable, or a
  file fails to parse twice. Callers treat liveness as `unknown`.
- `claudeHome` defaults to `~/.claude`.

### claims

File: `<git-common-dir>/spec-board/claims/<spec>#<phase>.json`
(`git rev-parse --path-format=absolute --git-common-dir`):

```json
{ "spec": "alert-noise-cleanup", "phase": "8", "sessionId": "67e7b436-…", "sessionName": "alert-noise-cleanup execute 8",
  "workspace": "/Users/…/claude-worktrees/crm/alert-noise-cleanup-pr-d", "branch": "feat/alert-noise-cleanup-pr-d",
  "claimedAt": "2026-10-01T13:40:12-07:00" }
```

**Writing a claim.** Write the JSON to `<file>.tmp-<sessionId>`, then `linkSync(tmp, file)`, then remove
the temp file. `link` fails with `EEXIST` when the claim exists, and readers never see a half-written
file.

**`takeClaim(dir, claim, isStale)`**, where `isStale` is passed in by the command from `claimStatus`:
1. Refuse when the phase id isn't one of the spec's phases on base, or in the caller's own workspace
   view.
2. Refuse when another workspace's `PhaseActivity` shows the phase as wip or ticked:
   `phase 4 is in progress in <workspace>`.
3. Try to create the claim. On `EEXIST`, read the existing claim. An unparseable claim counts as live.
4. The existing claim is the caller's own session → ok (idempotent).
5. `isStale(existing)` is true, meaning status `closed`, `gone` or `done`. Liveness `unknown` is never
   stale.
   - `renameSync(file, "<file>.stale-<callerSessionId>")`. Only one rename succeeds; on `ENOENT`, go back
     to step 3.
   - Create the claim again (link). Report `took over from <name>`.
6. Otherwise refuse: `claimed by <name> in <workspace>`.

`take` and `release` also remove `.stale-*` files, plus claims whose status is `done` or `gone`. A claim
whose session is live is never removed. The board never writes.

**`releaseClaim(spec, phase?)`** removes the caller's claims for that spec, or for that phase.

**`claimStatus` (pure)**, checked in this order:

| Status | When | Shown |
|---|---|---|
| `unknown` | The sessions source failed | — |
| `live` | Its session is in the live set | — |
| `done` | The phase is ticked on base | — |
| `gone` | The workspace is no longer listed | — |
| `closed` | None of the above | Under needs you |

No prep claims.

#### Remote layer (phase 5a)

Local claims only guard one clone. Across machines, each claim is mirrored as a ref on origin:
`refs/spec-claims/<spec>/<phase>`.

- **Payload:** `git commit-tree <empty tree> -m <claim JSON + holder>`, where holder =
  `{ user: git user.name, host }`. A commit (not a blob), so any host accepts the ref.
- **Take:** `git push origin --force-with-lease=<ref>: <sha>:<ref>`. The empty lease means the ref must
  not exist, and the server checks the old value atomically. If the push is rejected, fetch the existing
  ref and refuse with `claimed by <user>@<host> (<sessionName>) <age> ago`.
- **Same holder:** the existing ref's payload has the caller's `sessionId` → ok (idempotent).
- **Take over (escape hatch):** `claim take --take-over`. It works on any claim, remote or local, live or
  not, and only runs when the user says so. It is never automatic, because liveness can't be checked on
  another machine.
  - The refusal ends with `say "take it over" to take it anyway`. Claude runs `--take-over` only on that
    word in conversation. No flag to type.
  - Remote: `--force-with-lease=<ref>:<old sha>`. The new payload carries `takenFrom: <old holder>`.
  - Prints the old holder's branch and whether it is on origin, so the new session can build on their
    commits instead of starting over.
- **Release:** `git push origin --force-with-lease=<ref>:<own sha> :<ref>`. If the lease fails, the claim was
  taken over: print `phase <id> was taken over by <user>@<host> <age> ago; your work is on <branch>`, delete
  nothing, and exit 0. Handoff shows that line, so the old holder learns about it the next time they hand off.
- **Read:** `git fetch origin '+refs/spec-claims/*:refs/spec-claims-remote/*'` is part of the board's
  existing fetch. Payloads are read with `git log -1 --format=%B`.
- **Offline / push error:** keep the local claim and print
  `claim: origin unreachable; claimed locally only`. Exit 0.
- **Board:** a remote claim whose `host` differs from this machine shows in flight with its holder and
  age. Older than `REMOTE_CLAIM_STALE_DAYS` → listed under needs you. `--local` skips it.

### prs

- `openPrs()`: `gh pr list --state open --limit 100 --json number,headRefName,isDraft,url,statusCheckRollup`.
- `recentPrs()`: `gh pr list --state all --limit 100 --json number,headRefName,state,mergedAt,url`.
- Both run with a timeout.
- `PrRow { number, branch, state: "OPEN" | "MERGED" | "CLOSED", draft, url, checks?: CheckSummary }`.
  `checks` comes from `summarizeChecks(rollupToChecks(rollup), settings.checks.external)`, where
  `settings` comes from the base cache.
- `rollupToChecks`:
  - Maps CheckRun `status`/`conclusion` and StatusContext `state` to the same bucket gh's `pr checks`
    would report.
  - Keeps only the latest run per check name and workflow (gh's own key), so a failed-then-passed re-run
    is green.
  - Name is `name ‖ context`, link is `detailsUrl ‖ targetUrl`.
  - A parity test feeds the `state` values in `tests/fixtures/gh-pr-checks.json` through it and expects
    gh's `bucket` for each.
- On failure: `prs: { ok: false, reason }`. The board still renders.

## BoardInputs → Board

```ts
interface BoardInputs {
  repo: string; currentPath: string;
  base: { branch: string; sha: string; date: string; fetch: Result<void> | "local" };
  nodes: ReadonlyMap<string, SpecNode>;        // base cache, unchanged loaders
  states: ReadonlyMap<string, SpecState>;      // base cache
  stages: ReadonlyMap<string, "prep" | "create">; // specs without progress.md
  workspaces: WorkspaceScan[];                 // live ones
  workspaceStates: ReadonlyMap<string, ReadonlyMap<string, SpecState>>; // workspace path → spec → state
  counts: { merged: number; unknownBase: number; unreadable: number; duplicates: string[] };
  sessions: Result<LiveSession[]>; claims: Claim[];
  prs: Result<PrRow[]> | "local"; prLinks: ReadonlyMap<string, number[]>; // spec → pr-opening.md numbers
  backlogCount: number;
}
interface PhaseActivity { tickedIn: string[]; wipIn: string[] }   // workspace paths
```

### Activity (`phaseActivity`)

- For each workspace state of a spec, compare each phase with base:
  - Ticked in the workspace, not on base → `tickedIn`.
  - Some sub-items ticked in the workspace but not on base → `wipIn`.
- A spec that exists only in workspaces (`onlyOn = <branch>`) uses the first workspace's state as its
  own base.
- Base `nodes` and `states` are never patched: `readySet`, `isFinished` and cross-spec refs see only
  base.

### Lanes (`buildBoard`)

Every phase not done on base, in every spec that is unfinished on base and not `paused`, lands in exactly
one lane, checked in order:

1. **In flight**: the phase has a claim (`live`, `closed` or `unknown`), or `wipIn` is non-empty, or
   `tickedIn` is non-empty. A `tickedIn` phase shows as "ticked on branch, not merged" until base has it.
2. **Ready**: the phase is in `readySet(base).ready`.
   - Also ready: a phase in `readySet(base).waiting` whose every reason is a `needs` on a phase that is
     `tickedIn` exactly one workspace. That row is ready **in that workspace**: no ★, and its target is
     that workspace.
3. **Blocked**: the rest of `readySet(base).waiting`, with their reasons.

Specs with no phases (prep or create stage) are ready when the spec's own `needs` resolve, else
blocked. Paused specs are left out and counted.

**Needs you** (`attention.ts`, derived; a phase may also sit in another lane):

| Item | Action |
|---|---|
| Joined open PR, not draft, ≥ 1 check, all pass | merge |
| Joined open PR with failing checks | fix |
| A phase done on base, not deployed, that another open phase `needs-deployed` | deploy |
| Overdue spec or phase | — |
| `closed` claims | resume or release |

**Joins** (`joins.ts`):

- **Workspace → spec**: from claims first, then from `WorkspaceScan.specs`.
- **Session → row**: by the claim's `sessionId` first, then by the longest worktree path that is a
  path-segment prefix of the session's `cwd`. Several sessions → the most recent.
- **PR → row**:
  - By workspace branch, preferring OPEN, then the newest.
  - By `prLinks`. A linked number missing from both lists → `?`.

### Rank (`rankReady`)

Order: `overdue desc → compareSchedule(priority, due) → unblocks desc → updated desc → name`.

- `unblocks` = the number of open phases whose `needs` / `needs-deployed` resolve to this phase.
- A phase's due date wins over the spec's due date.
- ★ = no `same-files-as` with an in-flight phase of the same spec, and `inFlightOverlaps` is empty.
  - `inFlightOverlaps` builds `usage` over all open specs and ignores paths whose usage is
    `> HUB_LIMIT`, matching `undeclaredOverlaps`.
  - Declared relations count.

### Model

```ts
const BOARD_VERSION = 1;
interface Board {
  version: typeof BOARD_VERSION; repo: string; generatedAt: string;
  base: { branch: string; sha: string; date: string; mode: "fetched" | "offline" | "busy" | "local"; reason?: string };
  lanes: { inFlight: FlightRow[]; ready: ReadyRow[]; blocked: BlockedRow[]; needsYou: AttentionRow[] };
  footer: { merged: number; unknownBase: number; unreadable: number; paused: number; backlog: number;
            duplicates: string[]; prs?: string; sessions?: string };
}
// every row: { spec, phase?, target?: { workspace: string } | { newWorktree: string }, … }
```

Rows carry data, not text: `ago` is computed in render from `generatedAt`. The terminal view and any
later view read only `Board`.

## Commands

- **`spec.ts list`**:
  - No args → `renderBoard`, printed in a code fence.
  - `list table [all] [filter]` and `list <filter>` → `portfolioTable`, sync, with today's output.
  - `list --json` → today's JSON, unchanged.
  - If the board can't be built → the table plus `board unavailable: <reason>`.
- **`spec.ts board [flight|ready|blocked|you] [--json] [--local]`**:
  - A lane argument prints that lane uncapped.
  - `--json` prints `{ board }`, or `{ board: null, error }`.
  - `--local` skips the fetch, gh and the sessions source. Claims are still read.
  - This is a tool command, not a `/spec` sub-command.
- **`spec.ts claim take <spec> <phase>`** · **`claim release <spec> [<phase>]`** · **`claim list`**:
  - Reads `CLAUDE_CODE_SESSION_ID` from an injected `env`.
  - Without a session id, `take` refuses when another live claim holds the phase. Otherwise it prints
    `claim: no session id; not claimed` and exits 0.
- **`spec.ts launch execute <spec> [<phase>] [--in <workspace>]`**:
  - Builds the prompt `/spec-driven:spec execute <spec> <phase>` and the title `<spec> execute <phase>`.
  - With `--in`, it uses `cd <workspace>`. Without it, it uses `claude -w <spec>-<phase>` from the
    project dir.
- `Command.run` returns `string | Promise<string>`. `run()` in `spec.ts` becomes async, and
  `tests/commands-table.test.ts` awaits it.

## Constants

`READY_CAP = 8`, `BLOCKED_CAP = 5`, `FETCH_TIMEOUT_MS = 10_000`, `GH_TIMEOUT_MS = 10_000`,
`SCAN_CONCURRENCY = 8`, `UNKNOWN_BASE_AHEAD = 1000`, `PR_LIST_LIMIT = 100`, `BASE_CACHE_KEEP = 2`,
`REMOTE_CLAIM_STALE_DAYS = 3`.

## Integration points

- **`skills/spec/list.md`**:
  - §1: no filter → the board, printed as given. A filter → the table. Lane words → `spec.ts board <lane>`.
  - §2: the no-Bun fallback is unchanged.
- **`skills/spec/execute.md`**:
  - §1, first line, above the task-phase branch: `claim take`.
  - On a refusal with no phase named, re-run `spec.ts context execute <spec>` and reload Stage B.
  - On a refusal with a phase named, stop and show the holder.
- **`context/packs.ts` / `commands/context.ts`**:
  - The pick and the resume suggestion skip phases with a live claim, and the `Picked:` note names them.
  - `commands/context.ts:33` and SKILL.md:32: nothing named and nothing inferred → offer the top ready
    row from `board --json --local`.
- **`skills/spec/handoff.md`**:
  - Run `claim release` after *Commit*.
  - The final block adds `Ready next:` (top 3) and `Needs you:` from `board --json`.
  - Line 172, "Do not suggest further work", is amended to allow these lines.
- **`skills/spec/resume.md`**: no new bullet. The pack's existing overlap line (`graph/render.ts`)
  appends `(in flight: <session name>)` when the other spec holds a live claim.
- **`skills/spec/SKILL.md`**: update *Tools* (List, a new Board bullet, a new Claims bullet) and
  *Next-chunk rule* (live-claimed phases are skipped).
- **Docs**: README *Session lifecycle and tools*; a ROADMAP row per release.
