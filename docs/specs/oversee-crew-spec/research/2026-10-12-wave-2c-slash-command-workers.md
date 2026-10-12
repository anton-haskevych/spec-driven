---
date: 2026-10-12
wave: 2c
lens: implementation
slug: slash-command-workers
brief: product-brief.md
---

# Recon Wave 2c — slash-command workers

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Live probe, Claude Code 2.1.296, throwaway detached worktree (removed after).

## Verified
- `claude --bg -n crew-slash-probe --model haiku --permission-mode bypassPermissions
  '/spec-driven:spec list'` runs the skill in the background: the transcript holds the
  skill load ("Base directory for this skill") and the board output.
- **Ending on a question reads as `blocked`.** The worker's last message asked the human
  ("Say "start 1" to launch it"); `claude agents --json --all` then showed
  `{status:"idle", state:"blocked"}` with no `waitingFor`. The earlier probe that ended
  "DONE" showed `state:"done"`, and a permission prompt showed `state:"blocked",
  waitingFor:"permission prompt"`.
- So the roster alone separates: `working` (busy), `done` (finished, nothing asked),
  `blocked` + `waitingFor` (a prompt to answer in the tab), `blocked` without `waitingFor`
  (ended its turn asking the human). Wave 1 had marked "handed off vs stuck vs asking" as
  not distinguishable from session files; `agents --json` makes it distinguishable.

## Consequence
A first overseer can run on today's tools plus `claude --bg` / `claude agents --json`:
launch, watch, tell finished from asking from stuck, stop and remove — no new tool code
needed for the first release.
