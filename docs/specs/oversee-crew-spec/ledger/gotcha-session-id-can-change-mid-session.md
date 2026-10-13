---
kind: gotcha
applies-to: [phase 1+]
created: 2026-10-12T20:45:04-07:00
---

# `CLAUDE_CODE_SESSION_ID` can change during one session

The phase 1 execute session claimed under `018ea42d-…`; an hour later the same conversation's
`$CLAUDE_CODE_SESSION_ID` was `811dfa8e-…` (its scratchpad path changed at the same moment, and
`claude agents` listed it as `background`). `claim list` still showed the claim `live`.

For the overseer: `run.md`'s `overseer:` id can go stale under a live overseer. Start's rule (refuse
only when the recorded id is live and not this session's) then lets a second overseer in. Phase 4's
tools should key overseer liveness on something sturdier (the pid in `~/.claude/sessions/`, or
re-writing `overseer:` on every wait).

**Trigger (found 2026-10-12): parking.** Sending a tab to the background forks the conversation
into a `--bg` job under a new session id (`--fork-session --resume`). The tab's process stays alive
and its `~/.claude/sessions/<pid>.json` stays, frozen at `status: busy`, with `parkedJobId: <job>`.
That frozen `busy` made `launch babysit` refuse this tree as "mid-task"; `sessions/live.ts` now
reads a parked file as idle (fixed in its own commit). The old id stays live for claims while the
tab's process runs.

It bites claims too: at handoff `claim release oversee-crew-spec` printed `nothing to release`,
because the claim carries the old id, and `claim list` kept it `live`. It frees once the session
closes (a closed session's claim is taken over). A fix belongs in `T/claims/` (release by pid or
workspace as well as session id); not done here.

**Following a park (phase 4, 2026-10-12).** A background job's session file has `jobId` = the first
8 characters of its `sessionId`; the parked tab's file keeps the old `sessionId` with
`parkedJobId: <jobId>`, and `claude agents` doesn't list the parked tab at all. So an id recorded
before a park is followed to the job: `crew overseer` takes its own run over when that job is this
session. Claims are matched by key (`<spec>#<phase>`), never by session id.

