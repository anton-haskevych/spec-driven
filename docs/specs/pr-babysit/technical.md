# PR Babysit — Technical

Ground truth: `research/2026-10-10-wave-1-pr-moment-ci-reality.md` (seam, CRM CI, GitHub and
Claude Code primitives, 13 transcript episodes) and `research/2026-10-10-craft-pr-commands-verdict-fixtures.md`
(naming, fixtures, extraction). Paths are under `skills/spec/tools/` unless rooted.

## Commands

A `pr` group in the command table (`spec.ts:28-54`), dispatched like `commands/phase.ts:14-40`
(`ACTIONS` table, joined usage). `pr-status` keeps working as an alias of `pr status`.
`<target>` is a PR number, a spec name (PR read from `pr-opening.md` Spec state via
`pr/resolve.ts`), or empty (the current branch's PR).

| Command | Does | One-line result |
|---|---|---|
| `pr status [<target>] [--json]` | Full check table + verdict + per-failure facts (today's pr-status, extended) | multi-line report (design.md) |
| `pr wait [<target>] [--timeout 60m] [--interval 30s]` | Blocks until the verdict settles; meant for background Bash | `PR #921: green · 21 passed · 6 skipped · external 1 pending (not blocking)` / `PR #921: red · E2E Tests failed (9m03s)` / `PR #921: none · no checks on 1a2b3c4 after 3m` / `PR #921: conflicting` / `PR #921: merged as 9b0c1d2` / `PR #921: timeout after 60m · running: E2E Tests 58m` |
| `pr open <spec> [<group>] [--draft]` | Creates the group's PR (title, body from Outcome lines) or marks the existing draft ready, race-safe | `PR: #921 opened ready · <url>` / `PR: #921 opened as a draft · <url>` / `PR: #921 marked ready · CI started (run 3788)` |
| `pr rerun [<target>]` | Re-runs infra-failed jobs of the code head's runs; ≤2 per commit | `Rerun: Backend Tests (runner lost) · 1 of 2 for 5e6f7a8` |
| `pr merge [<target>] [--now] [--method m]` | Merges with `pr.merge`, pinned to head; refuses unless green (or `--now`); records the merge; fetches | `Merged: #921 · merge · 9b0c1d2` |
| `pr log [<target>]` | Prints the babysit timeline | timeline (design.md) |

Refusals start `pr <verb>:` (`pr merge: not green — E2E Tests failed`, `pr rerun: E2E Tests failed in a test, not infra — fix it`, `pr merge: pr.merge is not set; pass --method or set it in docs/specs/_playbook/settings.md`). Short SHAs are 7 characters.

`launch babysit <spec> [<group>]`: `babysit` joins `SUB_COMMANDS` (`context/request.ts:9`); launch places the tree by branch `feat/<spec>-pr-<group>` (`feat/<spec>` without a group) and opens `/spec-driven:spec babysit <spec> <group>` there.

## Check model and verdict (`pr/verdict.ts`, pure)

```ts
type CheckStatus = "queued" | "running" | "passed" | "failed" | "cancelled" | "skipped";

interface CheckRow {
  name: string;
  workflow: string;        // "" for external StatusContexts (Vercel)
  status: CheckStatus;
  external: boolean;       // matches checks.external → never blocks
  startedAt?: string;
  completedAt?: string;
  runId?: number;          // from link /actions/runs/<id>
  jobId?: number;          // from link /job/<id>
  link: string;
}

type Verdict =
  | { kind: "green"; passed: number; skipped: number }
  | { kind: "waiting"; running: CheckRow[]; queued: CheckRow[] }
  | { kind: "red"; failed: CheckRow[] }
  | { kind: "rerun"; cancelled: CheckRow[] }          // cancelled with no newer run
  | { kind: "none"; reason: "no-checks" | "draft" };

function latestPerName(rows: CheckRow[]): CheckRow[];   // newest run per check name wins
function checksVerdict(rows: CheckRow[]): Verdict;      // over latestPerName, external excluded
```

- Mapping from `gh pr checks --json name,state,bucket,workflow,link,startedAt,completedAt`: `QUEUED|PENDING|WAITING|REQUESTED|EXPECTED` → queued, `IN_PROGRESS` → running, `SUCCESS` → passed, `FAILURE|ERROR|TIMED_OUT|ACTION_REQUIRED|STARTUP_FAILURE` → failed, `CANCELLED` → cancelled, `SKIPPED|NEUTRAL|STALE` → skipped. Rollup records (`pr/rollup.ts`) map to the same statuses so the board shares the verdict.
- Precedence: red > rerun > waiting > green; `none` when no non-external rows; green needs ≥1 passed.
- `prState` (`pr/checks.ts:22-31`) keeps its PR-level states (merged, closed, conflicting, draft) in front and delegates the rest; the board's `nextFromChecks` (`board/joins.ts:72-76`) maps `green` → `merge`, `red`/`rerun` → `fix CI`.

## Code head (`pr/code-head.ts`)

`git log -1 --format=%H <base>..<head> -- . ':(exclude)docs/specs/**'` in the PR's tree, or, without a
local tree, the newest commit in `gh pr view --json commits` whose files (`gh api …/commits/<sha>`)
leave `docs/specs/`. When code head ≠ head, checks are read with
`gh api repos/{o}/{r}/commits/<sha>/check-runs` + `…/status` and mapped to `CheckRow`.

## Failure facts (`pr/triage.ts`, `pr/main-fixed.ts`, pure over fetched data)

Per failed row:

| Fact | From |
|---|---|
| `infra` | job conclusion `cancelled`/`startup_failure`, or the log tail matches a built-in signature: `The self-hosted runner lost communication`, `The runner has received a shutdown signal`, `No space left on device`, `The job was not acquired by Runner` |
| `failsOnMain` | `pr/main-compare.ts` (same job, latest main run) |
| `fixedOnMain` | main's history of that job: failed after the merge-base, later passed, and the branch is behind main (`git rev-list --count HEAD..origin/<default>`) |
| `tail` | `pr/log-tail.ts` via `gh api …/actions/jobs/<id>/logs` (doesn't wait for the run) |

Classification for the procedure: infra → `pr rerun`; failsOnMain or fixedOnMain → merge main; otherwise a test or code failure → `pr.triage` gate, fix, push.

## GitHub writes (`pr/gh-writes.ts`)

A sibling of `pr/gh.ts`, not more `GhClient` methods: exit-code-aware results, no cache, own small
budget (10). Operations: `create(base, head, title, body, draft)`, `ready(n)`, `rerunJob(jobId)`,
`rerunFailed(runId)`, `merge(n, method, sha)` → PUT `repos/{o}/{r}/pulls/<n>/merge` returning
`{ merged: true, sha } | { merged: false, status: 405 | 409 | 422, message }`.

Reads added to `GhClient`: `PR_FIELDS` + `headRefName,baseRefName,url,commits`; `RUN_FIELDS` + `headSha,status,event,workflowName,attempt`; `checksAt(sha)`.

## Opening race-safely (`pr/open.ts`)

- New PR: `gh pr create --base <default> --head <branch> --title "<spec>: <group title>" --body <body> [--draft]`. Body: one bullet per phase in the group with its **Outcome** line (`core/phase-entry.ts` already reads phase files), then a `Spec: docs/specs/<spec>/` line.
- Existing draft → ready: wait until every run for the head SHA has registered (`gh run list --commit <sha>`, all `completed` or none queued within 20 s of the push), then `gh pr ready`, then confirm a `ready_for_review`/`pull_request` run started whose first job isn't `skipped` within 60 s. Otherwise: `PR: #921 marked ready · CI skipped on 1a2b3c4 — push a new commit` (CRM `git-workflow.md:23-34`: a re-run doesn't fix it).
- Records `PR #<n>` + URL in Spec state through the same writer as the merge record.

## Waiting (`pr/wait.ts`)

Async loop over `pr status`'s data with injected `sleep` and `now` (tests run without real time):
poll every `--interval` (30 s); on each poll compute the verdict on the code head; append a log
event for every row whose status changed; exit with the one-line result when the verdict is
`green`, `red`, `rerun`, `none` (after 3 min with no rows), PR `merged`/`closed`/`conflicting`, or the
timeout passes. Exit code 0 for green/merged, 1 otherwise. Each poll builds a fresh read client
(the 30-call budget is per client). The procedure runs it with `run_in_background: true`; the
session gets one notification.

## Merge (`pr/merge.ts`) and the merge record (`pr/record.ts`)

1. Verdict on the code head must be `green` unless `--now`.
2. Method: `--method`, else `pr.merge`, else refuse.
3. `merge(n, method, headSha)`; a 405/409 (head moved, not mergeable) → refusal with GitHub's message.
4. Record: an `EditPlan` writer (exemplar `phases/deployed.ts:23-41`) that appends to Spec state
   `PR #921 merged 2026-10-10 as 9b0c1d2 (merge).` — keeps the `PR #n` form `pr/resolve.ts:15` parses;
   validated by re-parsing `specPrNumbers` after the edit; `--date` for tests. `SPEC_STATE`/`PR_LINK`
   move from `pr/resolve.ts:14-15` to `core/spec-state-section.ts` (second use).
5. `git fetch origin <default>`.
6. Log `merged`.

## Re-run (`pr/rerun.ts`)

Only rows with `infra: true` (Triage) or status `cancelled` with no newer run. Count re-runs per
code-head SHA from the babysit log (and the run's `attempt`); refuse the third. `gh run rerun <run> --job <jobId>`.

## Babysit log (`pr/log.ts`)

- File: `<git-common-dir>/spec-driven/babysit/pr-<n>.jsonl` (per clone, every worktree sees it, never committed — same home as claims and `local.md`).
- Line: `{"at":"2026-10-10T21:16:04Z","event":"red","sha":"1a2b3c4","detail":"E2E Tests failed (9m03s)","checks":{"failed":["E2E Tests"]}}`.
- Events: `opened`, `ready`, `waiting`, `check` (status change: name, from, to, duration), `green`, `red`, `rerun`, `none`, `timeout`, `triage` (written by the agent through `pr log --add "<text>"`), `pushed`, `merged`, `closed`, `stopped`.
- `pr log` renders local times, one line per event, `check` events folded into the settle line unless `--all`.
- Appends are single `appendFileSync` writes (atomic per line on POSIX for small writes).

## Settings (`playbook/settings.ts`)

| Key | Exists | Meaning here |
|---|---|---|
| `pr.draft` | yes | Which answer the question lists first (`true` → draft first) |
| `pr.merge` | yes | Merge method for `pr merge`; unset → refuse and ask |
| `checks.external` | yes | Globs of checks that never block (`Vercel*`) |
| `pr.triage` | **new** | `gates.md` section with the project's CI triage steps; pack `Settings:` shows `CI triage: gate <name>` |

## PR claim (`claims/`)

`claim take <spec> pr-<group>`: the store accepts `pr-<group>` ids (`claims/store.ts:108` requires a
phase today). Rules: a PR claim is done when the group's PR is merged or closed (not when phases are
ticked, `claims/rules.ts:35-41`). `trees place` treats it like a phase claim, so nothing else lands
in the tree while the babysitter waits in a background shell. Released at the end of babysit.

## Skill prose

- `skills/spec/babysit.md` — the procedure (design.md flow, limits, triage order from research), read by the `babysit` sub-command.
- `skills/spec-babysit/SKILL.md` — thin router (exemplar `skills/spec-status/SKILL.md`, `disable-model-invocation: true`).
- `SKILL.md` — `babysit` in the sub-command set, Dispatch row, argument-hint, Tools → Remote rewritten around `pr …`, `launch babysit`.
- `execute.md` §10 and `handoff.md` — ask the question (design.md copy), act on the answer; drop "never merge on your own", "never waits".
- README (Session lifecycle and tools), ROADMAP (new section, 2.42.0).

## File tree

```
skills/spec/
├── babysit.md                         new · procedure
├── execute.md / handoff.md / SKILL.md touched
└── tools/
    ├── commands/pr.ts                 new · group dispatch (pr-status.ts stays as alias)
    ├── core/spec-state-section.ts     new · SPEC_STATE / PR_LINK lifted from pr/resolve.ts
    ├── pr/verdict.ts                  new · CheckRow, latestPerName, checksVerdict
    ├── pr/code-head.ts                new
    ├── pr/wait.ts                     new
    ├── pr/open.ts                     new
    ├── pr/merge.ts, pr/record.ts      new
    ├── pr/rerun.ts, pr/triage.ts, pr/main-fixed.ts   new
    ├── pr/log.ts                      new
    ├── pr/gh-writes.ts                new
    ├── pr/gh.ts, pr/types.ts, pr/checks.ts, pr/rollup.ts, pr/render.ts, pr/report.ts   touched
    ├── board/joins.ts                 touched · shares the verdict
    ├── claims/store.ts, claims/rules.ts touched · pr-<group> claims
    ├── launch/command-line.ts, context/request.ts touched · babysit
    ├── playbook/settings.ts           touched · pr.triage
    └── tests/ pr-verdict, pr-code-head, pr-wait, pr-open, pr-merge, pr-record, pr-rerun, pr-triage, pr-main-fixed, pr-log, pr-gh-writes (+ fixtures)
skills/spec-babysit/SKILL.md           new · router
```

## Test infrastructure

- Promote `sequencedRunner` (`tests/pr-report.test.ts:16-27`) into `tests/stub-runner.ts`.
- Shared `prView()`, `checkRow()`, `run()` factories in `tests/factories.ts` replacing the five hand-built `PrView`s.
- New fixtures (`tests/fixtures/`): `gh-pr-checks-states.json` (every state incl. QUEUED, IN_PROGRESS, CANCELLED, STARTUP_FAILURE), `gh-pr-checks-vercel-pending.json` (Actions green, `Vercel – crm-dance-landing` pending), `gh-pr-checks-stale-rows.json` (draft-era SKIPPED + newer SUCCESS, same names), `gh-run-list-by-head.json`, `gh-merge-200.json`, `gh-merge-405.json`, `gh-merge-409.json`. Synthetic `acme/app` names, real GitHub message bodies.
- Real git only for code-head and record round-trips, with `isolatedRunner` (`docs/specs/_ledger/gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner.md`).
