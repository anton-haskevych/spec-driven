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

`<crew>/run.md`. Merge into an existing file; never overwrite it. Keep the last 30 `## Log` lines.

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

## Ship modes
- <spec>: <auto | hold-for-review> (Anton, <time>)

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

```bash
id='<overseer: id from run.md>'
for f in ~/.claude/sessions/*.json; do
  jq -e --arg id "$id" '.sessionId == $id' "$f" >/dev/null 2>&1 && kill -0 "$(basename "$f" .json)" 2>/dev/null && echo live
done; echo checked
```

`live` before `checked` means it's live, unless `id` is this session's own `$CLAUDE_CODE_SESSION_ID`.

## Roster wait

Run in **background Bash** (`run_in_background: true`). It exits on the first change or after 1800 s.
The last line is the result. Fill `ids` from `## Launched`.

```bash
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
```

A failed poll is skipped, never acted on. A killed worker briefly reads `working` with no pid, and the
background service restarts it, so the wait sees no change.
