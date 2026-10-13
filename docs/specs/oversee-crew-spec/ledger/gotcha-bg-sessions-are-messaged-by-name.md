---
kind: gotcha
applies-to: [phase 1+]
created: 2026-10-12T20:45:04-07:00
---

# A `--bg` session is messaged by its launch name, never its id

SendMessage can't address a `claude agents` id, short or full (`No agent named '<id>' is
reachable`). It reaches a background session by its `-n` name, which `launch --bg` sets to the
launch title (`<spec> execute <phase>`). Messages queue while it works and wake it when `done`.

- A relaunch reuses the name and the newest session wins, so message a title only while the id
  launched under it is still in the roster.
- `kill -9` doesn't make a session `gone`: the row reads `working` with `pid: null` for a few
  seconds, then the background service restarts it (same id) and it drains its queue.
- `claude stop` ends the session's background shells, with or without
  `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF`; `claude rm` keeps the transcript.

Evidence: `research/phase-1/2026-10-12-1.0-probes.md` (Claude Code 2.1.296).
