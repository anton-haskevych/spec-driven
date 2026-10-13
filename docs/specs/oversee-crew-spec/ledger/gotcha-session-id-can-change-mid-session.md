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
re-writing `overseer:` on every wait). Seen once; the trigger is unknown.

It bites claims too: at handoff `claim release oversee-crew-spec` printed `nothing to release`,
because the claim carries the old id, and `claim list` kept it `live`. It frees once the session
closes (a closed session's claim is taken over). A fix belongs in `T/claims/` (release by pid or
workspace as well as session id); not done here.
