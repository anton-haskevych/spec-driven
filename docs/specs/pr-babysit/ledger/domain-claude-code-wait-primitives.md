---
kind: domain
applies-to: [phase 3, 4, 7, load-bearing]
created: 2026-10-10T13:30:36-07:00
---

# How Claude Code runs the `pr` commands: foreground vs background Bash, caps, wake-up

Only agents call `pr` commands, so each must fit a Claude Code primitive (code.claude.com/docs/en/
tools-reference, headless, scheduled-tasks; claude-code-guide brief 2026-10-10):

- **Foreground Bash:** default timeout 120 s (`BASH_DEFAULT_TIMEOUT_MS`), max 600 s. At timeout the
  command is *moved to the background*, not killed — unless it starts with `sleep` (then killed).
  Non-zero exit (outside a whitelist) cuts output to a ~10k head/tail excerpt.
- **Background Bash** (`run_in_background: true`): the session is re-invoked once when it exits (Bash
  tool definition). No time cap in a terminal session; **30 min default / 2 h max** in unattended ones
  (`-p`, SDK, CI, cloud). Never restored on `--resume`. Kill with `TaskStop`. Output via `Read` on the
  output file. Whether the notification carries the exit code: unverified — use the last stdout line.
- **Monitor:** one event per stdout line; 5 min default, 30 min max deadline, re-arm on expiry;
  unavailable with `DISABLE_TELEMETRY`. For a wait that only needs the final verdict, background Bash wins.
- **/loop, CronCreate, ScheduleWakeup:** each fire is a model turn; fire only while idle; no catch-up.
  Wrong tool for a CI wait.

Unverified, settled by phase 3's live probe: that an idle `claude -n` tab (nobody typing) is woken by
the background exit, and what the notification contains.
