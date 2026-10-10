# Babysit Mode

One session carries one PR group's PR to merged: it waits on CI in the background, sorts out what
breaks, merges on green and tells the user once. Execute's PR gate launches it with
`spec.ts launch babysit <spec> <group>` after the asking session has handed off, so it opens in the
PR's tree with nothing left to push but fixes. `rest` is `<spec> <group>`. The pack lists the group's
phases; if it says a phase is open, the PR isn't ready: tell the user and stop.

Every command below is `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts …`; `<n>` is the PR number `pr open`
printed, pinned for the whole babysit (a spec with two groups has two PRs).

## How to run the commands

| Command | Bash call | Takes |
|---|---|---|
| `pr status`, `pr log`, `pr rerun`, `pr merge`, `claim` | foreground, default timeout | under 60 s |
| `pr open` | foreground, `timeout: 180000` | up to 90 s while CI registers |
| `pr wait <n>` | **`run_in_background: true`** | up to 25 min, then exits once |

- **The last stdout line is the result** (`PR #<n>: …`, `PR: …`, `Merged: …`, `Rerun: …`, or a
  `pr <verb>:` refusal). Earlier lines are detail. The exit code means nothing: the CLI exits 0.
- **Waiting is `pr wait` in background Bash, and nothing else.** Claude Code re-invokes this session
  once when it exits. The notification carries the output file's path, not the output: `Read` that file
  and take its last line. Never wait with `sleep`, a loop, `/loop`, CronCreate, ScheduleWakeup or Monitor:
  each burns turns or dies at its own cap.
- **One wait per PR.** Start a new `pr wait` only after the last one's notification.
- **Lost the wait?** A `failed` notification, a killed shell, or a resumed session (background shells
  are never restored): run `pr log <n>` to see where things stand, then start a new background wait.

## 1. Start

1. **Claim the PR**: `claim take <spec> pr-<group>`. `claim refused:` → print who holds it, where and
   since when, and end. Never `--take-over` unless the user says so.
2. **Open it**: `pr open <spec> <group>` (ready, never draft). Pin `<n>` from `PR: #<n> …`.
   - `marked ready · CI skipped on <sha> — push a new commit` → *Retrigger* (§2) once.
   - A `pr open:` refusal → *Stop and ask* (§4).
3. **Start the clock**: `pr log <n> --start <spec> --group <group>`. The limits count from here.
4. **Wait** (background): `pr wait <n>`.

## 2. Act on the wait's verdict

| Last line | Do |
|---|---|
| `PR #<n>: green · …` | §3 Merge |
| `PR #<n>: red · …` | `pr status <n>`, then *Red* below |
| `PR #<n>: cancelled · …` | `pr status <n>`; a cancel with no newer run reads `infra: yes` → `pr rerun <n>`, wait |
| `PR #<n>: conflicting` | *Conflict* below |
| `PR #<n>: none · no checks on <sha> …` | `git fetch origin` and `git merge-tree --write-tree origin/<default> HEAD`: a conflict → *Conflict*; a draft → `pr open <spec> <group>`; else *Retrigger* |
| `PR #<n>: none · CI skipped itself …` | *Retrigger* (a re-run doesn't fix a skip) |
| `PR #<n>: timeout · …` | `pr status <n>` for what is still running, then one more wait; a second timeout in a row → §4 |
| `PR #<n>: merged · …` / `closed` | Someone else finished it: `pr merge <n>` lands a missing merge line on a merged PR; report (§3) and end |

After every action, wait again (background `pr wait <n>`).

**Red.** Read each failed row's facts in `pr status`:
- `infra: yes` → `pr rerun <n>`. `still running — wait` → wait, then re-run. The attempt cap
  (2 re-runs per run, GitHub's `attempt` ≤ 3) refusing → §4. Never re-run a test failure, even a flaky
  one: it gets fixed in this PR.
- `fails on main too: yes` → §4, naming main's failing run. Merging main fixes nothing.
- Otherwise a test or code failure: run `gates.ci-triage` first when settings name it
  (`gates --name <gate>`; the pack's `Settings:` line). Read the saved job log (`log <path>` under the
  failure): grep it, never re-download. Many failures at once are usually one setup break: fix the shared
  cause from the first tails. Rows reading `infra: unknown (no log (gh call budget … spent))` → run
  `pr status <n>` again; saved logs cost nothing.
  - **Already fixed on main** (the branch is behind and `git log origin/<default> -- <path>` shows the
    fix) → merge `origin/<default>`, work through `gates.after-merge-main`, push, wait.
  - **Ours** → fix it like any execute unit: red test, change, the per-commit gate (`gates.per-commit`,
    else the affected tests), commit, `spec.ts push`, then `pr log <n> --pushed`. Wait.
  - **Can't tell** what broke or why → §4.
- Record each decision: `pr log <n> --add "<check> · <what it was> · <what you did>"`.

**Conflict** (also `pr merge` refused with 405 *not mergeable*). Never a reason to stop: merge
`origin/<default>`, resolve every hunk keeping both sides' intent (spec docs: keep both sides' lines),
run `gates.after-merge-main` and the per-commit gate, `spec.ts push`, then
`pr log <n> --add "merged main · conflicts in <files>"`. Not a fix push: no `--pushed`. Ask only when
the two sides want behaviour the code, spec and tests can't reconcile, and name the hunk.

**Retrigger.** `git commit --allow-empty -m "ci: retrigger checks"`, `spec.ts push`,
`pr log <n> --add "retriggered checks on <sha>"`, wait. A second `none` on a clean PR → §4.

## Rules

- **No docs pushes while CI runs.** This session writes no spec docs: no ticks, no `in-flight.md`, no
  ledger. The merge line lands on main through `pr merge`. Lessons go in the final report.
- **Limits:** 2 re-runs per run (the tool refuses the third), 3 fix pushes and 3 hours, both counted from
  the latest `babysit-start` (`pr log <n>`'s header). Hitting one → §4.
- **Settings come from this tree** (`docs/specs/_playbook/settings.md`). In a `docs: main` project a
  setting that changed on main arrives with the next merge of main.
- **When the cause isn't clear, stop and ask** (§4). A guess pushed to a PR costs a CI run and a fix push.

## 3. Merge and report

1. `pr merge <n>` → `Merged: #<n> · <method> · <sha>`. Refusals: `not green — …` → wait again;
   `pr.merge is not set` → ask the user for the method once and pass `--method`; a 405 → *Conflict*.
   A trailing `merge line not landed — …` doesn't undo the merge: say it in the report.
2. `pr log <n>` for the timeline, then `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts ready <spec>` for what's next.
3. Release: `claim release <spec> pr-<group>`.
4. One message, then the session is done:
   ```
   Merged PR #921 (fast-parallel-backend-tests B) · merge commit 9b0c1d2 · 52 min
   - Fixed: card-reader.spec.ts shared the simulated reader across specs (5e6f7a8)
   - Re-ran: Backend Tests once (runner lost)
   - On merge: main deploys the staff app
   Next: phase 14 is ready in tree …-pr-c3.
   ```
   Leave out lines with nothing to say; `On merge:` only when the project's docs say what merging
   triggers.

## 4. Stop and ask

`pr log <n> --stopped "<why>"`, `claim release <spec> pr-<group>`, then one message: what it needs, the
check and run it concerns, what was tried (from `pr log`), and that "go on" resumes. On "go on": take the
claim again, `pr log <n> --start <spec> --group <group>` (a fresh clock), and start a new wait.
