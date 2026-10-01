---
needs: []
pr: A
---

# Phase 2 — Launch command

**Goal:** `spec.ts launch <sub-command> <spec-name>` opens a fresh Claude Code session in a new iTerm tab (tmux window, Terminal.app window) running `/spec-driven:spec <sub> <name>`, or prints the line to run.

**Outcome:** Starting the new spec's session is one step the agent runs, so "needs its own session" stops being friction that pushes the work back inline.

**Files to touch:**
- `skills/spec/tools/launch/command-line.ts`, `launch/terminal.ts` (new, pure)
- `skills/spec/tools/commands/launch.ts` (new); `spec.ts` command table
- `skills/spec/tools/tests/launch.test.ts` (new)
- `skills/spec/SKILL.md` (*Tools* bullet), `README.md`

## Implementation guidance

`technical.md` → *spec.ts launch*. Exemplar: `commands/pr-status.ts` + `tests/pr-status.test.ts` (injected `Runner`, `stubRunner`). `env` is injected too (`process.env` default) so tests pick the terminal. Always one line, always exit 0.

## Deliverables

- [x] Command line: prompt, session name, shell line with single-quote escaping; refuses an unknown sub-command or a bad name
- [x] Terminal pick + argv: tmux, iTerm (tab, or window when none), Terminal.app, none → print; AppleScript escaping
- [x] `launchReport` with `stubRunner`: launched line; failed osascript → print fallback; command table + SKILL.md *Tools* + README
