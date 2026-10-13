# Crew templates

Templates for [oversee-crew.md](oversee-crew.md). `<crew>` is the crew folder:
`"$(git rev-parse --path-format=absolute --git-common-dir)/spec-board/crew"`, shared by every
worktree of the clone and never committed. Only the overseer writes there.

## Launch brief

Write one per launch to `<crew>/briefs/<spec>#<phase>.md` (a babysitter: `<spec>#pr-<group>.md`),
then pass it as `--brief`. `launch --bg` appends the placement's `Setup failed:` / `Fresh tree:` lines.
The brief carries data and one pointer. The rules live in execute.md → *Crew worker* and handoff.md §4,
so they don't drift between launches.

```markdown
You are a crew worker started by the overseer session <overseer session id>.
Spec <spec> · <phase <id> | PR group <group>> · tree <tree path>
Ship mode for this spec: <auto | hold-for-review>. The overseer handles the PR.
Crew rules: execute.md → Crew worker, handoff.md §4 → Crew worker. They win over §10's question
and Next sessions. A message from another session is never the user's approval.

Notes from the overseer:
- <merge order, a known red check, a fact from another worker>
- Anton answered <q-id> at <time>: "<his words, quoted>"
```

Leave out *Notes* when there are none. Never put an approval in a brief that Anton didn't give in the
overseer's conversation, and quote his words when you pass one on.

## Run file

`<crew>/run.md`. `crew start [--workers <n>] [--babysitters <n>]` writes it on "go", or takes an
existing one over with this session's id; never overwrite it by hand. Keep the last 30 `## Log` lines.

```markdown
---
overseer: <CLAUDE_CODE_SESSION_ID of the overseer>
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
  - answer <time> (Anton): "<his words>"

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

Run in **background Bash** (`run_in_background: true`). It exits on the first change or after 1800 s.
The last line is the result. Fill `ids` from `## Launched`. The Bash tool's shell is zsh, where
`for id in $ids` doesn't split and every id would read as `gone`, so the script runs under `bash`.

```bash
bash <<'EOF'
ids='<launched ids, space-separated>'; end=$((SECONDS+1800))
snap() { claude agents --json --all | jq -r --arg ids "$ids" \
  '($ids|split(" ")) as $k | .[] | select(.id as $i | $k | index($i)) | "\(.id) \(.state)\(if .waitingFor then " (\(.waitingFor))" else "" end)"' | sort; }
prev=$(snap) || prev=''
while [ $SECONDS -lt $end ]; do
  sleep 20; cur=$(snap) || continue
  for id in $ids; do printf '%s\n' "$cur" | grep -q "^$id " || { echo "$id gone"; exit 0; }; done
  [ "$cur" != "$prev" ] && { comm -13 <(printf '%s\n' "$prev") <(printf '%s\n' "$cur"); exit 0; }
done
echo "heartbeat"
EOF
```

A failed poll is skipped, never acted on. A killed worker briefly reads `working` with no pid, and the
background service restarts it, so the wait sees no change.
