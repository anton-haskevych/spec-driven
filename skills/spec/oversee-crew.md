# Oversee Crew Mode

This session becomes the overseer. It keeps a set number of background workers busy on the board's
ready work, checks every handoff before it counts, sends each finished PR group to a babysitter in its
spec's ship mode, and comes to the person running the crew only for reviews, approvals and decisions.
It works only that person's specs and specs nobody owns. Run it in the project's main checkout. With a spec
(`/spec oversee-crew <spec>`) it runs that spec alone, end to end: §7 *One spec* says what changes; everything
else holds as written. The brief and run-file shapes are in
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
| `crew overseer`, `crew start`, `crew check <id>`, `board --for me --json`, `claim list`, `pr status`, `ready` | foreground | under 60 s |
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
2. **Read** `board --for me --json` (its ready lane holds only this person's specs and unowned ones), `claude agents --json --all`, `claim list`, `claude --version`, `settings`
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
spec, no unanswered question in `## Questions` (a spec in files), not owned by someone else (its spec's `owner:` is the
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
also re-read `board --for me --json` and act on review rows (§4, *After review*).

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
| `Needs you: <spec> <phase> asks <n> …` | §5: its `Question:` line (a spec on the board) or its `question` row; the phase stays parked until they answer |
| `Question: <q-id> · <spec> · phase <id> — "<question>" …` | §5 *Needs you*, once per question |
| `Say if wrong: <spec> <phase> lists <n> …` | its items join the next *Needs you* batch as FYI |
| `Babysitter <title> · <id>: <final line>` | report it as one line (§4 step 6) |
| `<spec> <phase> not launched: …` | as `crew launch`'s refusals above |
| `Overseen: <spec> (no live overseer, N workers)` | *Needs you* once: `<spec>'s overseer is gone; type /spec oversee-crew <spec> in a fresh session`. This crew leaves that spec alone |

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
every `board --for me --json` read:

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

Sources: for a spec on the board, the `Question:` lines `crew tick` prints: the record's open questions
(`phase park` asks them), from every machine at once, each with its id and the command that answers it.
For a spec in files, the board's `question` rows (`board you --json` after a fetch): one worker's park
entry with `spec`, `phase`, `question`, `recommend` and `since`, read from its tree's committed in-flight
note; a worker whose tree isn't on this machine shows only once its branch's docs land, until then read
`git show origin/<branch>:docs/specs/<spec>/in-flight/phase-<id>.md` (its `## Needs you`). A parked phase
is not in the ready lane, so no slot picks it. Also: a session `blocked` on a prompt; a refused launch; a
failed close-out; a babysitter's stop-and-ask; a ship mode to choose.

- A question on the board is already recorded: don't copy it into `## Questions`. Give every other item
  (a spec in files' park, a blocked session, a ship mode) an id in `## Questions` with the time asked.
  Ask each **once**: never repeat an asked item unless they ask what's open.
- One batch message, numbered, recommendation first:
  ```
  Needs you (3)
  1. multi-location-studios 5a asks: show parking notes in booking emails at every studio? I'd say no for now.
  2. #930 is green and labelled hold-for-review. How to review is in the PR.
  3. cross-studio 9 is stuck on a permission prompt. Open it: claude attach 2c555dd2
  ```
- A session stuck on a prompt also gets a push notification (PushNotification, when this session has it).
  Its slot stays held until it moves.
- **An answer** to a question on the board: record it with
  `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts question answer <spec> <q-id> "<their words>"` (their words, as
  said; it keeps who and when, and refuses when someone answered first or the question changed since the
  tick read it), then relaunch the parked phase: `crew launch execute <spec> <phase>`. Its pack shows the
  answer. A park of a spec in files: quote the answer with its time under the question in `## Questions`,
  then `crew launch execute <spec> <phase> --note "<name> answered <q-id> at <time>: \"<their words>\""`
  (`<name>`: the runner); the worker records it with `phase unpark` before anything else (execute.md §0.2),
  which takes the `question` row off the board. Never write in a worker's tree yourself. Ship-mode answers
  go through `ship <spec> <mode>` (§4).

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
happens. Print `Overseer rotated: type /spec oversee-crew in a fresh session` (with `<spec>` after it for a one-spec run) and stop. Workers and
babysitters keep running, and so they do when this session closes.

## 7. One spec

`/spec oversee-crew <spec>` points this session at one spec: it plans the order, runs the spec's lanes (PR groups)
side by side, gathers their work on the spec branch `feat/<spec>` and ships it as one final PR. Pointing it at the
spec is the whole instruction. Several run at once, one per spec, under the machine's limit of 6 execute workers.
Every rule above holds, with these differences:

- **Every crew command takes `--spec <spec>`**: `crew overseer`, `crew start`, `crew tick`. The run file is
  `<crew>/run-<spec>.md`; `crew launch` files under it while it is open.
- **The spec must be on the board's record.** `crew start --spec` always turns spec-branch mode on and refuses a
  spec in files (`crew start: <spec> is not on the board; …`): pass the line on and stop.

### Start

1. Main checkout, as §1 step 1.
2. **Another overseer?** `crew overseer --spec <spec>`. `another live overseer <id> · <name>` → say `Another overseer
   (<id>) is running <spec>` and stop.
3. **Takeover?** A `run-<spec>.md` that is `running` (this session reads `taking over`): skip to step 7 at once.
   `crew start --spec` again sees the mode already on and skips its checks. `stood-down`: §6's resume.
4. **Read the order**: `ready <spec> --order` prints `Order:` (batches that run side by side), `Longest:`, `Lanes:`,
   and when they apply `Ships alone?`, `No lane:`, `Same files:` and `Waiting:`.
5. **Plan the lanes yourself.** These are your calls, never questions:
   - Every open code phase needs a lane: give each `No lane:` phase one (all of them on `Lanes: none`) with
     `phase set <spec> <phase> --pr <group>`.
   - Fold a short lane into the longest chain when that saves a merge; give `Same files:` pairs one lane.
   - A phase holding two jobs that could run side by side: `phase split`.
   - Ship-alone groups: take the `Ships alone?` suggestions (code another phase needs deployed). A ship-alone group
     is cut from main and PRs to main; it may not need another group's phase. It is frozen once its branch exists.
   Each call goes on one *Say if wrong* line in the start message.
6. **One message**, ending `Starting.`, never `Go?`: nothing in a one-spec run is open.
   ```
   Crew for <spec>: <workers> workers, <babysitters> babysitters (settings) · machine <n> of 6 busy.
   Order: <the Order: line>   (longest: <the Longest: chain>)
   Lanes: <the Lanes: line, after your regroups>
   Say if wrong: <each regroup, split and ship-alone pick>
   Ship mode: <mode> (spec | settings | default: holds for your review). Starting.
   ```
7. **Start**: `crew start --spec <spec> [--ship-alone <group,…>]` (caps as §1 step 7). It prints `Spec branch:
   feat/<spec> cut from <sha>` (takeover: `(spec-branch mode already on)`), then `Crew: started …`. A `crew start:`
   refusal (phases with no `pr:`, an old `feat/<spec>*` branch, a PR the spec already shipped as one) goes to
   *Needs you* as is; launch nothing. Then §3, with `crew tick --spec <spec>`.

### Ship mode never waits

The spec's `ship:`, else settings `pr.ship`, else `hold-for-review`: babysit the final PR to green and hold it.
Never ask it in *Needs you*, and never merge to main on a default. Only the person running the crew makes a spec
merge itself, by saying so: `ship <spec> auto`.

### Ticks

`crew tick --spec <spec>` works this spec alone. It launches one worker per lane, holds a phase that needs another
lane's work until that lane's worker closed out, and stops at the machine limit. Its lines, beside §3's table:

| Line | Do |
|---|---|
| `Machine full: <n> of 6` | nothing; a later tick fills the slot |
| `PR group ready: <spec> <group> → the PR moment` | only a ship-alone group prints it: §4, with this section's ship mode |
| `PR moment: <spec> final PR` | `crew launch babysit <spec> default` (`hold` for hold-for-review). The babysitter opens the PR from its tree on `feat/<spec>`, merges main into it from then on, and in hold-for-review writes *How to review* one section per phase. Report its final line as §4 step 6 |
| `Finished: <spec> has no open phase and no session out; run ended` | report one line (`Finished <spec>: #<n> merged` or `held for your review`) and stop: this overseer is done |

- **A lane worker's close-out is the tick's.** Merged back means the phase's recorded commit is in `feat/<spec>`, and
  its `Crew:` line may come from its `[handoff]` commit. `crew check <id>` reads no record and can say a lane's
  commits are not on origin after a clean merge-back: never act on it for a lane.
- **A plan change by another session** prints a `Notice:` there, and that session messages you. Re-read `ready
  <spec> --order` before the next launch; the writer already refuses a code phase with no lane.
- **The final PR merged** (by its babysitter or on GitHub): its record write marks every lane merged and ends
  spec-branch mode; the next empty tick ends the run `finished`.

