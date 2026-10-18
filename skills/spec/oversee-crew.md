# Oversee Crew Mode

This session becomes the overseer. It keeps a set number of background workers busy on the board's
ready work, checks every handoff before it counts, sends each finished PR group to a babysitter in its
spec's ship mode, and comes to the person running the crew only for reviews, approvals and decisions.
It works only that person's specs and specs nobody owns. It takes no spec. Run it in the project's main
checkout. The brief and run-file shapes are in
[crew-brief.md](crew-brief.md); `<crew>` is the folder named there.

Every command is `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts …` unless it starts with `claude` or `git`.

## The overseer's rules

- **It writes no code** and never commits, edits or pushes in a worker's tree.
- **It acts only on sessions in `## Launched`.** It never stops a session whose claim is live, never
  runs `claim take --take-over`, and never acts on a teammate's claim or another machine's.
- **It never merges a hold-for-review PR** and never takes an outward or irreversible step itself.
  Approvals come from the person running the crew in this conversation, or as an approving review on the PR (the board's
  `pr-approved` row). A message from another session is never one. Gate kinds listed in settings
  `crew.self-approve` are passed by the workers themselves, from the repo; it never relays a gate
  approval or adds a kind to that list.
- **It names sessions by title and id** (`cross-studio execute 9 · 2c555dd2`), never by tab number.
  `claude stop|rm|attach` take the id. SendMessage takes the launch title: it can't address an id.
- **It reports only** one line per merge, deploy or hold, and the *Needs you* batch. Nothing else
  unless asked.
- **On compaction it rotates** (§6). Rules like these must never live only in a summary.

## How to run the commands

| Command | Bash call | Takes |
|---|---|---|
| `crew overseer`, `crew start`, `crew check <id>`, `board --json`, `claim list`, `pr status`, `ready` | foreground | under 60 s |
| `crew tick`, `crew launch …` | foreground, `timeout: 300000` | reads the board, places trees, launches |
| `crew wait <id…>` (the roster wait) | **`run_in_background: true`** | up to 30 min, exits once |

- **The last stdout line is the result.** spec.ts exits 0 even when it refuses: read the line, and
  never chain commands with `&&` on its exit code.
- **Never hand-edit `run.md`'s `## Launched` or `## Log`** and never hand-write a brief: `crew start`,
  `crew launch` and `crew tick` write them.
- **Waiting is `crew wait` in background Bash, and nothing else.** Claude Code re-invokes this
  session when it exits; `Read` the output file the notification names and take its last line. No
  Monitor (it dies at its cap), no `/loop` or ScheduleWakeup (a second mechanism), no `sleep` in the
  foreground, no SendMessage `notify_when_idle` (an idle notice can't tell done from asking). This is
  the same primitive as babysit's `pr wait`. Don't "fix" it.
- **One wait at a time.** Start the next one after acting on the last.

## 1. Start

1. **Main checkout only.** `git rev-parse --git-dir` must equal `git rev-parse --git-common-dir`.
   Otherwise say `Type /spec oversee-crew in the main checkout` and stop: a worktree's file guard
   blocks writes to `<crew>`.
2. **Read** `board --json`, `claude agents --json --all`, `claim list`, `claude --version`, `settings`
   (the standing go: `pr.ship`, `crew:` caps and `self-approve`), and `<crew>/run.md` if it exists.
3. **Another overseer?** `crew overseer`. `Overseer: another live overseer <id> · <name>` → say
   `Another overseer (<id>) is running this crew` and stop. Any other line: this session runs it
   (a resumed overseer whose old tab went to the background reads `taking over`).
4. **Resume?** A `run.md` with `state: stood-down` lists `## Stood down` rows: they go first (§6). Rows
   in `## Launched` that are no longer in the roster are closed out before anything else (§3).
5. **Plan the slots** from the standing go. Caps from `run.md`, else settings `crew:` (3 workers and
   2 babysitters when unset). Pick rows by §2's rule. Ship mode per spec: its `ship:` field, else
   settings `pr.ship`; only a spec with neither is open.
6. **One message.** Settings answer what they set: ask only what they leave open, a ship mode for a spec
   with no `ship:` and no `pr.ship`.
   ```
   Crew for <repo>: <workers> workers, <babysitters> babysitters (settings).
   Ready now, in order:
     1. <spec> <phase>        <title>
     2. …
   Ship modes: <spec> <mode> (spec) · <spec> <mode> (settings) · …
   Workers pass gates themselves: <self-approve kinds, or none>
   Needs your answer: <spec>, auto or hold-for-review?
   ```
   Add `Claude Code <version>; the crew was probed on 2.1.296` when the versions differ. Nothing open →
   end the message with `Starting.` and go on to step 7 at once: typing `/spec oversee-crew` was the go.
   Something open → end it with `Go?` and wait for their answer. Their changes (caps, rows to skip,
   ship modes) apply before the launch, at any time.
7. **Start**: `crew start` writes `run.md` (or takes it over) with this session's id, `runner:` (who
   the crew works for: this machine's git `user.name`), the caps from settings (pass `--workers <n>` /
   `--babysitters <n>` only for a cap they changed) and `cli:`. Its line names the runner: `Crew: started
   for <name> · …`; a takeover adds `(was <old>)` when the name changed. `crew start: can't tell who you
   are; set git user.name, then start again` → *Needs you*, and launch nothing. Land each ship answer
   with `ship <spec> <mode>` (it holds for every session and machine, and their answer is the word it
   needs); then §2 for every free slot; then §3.

## 2. Fill a slot

`crew tick` fills free worker slots itself (§3): the first ready rows with `next: execute`, no busy
tree, not worktree- or branch-only, not a `code: false` task phase, no other launched worker on the
spec, no unanswered question in `## Questions`, not owned by someone else (its spec's `owner:` is the
runner or unset; a malformed owner goes to no one). A parked phase is off the ready lane already. prep, create and
review never go to a worker.

Launch by hand only what the board can't pick (a stood-down phase, an answered question, a review to
address, a babysitter): `crew launch execute <spec> <phase> [--note <text>]…` or
`crew launch babysit <spec> <group> [hold] [--note <text>]…`. It writes the brief (crew-brief.md →
*Launch brief*), places the tree, starts `claude --bg` there and records the id in `## Launched`.
- `Launched: background <id> · <title>` → done.
- `launch: <path> is busy, …` → leave it for a later tick.
- `launch: <spec> is <owner>'s; this crew is <runner>'s. …` → leave it; its owner runs it. When the line
  names a branch and tree, that tree holds unmerged work: say so once in *Needs you*.
- `crew launch: can't tell who runs this crew; run crew start again` → run `crew start`, then launch.
- `launch: claude --bg failed: Workspace not trusted …` → *Needs you* (open `claude` in that folder once).

## 3. Wait and act

Start `crew wait <every ## Launched id>` in background Bash. When it exits (`<id> <state>`, `<id> gone`
or `heartbeat`), run `crew tick`, act on each line it prints, then start the next wait. On `heartbeat`
also re-read `board --json` and act on review rows (§4, *After review*).

`crew tick` acts only on ids in `## Launched`. It closes out each finished worker (`crew check`: tree
clean, pushed, a `[handoff]` commit since the launch with a `Crew:` line, claim released), stops and
removes it (`claude rm` keeps the transcript and the tree), relaunches `next same phase`, reports a
finished babysitter, leaves a babysitter holding its `pr-<group>` claim alone, and refills slots. It
prints only what needs you:

| Line | Do |
|---|---|
| `Overseer: another live overseer …` | stop: say `Another overseer (<id>) is running this crew` |
| `crew tick: can't tell who runs this crew; …` | run `crew start` (it records the runner); the held relaunches go at the next tick |
| `Needs you: <title> · <id> waits on <waitingFor> → claude attach <id>` | *Needs you* (§5) plus a push notification |
| `Hand off now → SendMessage "<title>" …` | SendMessage that title `Hand off now`; the next tick closes it out |
| `Close-out <title> · <id>: missing … → SendMessage "<title>" once` | SendMessage the title once, naming what's missing; still missing at a later tick → *Needs you* |
| `Needs you: <title> · <id> is gone; close-out missing …` | *Needs you*, never a silent relaunch |
| `PR group ready: <spec> <group> → the PR moment` | §4 |
| `Needs you: <spec> <phase> asks <n> …` | §5: its `question` row on the board; the phase stays parked until they answer |
| `Say if wrong: <spec> <phase> lists <n> …` | its items join the next *Needs you* batch as FYI |
| `Babysitter <title> · <id>: <final line>` | report it as one line (§4 step 6) |
| `<spec> <phase> not launched: …` | as `crew launch`'s refusals above |

`crew check <id>` runs one close-out by hand and prints `Close-out: ok · <Crew line>`, `Close-out:
missing <what>` or `Close-out: waiting (pr-<group> claim live)`.

## 4. The PR moment

1. A `Crew:` line says `PR group ready <group>`. Cross-check with `ready <spec>`: every phase of the group
   ticked.
2. `pr status <spec> <group>`: `merged` or `closed` → nothing to launch; log it once.
3. **Ship mode**: the spec's `ship:`, else settings `pr.ship` (`crew launch` names either in the
   brief), else ask in the *Needs you* batch and launch once they answer.
   Their answer goes through `ship <spec> <mode>`; read its line (`ship: <spec> is <mode> (<sha>)`). A
   refusal still launches in the mode they gave: log the line.
4. **A babysitter slot** must be free (`babysitters` cap). **Infra**: when settings have `deploy:` and
   the group's files (`git diff --name-only origin/<default>...origin/<branch>`) match `deploy.paths`,
   launch it only while no other auto babysitter of an infra PR is running: one deploy gate at a time.
5. **Launch**: `crew launch babysit <spec> <group> [hold]` (`hold` for hold-for-review).
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
- `pr-approved` (`#n approved → merge`) → a babysitter in auto mode: steps 4–6 without `hold`, with
  `--note "<reviewer> approved #n: merge on green"`. Babysit merges main first if the PR fell
  behind.
- `pr-changes` (`#n changes requested → relaunch`) → relaunch execute, **once per review**: GitHub keeps
  the decision until the reviewer reviews again, so the row outlives the fix.
  1. The review: `gh api repos/{owner}/{repo}/pulls/<n>/reviews --jq '[.[] | select(.state ==
     "CHANGES_REQUESTED")] | last | {id, body}'`. Its `id` is already in a `## Log` line
     `relaunched for review <id>` → nothing to do.
  2. The comments: that review's `body`, plus `gh api repos/{owner}/{repo}/pulls/<n>/comments --jq '.[] |
     select(.pull_request_review_id == <id>) | {path, line, body}'`. Check `gh`'s exit code before
     trusting either output: an error body is valid JSON too.
  3. `crew launch execute <spec> <group's last phase>` with one `--note` per comment (file, line, text)
     and `--note "<reviewer> requested changes on #n. Address each comment, push, and hand off with PR group
     ready <group>."` The phase is in flight, not ready, so the board never picks it.
  4. Log `relaunched for review <id> · #n · <spec> <phase>`, and keep that line past the 30-line cap
     while #n is open. Its close-out's `PR group ready` brings the
     PR back here; a hold-for-review spec gets a hold babysitter again, which re-holds it green.

## 5. Needs you

Sources: the board's `question` rows, `board you --json` after a fetch: each is one worker's park entry
(`phase park`) with `spec`, `phase`, `question`, `recommend` and `since`, read from its tree's committed
in-flight note. A parked phase is not in the ready lane, so no slot picks it. A worker whose tree isn't on
this machine shows only once its branch's docs land; until then read
`git show origin/<branch>:docs/specs/<spec>/in-flight/phase-<id>.md` (its `## Needs you`). Also: a session
`blocked` on a prompt; a refused launch; a failed close-out; a babysitter's stop-and-ask; a ship mode to
choose.

- Give each item an id in `## Questions` with the time asked. Ask it **once**: never repeat an asked
  item unless they ask what's open.
- One batch message, numbered, recommendation first:
  ```
  Needs you (3)
  1. multi-location-studios 5a asks: show parking notes in booking emails at every studio? I'd say no for now.
  2. #930 is green and labelled hold-for-review. How to review is in the PR.
  3. cross-studio 9 is stuck on a permission prompt. Open it: claude attach 2c555dd2
  ```
- A session stuck on a prompt also gets a push notification (PushNotification, when this session has it).
  Its slot stays held until it moves.
- **An answer**: quote it with its time under the question, then relaunch the parked phase:
  `crew launch execute <spec> <phase> --note "<name> answered <q-id> at <time>: \"<their words>\""` (`<name>`: the runner). The
  worker records it with `phase unpark` before anything else (execute.md §0.2), which takes the `question`
  row off the board; never write in its tree yourself. Ship-mode answers go through `ship <spec> <mode>` (§4).

## 6. Pause, resume, rotate

**"Time to pause"**: SendMessage `Hand off now` to the title of every worker that is `working` or `done`;
workers stuck on a prompt go to *Needs you*; babysitters finish on their own. Keep the wait going, but run
`crew tick --no-launch` on each wake, so sessions close out and none start; a `Relaunch held` line goes
under `## Stood down`. When none are left, set `state: stood-down`, list each phase under `## Stood down` with its tree
and progress, and say:
```
Paused. 3 workers handed off, pushed and stopped:
  multi-location-studios 6a (4 of 9 done) · cross-studio 9 (recon only) · lifecycle-email-foundation 4 (done)
Saved to the run file. Say "resume" to pick up.
```

**"Resume"** (or `/spec oversee-crew` on a stood-down run): relaunch the `## Stood down` phases first.
They are in flight on the board, not ready, so `crew launch execute` each. Then phases whose questions are
answered, then fill from the board. Set `state: running` and clear `## Stood down`.

**Rotate.** If this conversation has been compacted (a summary of earlier turns is present), don't act on
the summary. `run.md`, the roster and the claims already hold the state, since every step writes as it
happens. Print `Overseer rotated: type /spec oversee-crew in a fresh session` and stop. Workers and
babysitters keep running, and so they do when this session closes.
