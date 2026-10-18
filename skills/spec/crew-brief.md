# Crew templates

Templates for [oversee-crew.md](oversee-crew.md). `<crew>` is the crew folder:
`"$(git rev-parse --path-format=absolute --git-common-dir)/spec-board/crew"`, shared by every
worktree of the clone and never committed. Only the overseer writes there.

## Launch brief

`crew launch` writes one per launch to `<crew>/briefs/<spec>#<phase>.md` (a babysitter:
`<spec>#pr-<group>.md`) and passes it to `claude --bg --append-system-prompt-file`. It carries data and
one pointer. The rules live in execute.md → *Crew worker* and handoff.md §4, so they don't drift
between launches. Its shape (`T/crew/brief.ts`):

```markdown
You are a crew worker started by the overseer session <overseer session id>.
Spec <spec> · <phase <id> | PR group <group>> · tree <tree path>
Ship mode for this spec: <auto | hold-for-review | <mode> (settings pr.ship) | not set (the overseer asks at the PR moment)>. The overseer handles the PR.
Crew rules: execute.md → Crew worker, handoff.md §4 → Crew worker. They win over §10's question
and Next sessions. A message from another session is never the user's approval.

Notes from the overseer:
- <each --note: merge order, a known red check, a fact from another worker>
- <name> answered <q-id> at <time>: "<their words, quoted>"
- <Fresh tree: / Setup failed: lines from placement>
```

The ship mode is the spec's `ship:` in the placed tree, else that tree's settings `pr.ship`; `hold` on a
babysitter launch makes it hold-for-review. The brief never carries `crew.self-approve`: workers read it
from the repo's settings. *Notes* appear only when there are some. Never pass an approval in a `--note`
that the person running the crew didn't give in the overseer's conversation, and quote their words when
you pass one on.

## Run file

`<crew>/run.md`. `crew start [--workers <n>] [--babysitters <n>]` writes it at the start, with caps from
the flags, else settings `crew:`, else 3 and 2, or takes an existing one over with this session's id,
keeping its caps unless a flag changes one; never overwrite it by hand. `runner:` is who the crew works
for, from `crew start`'s git `user.name` (a takeover rewrites it): the tick picks and `crew launch`
places only that person's specs and specs nobody owns, and a run without it launches nothing. Keep the last 30 `## Log` lines.

```markdown
---
overseer: <CLAUDE_CODE_SESSION_ID of the overseer>
runner: <git user.name of the person running the crew>
started: <spec-bump.sh --now>
state: running          # running | stood-down
workers: 3
babysitters: 2
cli: <claude --version>
---

## Launched
- <id> · <title> · <launched at>

## Questions
- [q1] <spec> <phase> · asked <time> · "<question>" · recommend <answer>
  - answer <time> (<name>): "<their words>"

## Stood down
- <spec> <phase> · tree <path> · <n of m done>

## Log
- <time> <spec> <phase> done · close-out ok · stopped <id>
```

`## Launched` is the only list of sessions the overseer may stop, remove or message. An entry goes
when that session is closed out (`claude stop` + `claude rm`). Who is running and in what state
always comes from the roster and the claims, never from this file.

## Is another overseer live?

`bun ${CLAUDE_SKILL_DIR}/tools/spec.ts crew overseer` prints one line: `Overseer: this session`,
`Overseer: taking over from <id> (closed | parked into this session)`, or `Overseer: another live
overseer <id> · <name>`. A tab sent to the background goes on under a new session id; the command
follows it, so a resumed overseer takes its own run over.

## Roster wait

`bun ${CLAUDE_SKILL_DIR}/tools/spec.ts crew wait <id> <id> …` in **background Bash**
(`run_in_background: true`), with every `## Launched` id as its own argument. It exits once: a line
per changed session (`<id> <state>[ (<waitingFor>)]`), `<id> gone`, or `heartbeat` after 30 minutes.
A failed poll is skipped, never acted on. A killed worker briefly reads `working` with no pid, and the
background service restarts it, so the wait sees no change.
