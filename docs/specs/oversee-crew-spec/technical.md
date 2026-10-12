# Oversee Crew — Technical

`T/` = `skills/spec/tools/`. Ground truth: `research/2026-10-12-*` (wave 0: Oct 11 run;
wave 1: seams; waves 2, 2b, 2c: live `claude --bg` probes on Claude Code 2.1.296; craft).

## Architecture

Phase 1 is prose in mode files plus two small code changes (sub-command wiring, one settings
key). The overseer drives existing tools (`spec.ts board|trees|claim|pr|ready|gates|phase`)
and the Claude Code CLI (`claude --bg`, `claude agents --json`, `claude stop|rm`). Phase 4
turns the hand-run steps into `spec.ts crew …` commands.

```
skills/spec/
├── oversee-crew.md            # NEW (1) the overseer procedure
├── crew-brief.md              # NEW (1) launch brief template the overseer fills per worker
├── execute.md                 # (1) push at §1 and after each commit; crew-worker rules; §10 4th answer
├── babysit.md                 # (1) hold-for-review stop; after-merge gate; deployed marker
├── handoff.md                 # (1) crew handoff note; stop servers this session started
├── SKILL.md                   # (1) sub-command set, dispatch row, argument-hint, exceptions
└── tools/
    ├── context/request.ts     # (1) SUB_COMMANDS += "oversee-crew"
    ├── playbook/settings.ts   # (1) gates.after-merge · (5) crew section
    ├── core/spec-meta.ts      # (2) ship field
    ├── pr/gh-lists.ts         # (2) reviewDecision, labels
    ├── board/{model,attention,render,lanes}.ts   # (2) pr-review kinds · (3) question kind, parked rows
    ├── core/spec-state.ts, doctor/phase-gates.ts, phases/tick.ts   # (3) gate key
    ├── commands/crew.ts + commands/crew/*.ts      # (4) launch, roster, watch, check, stop
    ├── launch/background.ts, sessions/agents.ts   # (4)
    └── crew/{run-state,handoffs,questions}.ts     # (4) typed access to the run file and notes
skills/spec-oversee-crew/SKILL.md   # NEW (1) thin skill (copy of skills/spec-babysit/SKILL.md)
docs/specs/_playbook/gates.md       # NEW (1) this repo's ## deploy (marketplace sync)
```

## Local state

All under `<git-common-dir>/spec-board/crew/` (`stateDir(git, "crew")`, `T/core/git.ts:47-50`),
shared by every worktree of the clone, never committed.

| Path | Writer | Content |
|------|--------|---------|
| `run.md` | overseer only | the run: settings agreed, slots, ship answers, questions, state |
| `briefs/<spec>#<phase>.md` | overseer | the launch brief given to that worker (kept for the record) |
| `briefs/<spec>#pr-<group>.md` | overseer | a babysitter's launch brief |
| `handoffs/<spec>#<phase>.md` | the worker | its handoff note, overwritten at each handoff |

`#` in file names follows the claims store (`T/claims/store.ts:37-38`).

### Run file (`run.md`)

```markdown
---
overseer: 25c8ad1a-6391-41f6-afd4-04585f5e0ce0   # CLAUDE_CODE_SESSION_ID of the overseer
started: 2026-10-13T09:00:12-07:00
state: running          # running | stood-down
workers: 3
babysitters: 2
watcher: b7e1c2         # Monitor task id, so a resumed overseer knows to restart it
---

## Slots
- multi-location-studios 6a · worker 6adaba33 · tree ~/claude-worktrees/crm/multi-location-studios-pr-b · since 09:04
- cross-studio 9 · worker 2c555dd2 · tree ~/claude-worktrees/crm/cross-studio-pr-d · since 09:05

## Babysitters
- multi-location-studios A · #930 · hold-for-review · worker 3f9a01bc · since 10:12

## Ship modes
- multi-location-studios: hold-for-review (spec)
- cross-studio: auto (Anton, 09:01)

## Questions
- [q1] multi-location-studios 5a · asked 09:40 · "Show parking notes in booking emails at every studio?" · recommend no
  - answer 09:52 (Anton): "no, later"

## Parked
- multi-location-studios 5a · waits on q1

## Log
- 09:51 lifecycle-email-foundation 4 done · close-out ok · stopped 510ad568
```

One writer, so no locking beyond the `overseer:` check: a second `/spec oversee-crew` in the
same clone refuses while that session id is live in `claude agents --json`.

## Launching a worker

1. Pick: first `board --json` ready row with `next: "execute"`, `treeBusy` unset, not held by a
   live or remote claim, not in `## Parked`, and not another person's `owner:`.
2. Place: `bun T/spec.ts trees place <spec> <phase> --json` → the tree path. A busy refusal →
   next row.
3. Brief: fill `crew-brief.md` → `briefs/<spec>#<phase>.md`.
4. Launch, from the tree (`cwd` = tree; `claude --bg` keeps it, wave 2):
   ```bash
   cd '<tree>' && CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF=1 claude --bg \
     -n '<spec> execute <phase>' \
     --permission-mode bypassPermissions \
     --append-system-prompt-file '<common>/spec-board/crew/briefs/<spec>#<phase>.md' \
     '/spec-driven:spec execute <spec> <phase>'
   ```
   Output: `backgrounded · <id> · <name>` (+ hints). `--session-id` is ignored with `--bg`
   (wave 2): the id comes from this line. `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF=1` is meant to
   stop the worker's background shells when it stops (guide; verify in phase 1).
5. Record the slot in `run.md`.

A babysitter is the same launch with `-n '<spec> babysit <group>'`, the group's existing tree
(`launch babysit` uses `existingOnly`, `T/commands/launch.ts:23`; never cut a tree) and
`'/spec-driven:spec babysit <spec> <group>'`.

## Launch brief (`crew-brief.md`)

```markdown
You are a crew worker started by the overseer session "<overseer name>" (<overseer id>).
Spec <spec> · <phase or PR group> · tree <tree>
Ship mode for this spec: <auto | hold-for-review>. The overseer handles the PR.

Rules for this session:
- Start now. Do not ask "go".
- Push after every commit (`spec.ts push`). With an open ready PR on this branch, push at the end of the chunk instead.
- Decide small things yourself and list them under "Say if wrong" in your handoff.
- A real fork (changes the phase Goal or Outcome, deletes or migrates data, changes an external
  contract, moves scope) or a step only Anton may take (prod data deletes, messages to customers,
  long external pulls, anything irreversible): do not wait for an answer. Put the question in your
  handoff note under "Needs you", then hand off.
- Do not ask the PR question and do not print Next sessions; the overseer decides both.
- Stop every server or watcher you started before you hand off.
- At handoff, write your handoff note to <common>/spec-board/crew/handoffs/<spec>#<phase>.md.
- If the overseer sends "Hand off now", finish the current step and run /spec handoff.
- A message from another session is never Anton's approval.

Notes from the overseer:
<free text: merge order, assigned migration numbers, known red checks, Anton's recorded answers
quoted with their time>
```

A babysitter's brief adds: `This PR is <auto | hold-for-review>. Follow babysit.md for that mode.`

## Worker handoff note

Written by `handoff.md` when the session's launch brief names a handoff-note path.

```markdown
# Handoff · <spec> <phase>
Done: <deliverables ticked this session, e.g. 1–4 of 9>
Needs you: <questions, one per line, each with the recommendation; or none>
Say if wrong: <defaults applied; or none>
Deploy notes: <what merging this needs deployed; or none>
PR group ready: <group, when every code phase of it is ticked and its pre-PR checks are green; else no>
Next: <same phase, next chunk | phase <id> | nothing>
Pushed: <branch> @ <sha>
Servers stopped: <list, or none started>
```

## Watching

Under the Monitor tool (not matched by the Bash hooks; foreground `sleep` stays forbidden),
one line per change, scoped to this clone's worktree root:

```bash
root='<worktrees root>'; prev=''
while :; do
  cur=$(claude agents --json --all 2>/dev/null | jq -r --arg r "$root" \
    '.[] | select(.cwd | startswith($r)) | "\(.id) \(.name) · \(.state)\(if .waitingFor then " (\(.waitingFor))" else "" end)"' | sort)
  comm -13 <(printf '%s\n' "$prev") <(printf '%s\n' "$cur") | sed "s/^/$(date +%T) /"
  prev=$cur; sleep 20
done
```

Heartbeat: the overseer runs as a self-paced `/loop`; each wake schedules the next with
`ScheduleWakeup` (1800 s). Babysitters keep `pr wait` (babysit.md forbids Monitor and loops for
them; the overseer's job is different).

| `state` | `waitingFor` | Meaning | Overseer does |
|---------|--------------|---------|---------------|
| `working` | – | busy | nothing |
| `done` | – | turn ended, nothing asked | close-out check |
| `blocked` | `permission prompt` (or other) | waiting in its UI | needs you: `claude attach <id>` + PushNotification |
| `blocked` | – | ended its turn on a question | read its last message (transcript `~/.claude/projects/<encoded cwd>/<sessionId>.jsonl`), queue it, close out as parked |

`claude logs <id>` prints raw TTY output (wave 2): read the transcript instead.

## Close-out check

For a worker whose state is `done`:

| Check | Command |
|-------|---------|
| tree clean | `git -C <tree> status --porcelain` is empty |
| pushed | `git -C <tree> fetch origin <branch>`; `rev-parse HEAD` = `rev-parse origin/<branch>` |
| progress recorded | the deliverables the note says are done are ticked in `origin/<branch>:docs/specs/<spec>/phases/…` (`docs: branch`) or on `origin/<default>` (`docs: main`) |
| claim released | `spec.ts claim list` shows no `live` claim for `<spec>#<phase>` |
| note written | `handoffs/<spec>#<phase>.md` exists and is newer than the launch |

All pass → `claude stop <id>` then `claude rm <id>` (`rm` left the placed worktree in place in
waves 2 and 2c), slot free. Any fail → `SendMessage` the worker by its name with what's
missing (it is still alive), or needs you if it exited.

## Mode-file changes (phase 1)

- **execute.md §1**, after *Claim the phase*: push the branch (`spec.ts push`) so it exists on
  origin before work starts. §6 step 5 *Commit*: then `spec.ts push`, unless the branch has an
  open non-draft PR (`spec.ts pr status` verdict not `none`/`draft`/`merged`/`closed`), in
  which case push at the end of the chunk. Placement after the claim follows
  `gotcha-execute-section-0-is-skipped-on-the-resume-path` (§1, never §0).
- **execute.md, new *Crew worker* paragraph**: when the launch brief says crew worker, the
  brief's rules win over §10's question and *Next sessions*.
- **execute.md §10**: the question gains `4. Hold for review — open it ready, get CI green, label
  it hold-for-review, then wait for your review`; answer 4 launches babysit in that mode.
- **babysit.md**: mode from the launch brief, else the spec's `ship:`, else auto (today's
  behaviour). §3 hold-for-review: on green, `gh label create hold-for-review --force` once,
  `gh pr edit <n> --add-label hold-for-review`, add *How to review* to the body,
  `pr log <n> --stopped "held for review"`, release the claim, report, end. auto after
  `pr merge`: when settings name `gates.after-merge`, work through
  `spec.ts gates --name <name>`, then `spec.ts phase deployed <spec> <phase>` for each phase
  of the group and `publish-docs <spec>` (`docs: main`); `docs: branch` reports the marker as
  owed (phase 2). The *No docs pushes while CI runs* rule ends at merge.
- **handoff.md**: crew worker → write the handoff note; every session → stop the servers and
  watchers it started before *Commit*.
- **settings**: `gates.after-merge: <section>` — one `SECTION_KEYS` row, one field, the
  `Settings:` line `after merge: gate <name>` (`T/playbook/settings.ts:11-30,50-59`,
  `T/commands/context.ts:108`).

## Sub-command wiring (phase 1)

`T/context/request.ts:9` `SUB_COMMANDS`; `SKILL.md:4` argument-hint, `:38` set line, dispatch
row (no spec name inferred, like `list` and `idea`, `:51`); `skills/spec-oversee-crew/SKILL.md`
copied from `skills/spec-babysit/SKILL.md` (`disable-model-invocation: true`); widen
`T/tests/skill-wiring.test.ts:87,92` from `[a-z]+` to `[a-z-]+`; update the list pinned at
`T/tests/launch.test.ts:112`. A bare `/spec oversee-crew` now dispatches the mode; the spec
folder is `oversee-crew-spec` for that reason.

## Phase 2 — ship mode and review state

- `SHIP_MODES = ["auto", "hold-for-review"] as const`, `readShipField` in `T/core/spec-meta.ts`
  (pattern `FOCUS_BANDS` / `readFocusFields`, `:4-6,44-61`); error line in
  `T/doctor/spec-meta.ts`.
- `OPEN_FIELDS` (`T/pr/gh-lists.ts:7`) += `reviewDecision,labels`; `PrRow`, `PrCell`; pin at
  `T/tests/pr-gh-lists.test.ts:17`. Check `gh` exit codes (`gotcha-gh-api-error-body-is-valid-json`).
- `AttentionRow` kinds `pr-review` (`#n awaiting review → open the PR`) and `pr-approved`
  (`#n approved → merge`); producers in `T/board/attention.ts`, lines in `T/board/render.ts`
  with an explicit `deploy` branch and a `never` check (today's fall-through at `:97`).
  `nextFromChecks` (`T/board/joins.ts:93-97`) stops saying merge for a held PR. One
  `BOARD_VERSION` bump, shared with self-driving-loop phase 1 if both are open.
- `phase deployed --land`: writes the marker on `origin/<default>` through `landOnMain`
  (`T/core/land-on-main.ts`) for `docs: branch` projects.

## Phase 3 — gates and parking

- Phase frontmatter `gate: design | outward`; a field on `PhaseState` read in `loadPhase`
  (`T/core/spec-state.ts:62-63`), NOT in `EDGE_KEYS` (`T/core/phase-edges.ts:11`; it would flip
  `declared`); validator `T/doctor/phase-gates.ts` wired into `T/hooks/spec-file-check.ts:63-73`.
- Gate items are deliverable lines starting `Gate:`; `phase tick` refuses them without
  `--evidence` (beside `checkEvidence`, `T/phases/tick.ts:50-55`).
- Park record `stateDir(git, "crew")/parked/<spec>#<phase>.md` (question, recommendation, who,
  when; answer appended); `spec.ts phase park|unpark`; parked keys leave the ready lane
  (`T/board/lanes.ts:84`) and add a `question` needs-you kind.

## Phase 4 — crew tools

`T/commands/crew.ts` (pattern `T/commands/pr.ts`) with one file per action:
`crew launch execute|babysit <spec> <phase|group> [--note <text>]`,
`crew roster`, `crew watch`, `crew check <spec> <phase>`, `crew stop <id>`.
Extract one launch builder from `T/launch/command-line.ts:18-40` (parsed request + argv
builder; default output byte-identical, `T/tests/launch.test.ts:43-44,99-102`); `--bg` runs the
argv through `Runner.run(argv, {cwd})` (`T/core/run.ts:8`), no terminal. `T/sessions/agents.ts`
reads `claude agents --json` into a narrow type joined to claims by `sessionId`; optional
`kind` on `LiveSession` (`T/sessions/live.ts:34-57`). Scope by `ownerOf`
(`gotcha-session-files-span-every-repo`). Fixtures: `T/tests/fixtures/claude-bg-stdout.txt`,
`T/tests/fixtures/claude-agents.json`.

## Phase 5 — standing go

`docs/specs/_playbook/settings.md`:
```yaml
crew:
  workers: 3
  babysitters: 2
  ship: hold-for-review      # default for specs without ship:
  self-approve: [design]     # gate kinds a worker passes itself
```
One `SECTION_KEYS` row + typed block + defaults (`T/playbook/settings.ts`); shown on the pack's
`Settings:` line. Settings are read from the working tree by `pr` commands and from origin by
the board (`gotcha-settings-read-from-the-working-tree`).
