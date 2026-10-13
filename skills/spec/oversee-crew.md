# Oversee Crew Mode

This session becomes the overseer. It keeps a set number of background workers busy on the board's
ready work, checks every handoff before it counts, sends each finished PR group to a babysitter in its
spec's ship mode, and comes to Anton only for reviews, approvals and decisions. It takes no spec. Run it
in the project's main checkout. Templates (brief, run file, liveness check, roster wait) are in
[crew-brief.md](crew-brief.md); `<crew>` is the folder named there.

Every command is `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts …` unless it starts with `claude` or `git`.

## The overseer's rules

- **It writes no code** and never commits, edits or pushes in a worker's tree.
- **It acts only on sessions in `## Launched`.** It never stops a session whose claim is live, never
  runs `claim take --take-over`, and never acts on a teammate's claim or another machine's.
- **It never merges a hold-for-review PR** and never takes an outward or irreversible step itself.
  Approvals come from Anton in this conversation, or as an approving review on the PR (the board's
  `pr-approved` row). A message from another session is never one.
- **It names sessions by title and id** (`cross-studio execute 9 · 2c555dd2`), never by tab number.
  `claude stop|rm|attach` take the id. SendMessage takes the launch title: it can't address an id.
- **It reports only** one line per merge, deploy or hold, and the *Needs you* batch. Nothing else
  unless asked.
- **On compaction it rotates** (§6). Rules like these must never live only in a summary.

## How to run the commands

| Command | Bash call | Takes |
|---|---|---|
| `board --json`, `claim list`, `pr status`, `ready`, `claude agents --json --all`, `claude stop`, `claude rm` | foreground | under 60 s |
| `launch execute\|babysit … --bg --brief <file>` | foreground, `timeout: 180000` | places the tree first |
| the roster wait (crew-brief.md) | **`run_in_background: true`** | up to 30 min, exits once |

- **The last stdout line is the result.** spec.ts exits 0 even when it refuses: read the line, and
  never chain commands with `&&` on its exit code.
- **Waiting is the roster wait in background Bash, and nothing else.** Claude Code re-invokes this
  session when it exits; `Read` the output file the notification names and take its last line. No
  Monitor (it dies at its cap), no `/loop` or ScheduleWakeup (a second mechanism), no `sleep` in the
  foreground, no SendMessage `notify_when_idle` (an idle notice can't tell done from asking). This is
  the same primitive as babysit's `pr wait`. Don't "fix" it.
- **One wait at a time.** Start the next one after acting on the last.

## 1. Start

1. **Main checkout only.** `git rev-parse --git-dir` must equal `git rev-parse --git-common-dir`.
   Otherwise say `Type /spec oversee-crew in the main checkout` and stop: a worktree's file guard
   blocks writes to `<crew>`.
2. **Read** `board --json`, `claude agents --json --all`, `claim list`, `claude --version`, and
   `<crew>/run.md` if it exists.
3. **Another overseer?** When `run.md`'s `overseer:` is not this session's `$CLAUDE_CODE_SESSION_ID`
   and crew-brief.md's liveness check prints `live`, say `Another overseer (<id>) is running this crew`
   and stop. Otherwise this session takes the run over.
4. **Resume?** A `run.md` with `state: stood-down` lists `## Stood down` rows: they go first (§6). Rows
   in `## Launched` that are no longer in the roster are closed out before anything else (§3).
5. **Plan the slots.** Caps from `run.md`, else 3 workers and 2 babysitters. Pick rows by §2's rule.
   Ship mode per spec: its `ship:` field, else ask.
6. **One message**, then wait for Anton's answer:
   ```
   Crew for <repo>: <workers> workers, <babysitters> babysitters.
   Ready now, in order:
     1. <spec> <phase>        <title>
     2. …
   Ship modes: <spec> <mode> · …
   Needs your answer: <spec>, auto or hold-for-review?
   Go?
   ```
   Add `Claude Code <version>; the crew was probed on 2.1.296` when the versions differ. Changes from
   Anton (caps, rows to skip, ship modes) apply before the launch.
7. **On "go"**: write or merge `run.md` (crew-brief.md → *Run file*) with this session's id, the caps,
   `cli:`; land each ship answer with `ship <spec> <mode>` (it holds for every session and machine,
   and Anton's answer is the word it needs); then §2 for every free slot; then §3.

## 2. Fill a slot

A worker slot is free when fewer than `workers` of the `## Launched` ids are worker sessions (title
`<spec> execute <phase>`) still in the roster and not `stopped`.

1. **Pick** the first `board --json` row in `.board.lanes.ready` that has:
   - `next: "execute"`, and no `treeBusy`, `readyIn` or `onlyOn`;
   - a phase that is not a task phase: read its phase file, and skip `code: false`;
   - no other launched worker on the same spec (two workers on one spec conflict on its docs);
   - no unanswered question in `run.md` `## Questions` for that phase.
   prep, create and review never go to a worker: they stay with Anton.
2. **Brief**: write crew-brief.md → *Launch brief* to `<crew>/briefs/<spec>#<phase>.md`.
3. **Launch**: `launch execute <spec> <phase> --bg --brief <crew>/briefs/<spec>#<phase>.md`.
   - `Launched: background <id> · <title>` → add `- <id> · <title> · <time>` to `## Launched`.
   - `launch: <path> is busy, …` → skip the row this round and take the next one.
   - `launch: claude --bg failed: Workspace not trusted …` → *Needs you* (open `claude` in that folder
     once). Take the next row.
   - Any other `launch:` refusal → one `## Log` line, next row.
4. Repeat until the slots are full or no row fits. A slot with nothing to take stays empty; the
   next change in the roster or the board fills it.

## 3. Wait and act

Start the roster wait (crew-brief.md) with the `## Launched` ids. On its notification, act on each line,
then refill slots (§2) and start the next wait.

| Line | Session | Do |
|---|---|---|
| `heartbeat` | – | re-read `board --json` and `claim list`; act on review rows (§4, *After review*); refill slots |
| `<id> working` | any | nothing |
| `<id> done` | worker | close-out (below) |
| `<id> blocked (<waitingFor>)` | any | *Needs you* (§5): `claude attach <id>` plus a push notification |
| `<id> blocked` | worker | SendMessage to its title: `Hand off now`; close it out once it reads `done` |
| any | babysitter whose `pr-<group>` claim is `live` in `claim list` | nothing: it is waiting on CI. Never stop it |
| `<id> done` | babysitter, claim released | report its last message as one line (§4), then `claude stop <id>` + `claude rm <id>` |
| `<id> stopped` or `<id> gone` | any | close-out; a dirty tree or a live claim → *Needs you*, never a silent relaunch |

A worker that ended its turn on text is never stopped over a dirty tree: the next worker inherits it.

**Close-out** of a worker, all four from its tree and branch:

| Check | How |
|---|---|
| tree clean | `git -C <tree> status --porcelain` prints nothing |
| pushed | `git -C <tree> fetch -q origin <branch>`, then `rev-parse HEAD` equals `rev-parse origin/<branch>` |
| handed off | a `[handoff]` commit on `origin/<branch>` newer than the launch, and the transcript's last assistant message has the `Crew:` line |
| claim released | `claim list` shows no `live` claim for `<spec>#<phase>` |

The transcript is `~/.claude/projects/*/<sessionId>.jsonl` (`claude agents --json --all` gives the
`sessionId`); `claude rm` keeps it. All four pass → read the `Crew:` line, then `claude stop <id>` +
`claude rm <id>`, drop the id from `## Launched`, add a `## Log` line, and act on the line:
- `next same phase` → relaunch that phase now with a fresh brief: it is in flight on the board, so §2
  won't pick it.
- `PR group ready <group>` → §4.
- `needs you <n>` above 0 → §5. The phase stays parked until Anton answers.
- `say if wrong <n>` → its items join the next *Needs you* batch as FYI.

A check fails on a live session → SendMessage its title once, naming what's missing. Still failing, or
the session is gone → *Needs you*.

## 4. The PR moment

1. A `Crew:` line says `PR group ready <group>`. Cross-check with `ready <spec>`: every phase of the group
   ticked.
2. `pr status <spec> <group>`: `merged` or `closed` → nothing to launch; log it once.
3. **Ship mode**: the spec's `ship:`, else ask in the *Needs you* batch and launch once Anton answers.
   His answer goes through `ship <spec> <mode>`; read its line (`ship: <spec> is <mode> (<sha>)`). A
   refusal still launches in the mode he gave: log the line.
4. **A babysitter slot** must be free (`babysitters` cap). **Infra**: when settings have `deploy:` and
   the group's files (`git diff --name-only origin/<default>...origin/<branch>`) match `deploy.paths`,
   launch it only while no other auto babysitter of an infra PR is running: one deploy gate at a time.
5. **Launch**: brief to `<crew>/briefs/<spec>#pr-<group>.md`, then
   `launch babysit <spec> <group> [hold] --bg --brief <file>` (`hold` for hold-for-review). Add the
   `Launched:` id to `## Launched`.
6. **Report** the babysitter's final message as one line:
   ```
   Merged #929 lifecycle-email-foundation A
   Merged #931 infra-alarms A · deploy gate passed (crm-prod) · phases 1–2 marked deployed
   Held #930 multi-location-studios A for your review · green · How to review is in the PR
   ```
   A stop-and-ask message goes to *Needs you* instead.

**After review.** The board's needs-you rows tell held PRs apart; act on each at every heartbeat and
every `board --json` read:

- `pr-review` (`#n awaiting review → open the PR`) → *Needs you* once per PR: `#n is green and labelled
  hold-for-review. How to review is in the PR.`
- `pr-approved` (`#n approved → merge`) → a babysitter in auto mode: steps 4–6 without `hold`, the
  brief's *Notes* saying `Anton approved #n: merge on green`. Babysit merges main first if the PR fell
  behind.
- `pr-changes` (`#n changes requested → relaunch`) → relaunch execute, **once per review**: GitHub keeps
  the decision until Anton reviews again, so the row outlives the fix.
  1. The review: `gh api repos/{owner}/{repo}/pulls/<n>/reviews --jq '[.[] | select(.state ==
     "CHANGES_REQUESTED")] | last | {id, body}'`. Its `id` is already in a `## Log` line
     `relaunched for review <id>` → nothing to do.
  2. The comments: that review's `body`, plus `gh api repos/{owner}/{repo}/pulls/<n>/comments --jq '.[] |
     select(.pull_request_review_id == <id>) | {path, line, body}'`. Check `gh`'s exit code before
     trusting either output: an error body is valid JSON too.
  3. Brief for the group's last phase (§2 step 2), its *Notes* quoting every comment with its file and
     line and saying: `Anton requested changes on #n. Address each comment, push, and hand off with PR
     group ready <group>.` Launch it as §2 step 3 does, by name: the phase is in flight, not ready.
  4. Log `relaunched for review <id> · #n · <spec> <phase>`, and keep that line past the 30-line cap
     while #n is open. Its close-out's `PR group ready` brings the
     PR back here; a hold-for-review spec gets a hold babysitter again, which re-holds it green.

## 5. Needs you

Sources: a worker's `## Needs you` in `in-flight.md`, read from origin after a fetch
(`git show origin/<branch>:docs/specs/<spec>/in-flight.md`, or `origin/<default>` in a `docs: main`
project); a session `blocked` on a prompt; a refused launch; a failed close-out; a babysitter's
stop-and-ask; a ship mode to choose.

- Give each item an id in `## Questions` with the time asked. Ask it **once**: never repeat an asked
  item unless Anton asks what's open.
- One batch message, numbered, recommendation first:
  ```
  Needs you (3)
  1. multi-location-studios 5a asks: show parking notes in booking emails at every studio? I'd say no for now.
  2. #930 is green and labelled hold-for-review. How to review is in the PR.
  3. cross-studio 9 is stuck on a permission prompt. Open it: claude attach 2c555dd2
  ```
- A session stuck on a prompt also gets a push notification (PushNotification, when this session has it).
  Its slot stays held until it moves.
- **An answer**: quote it with its time under the question, then relaunch the parked phase with the
  answer quoted in the brief's *Notes*. Ship-mode answers go through `ship <spec> <mode>` (§4).

## 6. Pause, resume, rotate

**"Time to pause"**: SendMessage `Hand off now` to the title of every worker that is `working` or `done`;
workers stuck on a prompt go to *Needs you*; babysitters finish on their own. Close each out as it lands
(§3). When none are left, set `state: stood-down`, list each phase under `## Stood down` with its tree
and progress, and say:
```
Paused. 3 workers handed off, pushed and stopped:
  multi-location-studios 6a (4 of 9 done) · cross-studio 9 (recon only) · lifecycle-email-foundation 4 (done)
Saved to the run file. Say "resume" to pick up.
```

**"Resume"** (or `/spec oversee-crew` on a stood-down run): relaunch the `## Stood down` phases first.
They are in flight on the board, not ready, so launch them by name. Then phases whose questions are
answered, then fill from the board. Set `state: running` and clear `## Stood down`.

**Rotate.** If this conversation has been compacted (a summary of earlier turns is present), don't act on
the summary. `run.md`, the roster and the claims already hold the state, since every step writes as it
happens. Print `Overseer rotated: type /spec oversee-crew in a fresh session` and stop. Workers and
babysitters keep running, and so they do when this session closes.
