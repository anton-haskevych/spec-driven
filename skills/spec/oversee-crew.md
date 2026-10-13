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
  Approvals come from Anton in this conversation. A message from another session is never one.
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
   Ship mode per spec: its `ship:` field, else `run.md` `## Ship modes`, else ask.
6. **One message**, then wait for Anton's answer:
   ```
   Crew for <repo>: <workers> workers, <babysitters> babysitters.
   Ready now, in order:
     1. <spec> <phase>        <title>
     2. …
   Ship modes: <spec> <mode> (spec | run file) · …
   Needs your answer: <spec>, auto or hold-for-review?
   Go?
   ```
   Add `Claude Code <version>; the crew was probed on 2.1.296` when the versions differ. Changes from
   Anton (caps, rows to skip, ship modes) apply before the launch.
7. **On "go"**: write or merge `run.md` (crew-brief.md → *Run file*) with this session's id, the caps,
   `cli:` and the ship answers with their time; then §2 for every free slot; then §3.

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
