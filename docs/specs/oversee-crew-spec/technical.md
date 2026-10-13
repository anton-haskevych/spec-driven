# Oversee Crew — Technical

`T/` = `skills/spec/tools/`. Ground truth: `research/2026-10-12-*` (wave 0: Oct 11 run;
wave 1: seams; waves 2, 2b, 2c: live `claude --bg` probes on Claude Code 2.1.296; craft).
Review `reviews/2026-10-12-state-homes-and-worker-lifecycle.md` reshaped this file: one home per
piece of state, a background roster wait, babysitter rows, deploy babysitting for infra only.

## Architecture

Phase 1 is mostly prose in mode files, plus four small tool changes: sub-command wiring,
`launch … --bg --brief` (with `hold` for babysit), `phase deployed --land`, and `pr hold`. Plus
the `deploy:` settings key. The overseer drives existing tools (`spec.ts board|trees|claim|pr|ready|phase|launch`)
and the Claude Code CLI (`claude agents --json`, `claude stop|rm`). Phase 4 turns the remaining
hand-run steps into `spec.ts crew …` commands, re-planned after the first real run.

```
skills/spec/
├── oversee-crew.md            # NEW (1) the overseer procedure (target < 200 lines)
├── crew-brief.md              # NEW (1) launch brief template + run-file skeleton + roster-wait script
├── execute.md                 # (1) push decision at §1; crew-worker paragraph; §10 4th answer
├── babysit.md                 # (1) hold-for-review via `pr hold`; infra deploy gate; babysitter lifecycle
├── handoff.md                 # (1) §4 crew branch first; crew lines in Signal completion; crew workers stop their servers
├── update.md                  # (1) :49 deployed rule names the infra-gate exception
├── SKILL.md                   # (1) sub-command set, dispatch row, argument-hint, exceptions; Session lifecycle names the overseer
└── tools/
    ├── context/request.ts     # (1) SUB_COMMANDS += "oversee-crew"
    ├── launch/command-line.ts, launch/terminal.ts, commands/launch.ts   # (1) --bg, --brief, babysit `hold`; refuse launch oversee-crew
    ├── launch/background.ts   # NEW (1) run argv with cwd, parse `backgrounded · <id> · <name>`
    ├── phases/deployed.ts, commands/phase.ts       # (1) phase deployed --land via landOnMain
    ├── pr/actions/hold.ts, commands/pr.ts          # NEW (1) pr hold: label + How to review through GhWrites
    ├── playbook/settings.ts, doctor/settings.ts    # (1) deploy: { paths, gate } · (5) crew section, pr.ship
    ├── core/spec-meta.ts      # (2) ship field · commands/ship.ts (2) writer via landOnMain
    ├── pr/gh-lists.ts         # (2) reviewDecision, labels
    ├── board/{model,attention,render,joins,lanes}.ts   # (2) pr-review kinds · (3) parked rows
    ├── core/spec-state.ts, doctor/phase-gates.ts, phases/tick.ts   # (3) gate key
    └── commands/crew.ts + crew/*  # (4) re-planned after the first crew run
skills/spec-oversee-crew/SKILL.md   # NEW (1) thin skill (copy of skills/spec-babysit/SKILL.md)
```

## One home per piece of state

| What | Home | Why not elsewhere |
|------|------|-------------------|
| Who is running, on what | `claude agents --json` (state, waitingFor) joined to claims by `sessionId` and to launch titles (`parseLaunchTitle`) | A hand-kept slot list drifts (crash, manual `claude stop`, compaction between launch and write) |
| Which sessions the overseer launched | `run.md` `## Launched` (id, title, time), removed at close-out (`stop` + `rm`) | The roster also lists Anton's own sessions; `claim list` shows no session id, and a worker that crashed before claiming has no claim. Identity only: state still comes from the roster and claims (phase 1 execute, 2026-10-12) |
| Questions for Anton | the worker's `in-flight.md` *Needs you* (committed, pushed, on every machine) | A local note under `.git/` is blocked by worktree file guards and invisible to other machines |
| When a question was asked / answered | `run.md` `## Questions` (bookkeeping only, with the answer text quoted) | in-flight.md is the worker's file; the overseer never commits in a worker's tree |
| Ship mode | spec `ship:`, written by `spec.ts ship` (phase 2; phase 1 kept it in `run.md`) | — |
| Crew caps, overseer id, state | `run.md` frontmatter | — |
| Phase progress, PR group readiness | spec docs (`spec.ts ready`, `pr-opening.md`) | — |

### Local state

`<git-common-dir>/spec-board/crew/` (`stateDir(git, "crew")`, `T/core/git.ts:47-50`), shared by every
worktree of the clone, never committed, written only by the overseer (which runs in the main
checkout, so worktree file guards don't apply).

| Path | Content |
|------|---------|
| `run.md` | the run (below) |
| `briefs/<spec>#<phase>.md`, `briefs/<spec>#pr-<group>.md` | the brief given at launch (kept for the record); `launch --bg --brief` reads it |

### Run file (`run.md`)

```markdown
---
overseer: 25c8ad1a-6391-41f6-afd4-04585f5e0ce0   # CLAUDE_CODE_SESSION_ID of the overseer
started: 2026-10-13T09:00:12-07:00
state: running          # running | stood-down
workers: 3
babysitters: 2
---

## Launched
- 6adaba33 · multi-location-studios execute 6a · 2026-10-13T09:04

## Questions
- [q1] multi-location-studios 5a · asked 2026-10-13T09:40 · "Show parking notes in booking emails at every studio?" · recommend no
  - answer 2026-10-13T09:52 (Anton): "no, later"

## Stood down
- multi-location-studios 6a · tree ~/claude-worktrees/crm/multi-location-studios-pr-b · 4 of 9 done

## Log
- 2026-10-13T09:51 lifecycle-email-foundation 4 done · close-out ok · stopped 510ad568
```

Keep the last 30 log lines. `/spec oversee-crew` with an existing `run.md` resumes (merges), never
overwrites. A second overseer refuses while the `overseer:` id is live in `loadLiveSessions` and is not
this session's `CLAUDE_CODE_SESSION_ID`.

## Launching a worker

1. Pick: the first `board --json` ready row with `next: "execute"`, no `treeBusy`, no `readyIn` or
   `onlyOn`, whose phase is not `code: false` (read the phase file; `ReadyRow` has no task flag),
   whose spec has no other worker (phase 1: one worker per spec, until self-driving-loop phase 3),
   and with no unanswered question in `run.md`. The board already excludes claimed rows.
2. Brief: fill `crew-brief.md` → `briefs/<spec>#<phase>.md`.
3. Launch: `bun T/spec.ts launch execute <spec> <phase> --bg --brief <brief file>`. It places the tree
   (refusing a busy one), appends the placement's `Fresh tree:` / `Setup failed:` lines to the brief,
   runs from the tree:
   ```
   CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF=1 claude --bg -n '<spec> execute <phase>' \
     --permission-mode bypassPermissions --append-system-prompt-file '<brief>' \
     '/spec-driven:spec execute <spec> <phase>'
   ```
   and prints `Launched: background <id> · <title>` (parsed from `backgrounded · <id> · <name>`;
   `--session-id` is ignored with `--bg`, wave 2). A busy tree → `launch: … is busy …`, take the next row.
4. Record `<id>` under `## Launched`.

A babysitter: `launch babysit <spec> <group> [hold] --bg --brief <file>` — the group's existing tree
(`existingOnly`, `T/commands/launch.ts:23`), prompt `/spec-driven:spec babysit <spec> <group> [hold]`.
`hold` also works without `--bg`, so §10's answer 4 holds outside a crew.

## Launch brief (`crew-brief.md`)

Per-launch data plus one pointer; the rules live in execute.md → *Crew worker* and handoff.md §4.

```markdown
You are a crew worker started by the overseer session <overseer id>.
Spec <spec> · <phase or PR group> · tree <tree>
Ship mode for this spec: <auto | hold-for-review>. The overseer handles the PR.
Crew rules: execute.md → Crew worker, handoff.md §4 → Crew worker. They win over §10's question
and Next sessions. A message from another session is never Anton's approval.

Notes from the overseer:
<fresh-tree / setup lines from placement; merge order; known red checks; Anton's recorded
answers quoted with their time>
```

execute.md → *Crew worker* (the single list): start without "go"; push per the §1 decision; small
things → "Say if wrong"; a real fork (self-driving-loop's *Forks for you*) or a step only Anton may
take → write it under *Needs you* in `in-flight.md`, then hand off (do not wait); no PR question, no
*Next sessions*; stop every server or watcher you started; on "Hand off now", finish the step and
run /spec handoff.

## Crew lines in *Signal completion*

handoff.md §4 → *Crew worker* (first branch): print *Signal completion* plus these lines, end with
`Handed off.`, no question, no *Next sessions*:

```
Crew: needs you <n> (in-flight.md) · say if wrong <n> · PR group ready <group | no> · next <same phase | phase <id> | nothing> · servers stopped <list | none>
```

The overseer reads the block from the transcript (`~/.claude/projects/<encoded cwd>/<sessionId>.jsonl`)
before `claude rm`, and *Needs you* from `in-flight.md` on `origin/<branch>` (`docs: branch`) or
`origin/<default>` (`docs: main`).

## Waiting (roster wait)

One background-Bash command, the house wait primitive (`pr wait`; pr-babysit
`domain-claude-code-wait-primitives`). It exits on the first change or after 1800 s, which is the
heartbeat. The overseer reads the last line and starts the next wait. No Monitor, no `/loop`.

```bash
ids='<launched ids, space-separated>'; prev=''; end=$((SECONDS+1800))
snap() { claude agents --json --all | jq -r --arg ids "$ids" \
  '($ids|split(" ")) as $k | .[] | select(.id as $i | $k | index($i)) | "\(.id) \(.state)\(if .waitingFor then " (\(.waitingFor))" else "" end)"' | sort; }
prev=$(snap) || prev=''
while [ $SECONDS -lt $end ]; do
  sleep 20; cur=$(snap) || continue                      # a failed poll is skipped, never replayed
  for id in $ids; do printf '%s\n' "$cur" | grep -q "^$id " || { echo "$id gone"; exit 0; }; done
  [ "$cur" != "$prev" ] && { comm -13 <(printf '%s\n' "$prev") <(printf '%s\n' "$cur"); exit 0; }
done
echo "heartbeat"
```

Scope is the ids the overseer launched (`## Launched`), never a
path prefix. The overseer never stops, removes or messages an id it did not launch.

| Session | `state` | `waitingFor` | Meaning | Overseer does |
|---------|---------|--------------|---------|---------------|
| worker | `working` | – | busy | nothing |
| worker | `done` | – | turn ended | close-out check |
| any | `blocked` | `permission prompt` (or other) | waiting in its UI | needs you: `claude attach <id>` + PushNotification |
| worker | `blocked` | – | ended its turn on text | send "Hand off now" (by launch name); then close-out; parked only if `in-flight.md` has *Needs you* |
| babysitter | `working` while on `pr wait` (a background shell keeps it busy); any state while its `pr-<group>` claim is live | – | waiting on CI or working | nothing; never stop it |
| babysitter | `done`, claim released | – | finished | read `pr log <n>` last line, report, `stop` + `rm` |
| any | `working` with `pid: null` | – | killed; the background service restarts it within ~15 s | nothing (the roster wait sees no change) |
| any | `stopped`, or gone (`claude rm` outside) | – | stopped or removed outside the overseer | close-out; dirty tree or live claim → needs you, never a silent relaunch |

All rows probed on Claude Code 2.1.296 (waves 2b, 2c; `research/phase-1/2026-10-12-1.0-probes.md`).

**Messages go by launch name.** `SendMessage` can't address a `claude agents` id (short or full);
it reaches a `--bg` session by its `-n` name (`<spec> execute <phase>`), queued while it works and
delivered at its next tool round, and it wakes a `done` session. A relaunch reuses the name and the
newest session wins, so the overseer messages a name only while the id it launched under that name
is in the roster. The id stays the key for the roster, `claude stop|rm|attach` and `run.md`.

## Close-out check

For a worker that is `done` (or `stopped` / gone):

| Check | Command |
|-------|---------|
| tree clean | `git -C <tree> status --porcelain` is empty |
| pushed | `git -C <tree> fetch origin <branch>`; `rev-parse HEAD` = `rev-parse origin/<branch>` |
| handed off | a `[handoff]` commit on `origin/<branch>` newer than the launch, and the transcript's last turn has the `Crew:` line |
| claim released | `spec.ts claim list` shows no `live` claim for `<spec>#<phase>` |

All pass → read the `Crew:` line and `in-flight.md` *Needs you*, then `claude stop <id>` + `claude rm <id>`
(`rm` keeps the transcript and leaves the placed worktree, phase-1 probes), slot free. Any fail on a
live session → SendMessage by launch name with what's missing (once); still failing, or the session is gone → needs you.

## Pause

"Time to pause" → "Hand off now" by launch name to each `working` or `done` worker; workers `blocked` on a prompt
go to needs you; babysitters are left to finish. Close out each as it lands, then `state: stood-down`
with `## Stood down` listing each phase and its tree. Resume relaunches the stood-down rows first (they
are in flight, not ready, on the board), then fills from the board.

## Overseer rotation

The overseer never works on from a compaction summary. On compaction: `run.md` is already current;
print `Overseer rotated: type /spec oversee-crew in a fresh session`, stop. Workers keep running.

## PR moment and deploy

1. A worker's `Crew:` line says `PR group ready <group>` (cross-check `spec.ts ready`).
2. `spec.ts pr status <spec> <group>`: merged or closed → nothing to launch (#901).
3. Ship mode: spec `ship:` → ask Anton once; his answer goes through `spec.ts ship` (phase 2).
4. Launch the babysitter (above); `hold` for hold-for-review.

**babysit.md changes.** Mode from the prompt's `hold` word, else the spec's `ship:` (phase 2), else
auto. hold-for-review on green: `pr hold <n> --how-to-review <file>` (adds the `hold-for-review`
label, creating it if missing, and appends *How to review* to the body, through `GhWrites`),
`pr log <n> --stopped "held for review"`, release the claim, report, end. auto: today's merge, then:

- **Deploy only for infra.** Settings `deploy: { paths: [globs], gate: <gates.md section> }`. When the
  PR's changed files (`gh pr view --json files`) match `deploy.paths`, work through
  `spec.ts gates --name <gate>`; the section's last check must be a checkable "deployed" line. It
  passes → `spec.ts phase deployed <spec> <phase> --land` for each phase of the group. It fails or
  can't be checked → report `deploy owed` (the board's `deploy` needs-you kind). No `deploy:` setting
  or no match → merged, reported, done; never a deploy, never a marker (update.md:49 stands).
- One infra deploy gate at a time per clone: the overseer launches a second auto babysitter whose PR
  matches `deploy.paths` only after the first reports.

`phase deployed --land` writes the marker onto `origin/<default>` through `landOnMain`
(`T/core/land-on-main.ts`), like `pr merge`'s merge line (`T/pr/actions/merge.ts:77`) and `focus`.
It never commits in the merged tree (that breaks `trees prune`, `T/trees/prune-rules.ts:21-28`) and
never runs `publish-docs` (which re-pushes the merged branch, `T/commands/publish-docs.ts:17`).

## Mode-file changes (phase 1)

- **execute.md §1**, after *Claim the phase*: decide the push mode once —
  `gh pr view <branch> --json state,isDraft` open and not draft → push at the end of the chunk;
  no PR, draft, or lookup failed → `spec.ts push` now and after every commit in §6 step 5; merged or
  closed → stop and report. A failed push never stops the session; never `--no-verify`. Placement
  follows `gotcha-execute-section-0-is-skipped-on-the-resume-path` (§1, never §0).
- **execute.md, *Crew worker***: the single list of crew rules (above).
- **execute.md §10**: `4. Hold for review — open it ready, get CI green, label it hold-for-review,
  then wait for your review` → `launch babysit <spec> <group> hold`.
- **handoff.md §4**: *Crew worker* branch first. Server teardown is crew-only.
- **update.md:49**: "Never infer a deploy from a merge" gains "except babysit's infra deploy gate,
  whose last check proves it (babysit.md)".
- **SKILL.md *Session lifecycle***: the overseer is a long-lived controller that rotates on compaction.
- **settings**: `deploy: { paths, gate }` — `SECTION_KEYS` row, typed field, `Settings:` line
  `deploy: gate <name> for <n> paths` (`T/playbook/settings.ts:26-59`), doctor gate-name check
  (`T/doctor/settings.ts:20-22`). `T/commands/context.ts` needs no change (`describeSettings`).

## Sub-command wiring (phase 1)

`T/context/request.ts:9` `SUB_COMMANDS`; `SKILL.md:4` argument-hint, `:38` set line, dispatch row (no
spec name inferred, like `list` and `idea`, `:51`); `skills/spec-oversee-crew/SKILL.md` copied from
`skills/spec-babysit/SKILL.md` (`disable-model-invocation: true`); widen
`T/tests/skill-wiring.test.ts:87,92` from `[a-z]+` to `[a-z-]+`; update the list pinned at
`T/tests/launch.test.ts:112`; `launchTarget` refuses `oversee-crew` (it takes no spec). The spec folder
is `oversee-crew-spec` so a bare `/spec oversee-crew` dispatches the mode.

## Phase 2 — ship mode and review state

- `SHIP_MODES = ["auto", "hold-for-review"] as const`, `readShipField` in `T/core/spec-meta.ts`
  (pattern `FOCUS_BANDS` / `readFocusFields`, `:4-6,44-61`); error line in `T/doctor/spec-meta.ts`.
- `spec.ts ship <spec> <mode>`: writes `ship:` on `origin/<default>` through `landOnMain`, like
  `T/focus/land.ts:16`; only on Anton's word. The overseer's ship answers go through it.
- `OPEN_FIELDS` (`T/pr/gh-lists.ts:7`) += `reviewDecision,labels`; `PrRow`, `PrCell`; pin at
  `T/tests/pr-gh-lists.test.ts:17`. Check `gh` exit codes (`gotcha-gh-api-error-body-is-valid-json`).
- `AttentionRow` kinds `pr-review` (`#n awaiting review → open the PR`), `pr-approved`
  (`#n approved → merge`) and `pr-changes` (`#n changes requested → relaunch`); producers in
  `T/board/attention.ts`, lines in `T/board/render.ts` with an explicit `deploy` branch and a `never`
  check (today's fall-through at `:97`). `nextFromChecks` (`T/board/joins.ts:93-97`) stops saying
  merge for a held PR. One `BOARD_VERSION` bump, shared with self-driving-loop phase 1 if both are open.

## Phase 3 — gates and parking

- Phase frontmatter `gate: design | outward`; a field on `PhaseState` read in `loadPhase`
  (`T/core/spec-state.ts:62-63`), NOT in `EDGE_KEYS` (`T/core/phase-edges.ts:11`); validator
  `T/doctor/phase-gates.ts` wired into `T/hooks/spec-file-check.ts:63-73`.
- Gate items are deliverable lines starting `Gate:`; `phase tick` refuses them without `--evidence`
  (beside `checkEvidence`, `T/phases/tick.ts:50-55`).
- Parking lives in the committed channel phase 1 already uses: a *Needs you* entry in the phase's
  in-flight file (self-driving-loop's `in-flight/phase-<id>.md` once it lands). `spec.ts phase park|unpark`
  write and answer it; the board's worktree overlay reads it, drops the phase from ready and adds a
  `question` needs-you kind. Parking at a fork applies only with a crew launch brief; an interactive
  session still asks.

## Phase 4 — crew tools (re-plan after the first crew run)

Direction, not contract: one idempotent `spec.ts crew tick` that applies the fixed transitions
(done → close-out → stop + rm → pick → launch) and prints only what needs judgement or Anton, plus
`crew wait` (the roster wait as a command). `T/sessions/agents.ts` reads `claude agents --json` into
a narrow type joined to claims by `sessionId`, scoped by `ownerOf` (`gotcha-session-files-span-every-repo`),
and owns the transcript read. Fixtures: `T/tests/fixtures/claude-agents.json`.

## Phase 5 — standing go

`docs/specs/_playbook/settings.md`:
```yaml
pr:
  ship: hold-for-review      # default for specs without ship:, read by every PR moment
crew:
  workers: 3
  babysitters: 2
  self-approve: [design]     # gate kinds a worker passes itself
```
`SECTION_KEYS` rows + typed blocks + defaults (`T/playbook/settings.ts`); shown on the pack's
`Settings:` line. Settings are read from the working tree by `pr` commands and from origin by the
board (`gotcha-settings-read-from-the-working-tree`).
