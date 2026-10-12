---
date: 2026-10-12
wave: 2b
lens: implementation
slug: blocked-workers-and-attach
brief: product-brief.md
---

# Recon Wave 2b — blocked workers and attach

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Live probes from the prep session, Claude Code 2.1.296, throwaway detached worktree
`~/claude-worktrees/spec-driven/crew-bg-probe` (removed after).

## Verified
- Anton's `~/.claude/settings.json` has `permissions.defaultMode: "bypassPermissions"`.
  Anton (2026-10-12): workers must run with bypass permissions, enforced — "I trust my
  workers." Prompts can still come from hooks that ask (e.g. the rm safety check, Oct 11
  CS-8) or from an explicit lower mode.
- **Blocked worker is visible.** `claude --bg --permission-mode default` worker asked to
  Write outside its folder. `claude agents --json --all` went
  `{status:"busy", state:"working", waitingFor:null}` →
  `{status:"waiting", state:"blocked", waitingFor:"permission prompt"}` within ~5 s and
  stayed there 90 s: **no auto-decline**, the file was not written.
- **Attach from iTerm works.** A tab created the `launch` way (create tab, write text into
  the new session by object, `select previousTab`, return its `unique ID`) running
  `claude attach <id>` showed the worker's full screen with the waiting prompt
  ("Do you want to create crew-perm-probe.txt? ❯ 1. Yes …").
- **Answering in the attached tab works.** Sending `1` to that session approved the
  Write; the file appeared; state went `{status:"idle", state:"done"}`.
- **Closing the attached tab leaves the worker running.** After `close` of the tab the
  worker kept the same pid and state — attach is only a viewer/controller.
- Reading the attached tab's screen by session `unique ID`
  (`contents of current session of t`) works, for an overseer that needs to see what a
  blocked worker is asking.

## Consequences for the design
- The overseer's roster poll (`claude agents --json`) distinguishes working / done /
  blocked-on-a-prompt without reading transcripts; `waitingFor` names the reason.
- A blocked worker becomes a needs-you item with an "open it" action = a tab running
  `claude attach <id>`; Anton answers there and closes the tab.
- Workers launch with `--permission-mode bypassPermissions` always.
