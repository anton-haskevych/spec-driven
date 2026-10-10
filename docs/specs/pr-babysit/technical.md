# PR Babysit — Technical

Ground truth: `research/2026-10-10-wave-1-pr-moment-ci-reality.md` (seam, CRM CI, GitHub and
Claude Code primitives, 13 transcript episodes), `research/2026-10-10-craft-pr-commands-verdict-fixtures.md`
(naming, fixtures, extraction) and `reviews/2026-10-10-check-source-and-pr-moment.md` (what changed and
why). Paths are under `skills/spec/tools/` unless rooted.

## Commands

A `pr` group in the command table (`spec.ts:28-54`). `commands/pr.ts` is the `ACTIONS` table and
dispatch only (exemplar `commands/phase.ts:14-40`); each verb's argument handling lives in
`commands/pr/<verb>.ts`. `pr-status` is replaced by `pr status` (callers are in-repo prose, updated in
the same commit). `Command.run` already returns `string | Promise<string>`; the CLI always exits 0, so
results are read from the one line, never from an exit code.

`<target>` is a PR number, `<spec> [<group>]`, or empty (the current branch's PR). `<spec> <group>`
resolves by branch: `treeName(spec, group).branch` (`trees/naming.ts:7`) → `gh pr view <branch>`.
`<spec>` alone: the spec's only PR group, else refuse `pr: <spec> has PR groups A, B — name one`. The
babysit procedure pins the PR number `pr open` printed and passes it to every later call.

| Command | Does | One-line result |
|---|---|---|
| `pr status [<target>]` | Full check table + verdict + per-failure facts (today's pr-status, extended) | multi-line report (design.md) |
| `pr wait [<target>] [--sha <sha>] [--since <iso>] [--timeout 25m] [--interval 30s]` | Blocks until the verdict settles; meant for background Bash | `PR #921: green · 21 passed · 6 skipped · external 1 pending (not blocking)` / `PR #921: red · E2E Tests failed (9m03s)` / `PR #921: none · no checks on 1a2b3c4 after 3m` / `PR #921: none · CI skipped itself on 1a2b3c4 — push a new commit` / `PR #921: conflicting` / `PR #921: merged as 9b0c1d2` / `PR #921: timeout after 25m · running: E2E Tests 24m` |
| `pr open <spec> [<group>] [--draft]` | Creates the group's PR (title, body from Outcome lines), marks an existing draft ready race-safely, or reports one already open | `PR: #921 opened ready · <url>` / `PR: #921 opened as a draft · <url>` / `PR: #921 marked ready · CI started (run 3788)` / `PR: #921 already open · <url>` |
| `pr rerun [<target>]` | Re-runs infra-failed jobs on the head; refuses when GitHub's `attempt` is already 3 | `Rerun: Backend Tests (runner lost) · attempt 2 of 3 · run 3787` |
| `pr merge [<target>] [--now] [--method m]` | Merges with `pr.merge`, pinned to head; refuses unless green (or `--now`); lands the merge line on main; fetches | `Merged: #921 · merge · 9b0c1d2` |
| `pr log [<target>] [--add "<text>"]` | Prints the babysit timeline; `--add` writes an agent note | timeline (design.md) |

Refusals start `pr <verb>:` (`pr merge: not green — E2E Tests failed`, `pr rerun: E2E Tests failed in a test, not infra — fix it`, `pr rerun: run 3787 still running — wait`, `pr merge: pr.merge is not set; pass --method or set it in docs/specs/_playbook/settings.md`). Short SHAs are 7 characters.

Retry-safe: `pr open` on an open, ready PR reports it; `pr merge` on a PR already merged (by Anton, or a
crash after the PUT) reads `mergeCommit`, lands the merge line if missing, and prints `Merged: …`.

`launch babysit <spec> <group>`: `babysit` joins `SUB_COMMANDS` (`context/request.ts:9`) and
`PACK_MODES` (`commands/context.ts:5`). `sessionLaunch` (`launch/command-line.ts:22-23`) accepts a
group token for `babysit` only; launch resolves the group to one of its phase ids and calls
`placeTree` unchanged (same tree lookup as execute). If placement would cut a new tree, babysit
refuses (`launch: no tree for feat/<spec>-pr-<g>`): the PR's code lives in an existing tree.

## How Claude Code invokes them

No person runs these commands. Every caller is a Claude Code agent: the execute/handoff session and the
babysit session. Output is written for that reader, and each command fits one Claude Code primitive
(`ledger/domain-claude-code-wait-primitives.md`; sources: code.claude.com/docs/en/tools-reference,
headless, scheduled-tasks).

| Command | Primitive | Contract |
|---|---|---|
| `pr status`, `pr log`, `pr rerun` | foreground Bash, default timeout (120 s) | finishes in < 60 s: every gh call bounded by `GH_TIMEOUT_MS`, budgeted |
| `pr open` | foreground Bash, `timeout: 180000` | the ready-race checks are bounded at 90 s total, then report what they saw |
| `pr merge` | foreground Bash, default timeout | PUT + fetch + land-on-main, < 60 s |
| `pr wait` | **background Bash** (`run_in_background: true`) | blocks up to `--timeout` (25m) and exits once; the session is re-invoked on exit with the output |
| `launch babysit` | foreground Bash | returns at once with one `Launched:` line |

Rules every command follows:
- **Last stdout line is the result.** One line, starting `PR #<n>:` / `PR:` / `Merged:` / `Rerun:` / `pr <verb>:` (refusal). Earlier lines are detail. The agent never parses the exit code (the CLI exits 0, `spec.ts:68-73`; a non-zero exit would also make Bash cut the output to a head-and-tail excerpt).
- **Self-bounded.** Nothing blocks past its contract. `pr wait` returns `timeout after 25m · running: …` under the 30-min cap unattended sessions (`-p`, SDK, `--bg`, cloud) put on background shells; the procedure starts another wait.
- **Restartable.** No command keeps in-process state: `pr wait` re-reads GitHub, takes `--since` from the log, and writes its settle line to the log before printing it. A wait that was killed, timed out, or lost to `--resume` (background shells are never restored) is replaced by reading `pr log` and starting a new one.
- **Never start a command line with `sleep`** (Claude Code kills a foreground `sleep` at timeout instead of backgrounding it), and never poll from the agent: no `sleep` loops, `/loop`, CronCreate or ScheduleWakeup (each tick burns a turn).
- **One wait per PR.** The babysit procedure starts a new `pr wait` only after the previous one's notification; the PR claim keeps a second babysitter out.

Rejected: **Monitor** for `pr wait` (one event per stdout line, 30-min max deadline, re-arm needed, unavailable when telemetry is disabled) — the verdict already settles on the first failure, so mid-wait events add nothing; **`gh pr checks --watch`** raw in background Bash (no external-check, stale-row or head-lag handling).

## Check source and verdict

One source for `pr status`, `pr wait` and the board: `statusCheckRollup` on the PR head, the field the
board already reads (`pr/gh-lists.ts:7`) and `pr/rollup.ts` already maps. Per poll:
`gh pr view <n> --json state,isDraft,mergeable,mergeStateStatus,headRefOid,mergeCommit,statusCheckRollup`
— one call, no paging, no "no checks reported" exit 1. `gh pr checks` and its mapper in
`gh-records.ts` retire.

`pr/checks/` holds the model (existing `Check`/`Bucket` stay the one check model):

- `Bucket`: `pending` splits into `queued` and `running` (rollup `status` QUEUED/WAITING/REQUESTED/PENDING/EXPECTED vs IN_PROGRESS); board counts `pending = queued + running`.
- `Check` gains `startedAt?`, `completedAt?`, `runId?`, `jobId?` (from the link, `actionsJob`).
- `rollupToChecks` is the one dedupe: newest per **workflow + name** (`rollup.ts:52`; workflow names
  repeat, spec-loop-automation `domain-gh-actions-shapes`). A row with no or zero-time `startedAt`
  (`0001-01-01…`, a queued re-run) is newest.
- External = a predicate from `checks.external` passed in, not a field on the row.

```ts
type Verdict =
  | { kind: "green"; passed: number; skipped: number }
  | { kind: "waiting"; running: Check[]; queued: Check[] }
  | { kind: "red"; failed: Check[] }
  | { kind: "cancelled"; cancelled: Check[] }      // cancelled with no newer run
  | { kind: "none"; reason: "no-checks" | "skipped" };

function checksVerdict(checks: Check[], isExternal: (c: Check) => boolean): Verdict;  // exhaustive
```

- Precedence over non-external rows: red > cancelled > waiting > green. Zero rows → `none: no-checks`.
  Rows but none passed and none pending (all skipped) → `none: skipped`. Green needs ≥1 passed.
- `prState` (`pr/checks.ts:22-31`) keeps PR-level states (merged, closed, conflicting, draft) in front
  and delegates the rest; the board's `nextFromChecks` (`board/joins.ts:72-76`) maps `green` →
  `merge`, `red`/`cancelled` → `fix CI`. A live `pr-<group>` claim on the spec turns the PR cell into
  `babysitting` and suppresses its fix/merge needs-you rows (`board/attention.ts:22-36`).

### Docs-only heads (probe first)

A check run attaches only to the pushed tip, so never read an older commit's checks on a hunch.
Phase 1 opens with a live probe on a CRM PR: push a docs-only commit on top of code and see whether the
head gets checks (GitHub evaluates `pull_request` `paths:` against the whole PR diff). Outcome goes to
the ledger.

- **Head gets checks** → nothing more; `none` means "find out why" (conflicting, draft, skipped).
- **Head gets none** → narrow fallback in `pr/checks/checked-head.ts`: when the head has no
  non-external rows and every commit from the head back to the newest commit with checks is
  docs-only (`pathsOutsideSpecDocs`, `publish/push.ts:12`, `git log --name-only -z`), read that
  commit's checks via `gh api …/commits/<sha>/check-runs?per_page=100` + `/status` into the same
  `Check`. A code commit without checks in between → `none`. The merge still pins the real head.

## Failure facts (`pr/failures/`, pure over fetched data)

Per failed row, computed by `pr status` only (never by `pr wait`):

| Fact | From |
|---|---|
| `infra` | job conclusion `startup_failure`; `cancelled` only when the run has no failed sibling and the tail lacks `exceeded the maximum execution time`; or the log tail matches a built-in signature: `The self-hosted runner lost communication`, `The runner has received a shutdown signal`, `No space left on device`, `The job was not acquired by Runner` |
| `failsOnMain` | `pr/failures/main-compare.ts` (same job, latest main run) |
| `tail` | `pr/failures/log-tail.ts` via `gh api …/actions/jobs/<id>/logs` (doesn't wait for the run) |

Classification for the procedure: infra → `pr rerun`; failsOnMain → stop and ask, naming main's
failing run (merging main fixes nothing); otherwise a test or code failure → `gates.ci-triage`, fix,
push. "Already fixed on main" is a triage-gate step (behind count + `git log origin/<default> -- <path>`),
not a tool fact.

## GitHub writes (`pr/actions/gh-writes.ts`)

A sibling of `pr/gh.ts`, not more `GhClient` methods (`call` ignores exit codes; widening `GhClient`
grows every fake): exit-code-aware results, no cache, own small budget (10), `GH_TIMEOUT_MS`.
Operations: `create(base, head, title, body, draft)`, `ready(n)`, `rerunJob(runId, jobId)`,
`merge(n, method, sha)` → PUT `repos/{o}/{r}/pulls/<n>/merge` returning
`{ merged: true, sha } | { merged: false, status: 405 | 409 | 422, message }`.

## Opening race-safely (`pr/actions/open.ts`)

- New PR: `gh pr create --base <default> --head <branch> --title "<spec>: <group title>" --body <body> [--draft]`.
  Body: one bullet per phase in the group with its **Outcome** line (`core/phase-entry.ts`), then a
  `Spec: docs/specs/<spec>/` line. No Spec-state write: the PR is found by branch.
- Existing draft → ready: wait until the head SHA's push-triggered runs have registered
  (`gh run list --commit <sha>`), then `gh pr ready`, then confirm a `ready_for_review` run for that
  SHA exists and its first job did not conclude `skipped` (queued counts as started). Re-check once
  after any late push run registers that the ready run wasn't cancelled. If CI skipped itself:
  `PR: #921 marked ready · CI skipped on 1a2b3c4 — push a new commit` (CRM `git-workflow.md:23-34`:
  a re-run doesn't fix it).
- Already open and ready → `PR: #921 already open · <url>`.

## Waiting (`pr/babysit/wait.ts`)

A thin shell over a pure `waitStep(prev, view, checks, elapsed) → { events, settle? }`, driven by one
`pollUntil(read, settled, { interval, deadline, sleep, now })` helper shared with `pr open`'s ready
check. Each poll is one `gh pr view` through the async runner with `GH_TIMEOUT_MS` (a fresh read, no
failure facts, no log tails). Settles on `green`, `red`, `cancelled`, `none` (no rows after 3 min, or
all skipped), PR `merged`/`closed`/`conflicting`, or the timeout (default 25m: unattended background
shells may be cut at 30 min; the procedure re-waits).

- `--sha` (default: the tree's `HEAD` when run in the PR's tree): keep waiting while `headRefOid` lags.
- `--since` (default: the last `pushed`/`rerun` log event): a failed row that completed before it
  doesn't settle the wait.
- Writes the settle line to the babysit log before printing it, so a killed shell still leaves it.
- The procedure runs it with `run_in_background: true` (see *How Claude Code invokes them*); the session is re-invoked once, on exit, with the output; the last line is the verdict.

## Merge (`pr/actions/merge.ts`) and the merge line

1. Verdict on the head must be `green` unless `--now`.
2. Method: `--method`, else `pr.merge`, else refuse.
3. `merge(n, method, headSha)`; a 405/409 (head moved, not mergeable) → refusal with GitHub's message.
4. `git fetch origin <default>`.
5. Land `PR #921 merged 2026-10-10 as 9b0c1d2 (merge).` in the spec's Spec state **on main**, after
   the merge, through the commit-onto-origin-tip path `focus/land.ts` uses (extracted to
   `core/land-on-main.ts`, second use): pin the tip, edit, commit, push, retry once if main moved.
   Works in `docs: main` and `docs: branch`; never touches a PR branch, so no shared append and no
   mid-CI push. Keeps the `PR #n` form `pr/resolve.ts:15` and the board's `byLinks` parse. `--date`
   for tests. A refused push prints `pr merge: merged; merge line not landed — <reason>`.
6. Log `merged`.

## Re-run (`pr/actions/rerun.ts`)

Only rows with `infra: true` or verdict `cancelled`. Refuses while the target run is still in progress
(`gh run rerun --job` is refused then). The cap is GitHub's: refuse when the run's `attempt` is
already 3 (two re-runs). The babysit log records reruns for reading, never for enforcement.
`gh run rerun <run> --job <jobId>`.

## Babysit log (`pr/babysit/log.ts`)

- File: `<git-common-dir>/spec-board/babysit/pr-<n>.jsonl` (per clone, every worktree sees it, never
  committed — next to `spec-board/claims/`) via `stateDir(git, "babysit")` (`core/git.ts`).
- Line: `{"at":"2026-10-10T21:16:04Z","event":"red","sha":"1a2b3c4","detail":"E2E Tests failed (9m03s)"}`.
  `babysit-start` also carries `spec` and `group` (the header names them). A line renders as
  `HH:MM <event> · <detail>`: writers put whatever the reader needs (a pushed SHA, a run id) in `detail`.
- Events: `babysit-start`, `opened`, `ready`, `waiting`, `green`, `red`, `cancelled`, `rerun`, `none`,
  `timeout`, `note` (agent text via `pr log --add`), `pushed`, `merged`, `closed`, `stopped`.
- Limits (3 fix pushes, 3 hours) count from the latest `babysit-start`.
- `pr log` renders local times, one line per event, header from the latest `babysit-start`.
- Appends are single `appendFileSync` writes (atomic per line on POSIX for small writes).
- Observational only: nothing enforces a rule from it.

## Settings (`playbook/settings.ts`)

| Key | Exists | Meaning here |
|---|---|---|
| `pr.draft` | yes | Which answer the question lists first (`true` → draft first) |
| `pr.merge` | yes | Merge method for `pr merge`; unset → refuse and ask |
| `checks.external` | yes | Globs of checks that never block (`Vercel*`) |
| `gates.ci-triage` | **new** | `gates.md` section with the project's CI triage steps. One row in `SECTION_KEYS.gates`, one `gateName` line, one entry in the doctor's `named` map (`doctor/settings.ts:20-23`); pack `Settings:` shows `CI triage: gate <name>` |

## PR claim (`claims/`)

`claim take <spec> pr-<group>`: `takeRefusal` (`claims/rules.ts:50`) accepts `pr-<group>` when some
phase of the spec has `pr: <group>`; the store already accepts any id. No new status rule: a PR claim
is live while its session is, `closed` when the session is gone (stale, freed), and released at the
end of babysit. `trees/find.ts:84-86` already blocks a tree with any live claim in it. PR claims
mirror to origin like phase claims (`commands/claim.ts:101-112`), so the board on other machines
shows the babysit too. A babysitter that finds the claim held prints the holder and ends.

## Skill prose

- `skills/spec/babysit.md` — the procedure (design.md flow, limits, triage order from research), read by the `babysit` sub-command.
- `skills/spec-babysit/SKILL.md` — thin router (exemplar `skills/spec-status/SKILL.md`, `disable-model-invocation: true`).
- `SKILL.md` — `babysit` in the sub-command set, Dispatch row, argument-hint, Tools → Remote rewritten around `pr …`, `launch babysit`.
- `execute.md` §10 asks the question at the PR gate; `handoff.md` asks it only when the PR is ready and unanswered. On "babysit" the handoff runs in full first (commit, push/publish-docs, claim release); `launch babysit` is its last act. The question replaces the *Next sessions* block in that message. Drop "never merge on your own", "never waits".
- README (Session lifecycle and tools), ROADMAP (new section, 2.42.0).

## File tree

```
skills/spec/
├── babysit.md                           new · procedure
├── execute.md / handoff.md / SKILL.md   touched
└── tools/
    ├── commands/pr.ts                   new · ACTIONS table (replaces commands/pr-status.ts)
    ├── commands/pr/<verb>.ts            new · status, wait, open, merge, rerun, log
    ├── core/land-on-main.ts             new · lifted from focus/land.ts
    ├── core/git.ts                      touched · stateDir
    ├── pr/gh.ts, pr/report.ts, pr/render.ts, pr/resolve.ts   stay at the top
    ├── pr/checks/                       types, rollup, checks (prState), verdict, checked-head (conditional)
    ├── pr/failures/                     log-tail, main-compare, triage
    ├── pr/actions/                      gh-writes, open, merge, rerun
    ├── pr/babysit/                      wait, poll, log
    ├── board/joins.ts, board/attention.ts   touched · shared verdict, babysitting cell
    ├── claims/rules.ts                  touched · pr-<group> in takeRefusal
    ├── launch/command-line.ts, commands/launch.ts, context/request.ts, commands/context.ts   touched · babysit
    ├── playbook/settings.ts, doctor/settings.ts   touched · gates.ci-triage
    └── tests/ pr-verdict, pr-wait, pr-open, pr-merge, pr-rerun, pr-triage, pr-log, pr-gh-writes, land-on-main (+ fixtures)
skills/spec-babysit/SKILL.md             new · router
```

`gh-records.ts`' checks mapper and `commands/pr-status.ts` are deleted; `gh-lists.ts` moves under
`pr/checks/` only if it stays checks-only (it also lists PRs — leave it at the top otherwise).

## Test infrastructure

- Promote `sequencedRunner` (`tests/pr-report.test.ts:16-27`) into `tests/stub-runner.ts`.
- `prView()`, `check()`, `run()` factories in `tests/pr-factories.ts` (like `board-factories.ts`), replacing the five hand-built `PrView`s.
- New fixtures (`tests/fixtures/`), rollup-shaped: `gh-pr-view-rollup-states.json` (every status/conclusion incl. QUEUED, IN_PROGRESS, CANCELLED, STARTUP_FAILURE), `-vercel-pending.json` (Actions green, `Vercel – crm-dance-landing` pending), `-stale-rows.json` (draft-era SKIPPED + newer SUCCESS), `-same-name-two-workflows.json`, `-all-skipped.json`, `-queued-rerun.json` (zero-time queued re-run beside the old failure), `gh-run-list-by-head.json`, `gh-rerun-in-progress.txt`, `gh-merge-200.json`, `gh-merge-405.json`, `gh-merge-409.json`, a cancelled-by-timeout job log. Synthetic `acme/app` names, real GitHub message bodies.
- Real git only for land-on-main and checked-head round-trips, with `isolatedRunner` (`docs/specs/_ledger/gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner.md`).
