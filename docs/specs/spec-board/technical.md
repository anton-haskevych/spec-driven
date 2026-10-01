# Spec Board — Technical

Ground truth: `research/2026-10-01-wave-1-sources-and-layers.md` (mechanics, timings) and
`research/2026-10-01-craft-layers-names-fixtures.md` (names, exemplars, extraction). Paths are relative
to `skills/spec/tools/`. Zero new dependencies; files < 250 lines, functions < 50.

## File tree

```
core/
  run.ts               + AsyncRunner, systemAsyncRunner, runAll(runner, jobs, concurrency)
  git-status.ts        new  parsePorcelainZ (moved from context/infer-spec.ts uncommittedPaths)
  git-tree-reader.ts   new  gitTreeReader(git, ref, specRoots) → { paths, readerFor(specDir) }
  spec-folders.ts      + specsFromPaths(paths, base)
  schedule.ts          + ago(then, now); compareSchedule(a, b)
graph/
  nodes.ts             + loadNodeFrom(spec, read), loadNodesFrom(specs, readerFor)
  overlap.ts           export HUB_LIMIT, pathUsage; + overlapsWith(nodes, name, others)
portfolio/order.ts     orderSpecs / orderBacklog use compareSchedule
pr/
  gh.ts                + prList(state, fields) on GhClient
  gh-records.ts        + toPrRows, rollupToChecks
  types.ts             + PrRow
workspaces/            new domain
  list.ts              parseWorktreeList (porcelain), loadWorkspaces(git)
  classify.ts          parseAheadBehind, classifyWorkspaces (merged | live | unknown-base | detached)
  changes.ts           specDocChanges(asyncRunner, workspace, base, roots)
sessions/              new domain
  live.ts              parseSessionFile, loadLiveSessions(claudeHome, isAlive)
claims/                new domain
  store.ts             claimsDir(git), takeClaim, releaseClaim, loadClaims (fs; exclusive create)
  rules.ts             claimStatus(claim, sessions, workspaces, phaseDone) — pure
board/                 new domain
  inputs.ts            BoardInputs type; loadBoardInputs(projectDir, deps) — the only IO here
  overlay.ts           mergeSpecViews(base, workspaceViews) — pure
  lanes.ts             buildBoard(inputs, now) → Board — pure
  rank.ts              rankReady — pure
  model.ts             Board, BoardRow, Lane types; BOARD_VERSION
  render.ts            renderBoard(board, { lane?, caps }) — terminal view
commands/
  list.ts              board by default; `table`, lane filters, `--json`
  claim.ts             new  claim take|release|list
launch/command-line.ts optional phase hint
tests/                 board-factories.ts, stub-runner.ts (+ asyncStubRunner, sequencedRunner moved),
                       git-repo.ts (+ addWorktree), fixtures/{git-worktree-list.txt,
                       git-for-each-ref.txt, gh-pr-list-open.json, gh-pr-list-all.json, session-busy.json}
```

## Sources (adapters)

All take their dependencies as parameters (`principles.md` §11): `Git`, `AsyncRunner`, `GhClient`,
`claudeHome`, `now`. Defaults are wired in `commands/list.ts` only.

### mainline (base)

1. `defaultBranch(projectDir, runner)` once.
2. `git fetch --quiet origin <branch>`, 10 s timeout. Failure → `fetch: { ok: false, reason }`.
3. `git rev-parse origin/<branch>` → `baseSha`; `git log -1 --format=%cI <sha>` → `baseDate`.
4. `git ls-tree -r --name-only <sha>`; keep paths under `docs/specs/` or `<one dir>/docs/specs/` that
   match the read set: `<spec>/{CLAUDE.md,progress.md,code-map.md,in-flight.md,product-brief.md,seed.md}`,
   `<spec>/phases/**/*.md`, `_backlog/*.md`, plus pointer targets resolved later.
5. `git cat-file --batch` with `<sha>:<path>` per kept path, one process; parse the
   `<oid> blob <size>\n<content>\n` frames into a `Map<path, string>`.
6. `readerFor(specDir)` returns a `ReadSpecFile` that `posix.normalize`s `specDir/pathInSpec`, returns
   `undefined` for paths outside the repo, and reads from the map (lazy `cat-file` for pointer targets
   outside the prefetched set, batched once).

### workspaces

- `git worktree list --porcelain` → `Workspace { path, head, branch?, detached, locked, prunable, isMain }`.
  Accept `locked [reason]` and `prunable <reason>` lines. Normalise paths with `realpathSync` when they
  exist.
- `git for-each-ref --format='%(refname:short) %(ahead-behind:origin/<b>)' refs/heads` → ahead/behind per
  branch. `git rev-list --no-walk <detached shas…> ^origin/<b>` → unmerged detached heads.
- Class: `merged` (behind-only or ancestor, and no uncommitted spec docs), `live`, `unknown-base`
  (no merge base: `git merge-base` exits 1 — checked only for branches whose ahead count exceeds 1000).
  `prunable` workspaces are dropped.
- `specDocChanges` per live workspace, in parallel (`runAll`, concurrency 8):
  - committed: `git diff --name-only origin/<b>...<head> -- docs/specs ':(glob)*/docs/specs/**'`
  - uncommitted: `git --no-optional-locks -C <path> status --porcelain -z --untracked-files=all -- docs/specs ':(glob)*/docs/specs/**'`
    parsed by `parsePorcelainZ`. `--no-optional-locks` is required.
  - The main checkout runs the uncommitted query only.
- Result: `WorkspaceView { workspace, specs: string[] }` (spec names from the changed paths via
  `specsFromPaths`), plus `readerFor = diskReader(join(path, root, name))`.

### sessions

`<claudeHome>/sessions/*.json` → `LiveSession { pid, sessionId, cwd, status: "busy" | "idle", name?,
updatedAt: Date }`. Keep a file only when `isAlive(pid)` (`process.kill(pid, 0)`). `updatedAt` is
parsed defensively (epoch ms or ISO). `claudeHome` defaults to `~/.claude`.

### claims

File: `<git-common-dir>/spec-board/claims/<spec>#<phase>.json` (`git rev-parse --path-format=absolute
--git-common-dir`):

```json
{ "spec": "alert-noise-cleanup", "phase": "8", "sessionId": "67e7b436-…", "sessionName": "alert-noise-cleanup execute",
  "workspace": "/Users/…/claude-worktrees/crm/alert-noise-cleanup-pr-d", "branch": "feat/alert-noise-cleanup-pr-d",
  "claimedAt": "2026-10-01T13:40:12-07:00" }
```

- `takeClaim`: `writeFileSync(file, json, { flag: "wx" })`. `EEXIST` → read it; if its session is the
  caller's → ok (idempotent); if its status is `closed` or `gone` → replace it and report
  `took over from <name>`; else refuse `claimed by <name> in <workspace>`.
- `releaseClaim(spec, phase?)`: removes the caller's claims for that spec (or that phase).
- `claimStatus` (pure): `live` (session open) · `closed` (no live session with that id, phase not done)
  · `done` (phase ticked on base) · `gone` (workspace no longer listed). `done` and `gone` claims are
  deleted by the next board run; `closed` is shown under needs you.
- Prep claims `<spec>#prep`.

### prs

- `gh pr list --state open --limit 100 --json number,headRefName,isDraft,url,statusCheckRollup`
- `gh pr list --state all --limit 100 --json number,headRefName,state,mergedAt,url`
- `PrRow { number, branch, state: "OPEN" | "MERGED" | "CLOSED", draft, url, checks?: CheckSummary }`;
  `checks` from `summarizeChecks(rollupToChecks(rollup), settings.checks.external)`.
- Rollup → bucket: CheckRun not `COMPLETED` → pending; `SUCCESS`/`NEUTRAL` → pass;
  `FAILURE`/`TIMED_OUT`/`ACTION_REQUIRED`/`STARTUP_FAILURE` → fail; `CANCELLED` → cancel;
  `SKIPPED`/`STALE` → skipping. StatusContext `SUCCESS` → pass, `FAILURE`/`ERROR` → fail,
  `PENDING`/`EXPECTED` → pending. Name `name ‖ context`, link `detailsUrl ‖ targetUrl`.
- Failure → `prs: { ok: false, reason }`; the board still renders.

## BoardInputs → Board

```ts
interface BoardInputs {
  repo: string; currentPath: string;
  base: { branch: string; sha: string; date: string; fetch: Result<void> };
  baseSpecs: SpecView[];                       // from mainline
  workspaces: WorkspaceView[];                 // live ones, with their spec views
  counts: { merged: number; unknownBase: number };
  sessions: LiveSession[]; claims: Claim[];
  prs: Result<PrRow[]>; backlogCount: number;
}
interface SpecView { node: SpecNode; state: SpecState; source: "base" | { workspace: string; uncommitted: boolean } }
```

### Overlay (`mergeSpecViews`)

Per spec name: start from the base view, else the first workspace view (`onlyOn = <branch>`).
For each workspace view of the same spec: a phase is `done` if done in any view; `deployed` if deployed
in the base; its `summary` is the one with the most checked deliverables. Each phase keeps
`tickedIn: string[]` (workspaces where it's done but the base isn't) and `wipIn: string[]`. The merged
`SpecState` and `SpecNode` feed `readySet` unchanged.

### Lanes (`buildBoard`)

Every open phase of every unfinished spec lands in exactly one lane, checked in order:

1. **In flight** — claimed (`live` or `closed`), or `wipIn` non-empty, or `tickedIn` non-empty (shown
   as "ticked on branch, not merged" until base has it).
2. **Ready** — in `readySet(merged).ready`.
3. **Blocked** — in `readySet(merged).waiting`, with its reasons.

Specs with no phases: prep / create stage → ready if the spec's own `needs` resolve, else blocked.
**Needs you** (derived, a phase may also sit in another lane): open PR not draft with checks all pass
→ merge; open PR with failing checks → fix; a phase done on base, not deployed, that another open
phase `needs-deployed` → deploy; overdue spec or phase; `closed` claims.
PR join: workspace branch → `PrRow`; spec → PR numbers from `pr-opening.md` (`specPrNumbers`).

### Rank (`rankReady`)

`overdue desc → compareSchedule(priority, due) → unblocks desc → updated desc → name`. `unblocks` =
number of open phases whose `needs` / `needs-deployed` resolve to this phase. Phase due wins over spec due.
★ = no `same-files-as` with an in-flight phase of the same spec, and `overlapsWith(nodes, spec,
inFlightSpecs)` empty (paths used by ≥ `HUB_LIMIT` specs ignored).

### Model

```ts
const BOARD_VERSION = 1;
interface Board {
  version: 1; repo: string; generatedAt: string;
  base: { branch: string; sha: string; date: string; fetched: boolean; reason?: string };
  lanes: { inFlight: FlightRow[]; ready: ReadyRow[]; blocked: BlockedRow[]; needsYou: AttentionRow[] };
  footer: { merged: number; unknownBase: number; backlog: number; prs?: string };
}
```

Rows carry data, not text (`ago` is computed in render from `generatedAt`). The terminal view and any
later view read only `Board`.

## Commands

- `spec.ts list` → board. `list table [all] [filter]` → today's tables. `list flight|ready|blocked|you`
  → that lane uncapped. Other filters → today's filtered table. `list --json` → today's JSON plus a
  `board` key (no board when a filter is given).
- `spec.ts claim take <spec> <phase|prep>` · `claim release <spec> [<phase>]` · `claim list`. Reads
  `CLAUDE_CODE_SESSION_ID` from an injected `env`; without it, `take` prints
  `claim: no session id; not claimed` and exits 0.
- `spec.ts launch execute <spec> [<phase>]` → prompt `/spec-driven:spec execute <spec> <phase>`.
- `Command.run` returns `string | Promise<string>`; `run()` in `spec.ts` becomes async;
  `tests/commands-table.test.ts` awaits it.

## Constants

`READY_CAP = 8`, `BLOCKED_CAP = 5`, `FETCH_TIMEOUT_MS = 10_000`, `SCAN_CONCURRENCY = 8`,
`UNKNOWN_BASE_AHEAD = 1000`, `PR_LIST_LIMIT = 100`.

## Integration points

- `skills/spec/list.md` §1 (board is the default; lanes; `table`), §2 fallback unchanged.
- `skills/spec/execute.md` §1: `claim take` before recon; on refusal pick the next ready phase.
- `skills/spec/handoff.md` final block (lines ~155-172): `claim release`; top 3 ready + needs you from
  `list --json` → `board`.
- `skills/spec/resume.md` A.4: one bullet when an in-flight spec shares files with this one.
- `skills/spec/SKILL.md` *Tools* (List, new Claims bullet), *Next-chunk rule* (claimed phases skipped),
  README *Session lifecycle and tools*, ROADMAP row per release.
- Never feed blob-loaded nodes to `phases/review-refs.ts` or `context/packs.ts executePack`; both read disk.
