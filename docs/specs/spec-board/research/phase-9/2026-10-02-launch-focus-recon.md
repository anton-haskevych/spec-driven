---
date: 2026-10-02
phase: 9
chunk: launch-focus
---

# Phase 9 recon — launch keeps your place

*Source of record — do not edit.* Inline recon (three files and iTerm's scripting dictionary).

## The seam

- `launch/terminal.ts:14-23` `launchArgv(terminal, launch)`: tmux `new-window -n <title> -c <dir> <command>`
  (no `-d`: the client switches to it); Terminal.app `do script` then `activate` (pulls Terminal in front of
  whatever app Anton is in); iTerm `iTermScript` (`:25-36`).
- `iTermScript`: `create tab` in `current window`, then `write text` into **`current session of current
  window`**, i.e. whatever tab is in front at that instant. A second launch, or Anton clicking a tab, in
  between sends the line to the wrong tab (CRM 2026-10-02 20:08, garbled launch). The new tab is left selected.
- `commands/launch.ts:28-37` `launchReport`: `Launched: <terminal> — <title>` on exit 0; ignores stdout.
- Tests: `tests/launch.test.ts:45-74` pin the argv/script text (`toContain` on the iTerm script, exact argv for
  tmux and Terminal); `:11-15` the report line via `stubRunner` (`tests/stub-runner.ts:7`, supports stdout).

## iTerm dictionary (iTerm 3.6.11, `sdef`)

- `create tab` returns the `tab` it created. `tab` has `index` and `current session`, and responds to `select`.
- `session` responds to `write`; `name` is settable.
- So the script can hold the new tab, write into its own session, name it, select the remembered tab, and
  return the new tab's `index` on stdout.

## Reuse

- `appleScriptString` (`terminal.ts:38-40`) already escapes; `SessionLaunch.title` is the name to show.

## Testing-issue estimate

- Script text is asserted with `toContain`; behaviour can only be proven in a real iTerm: one manual run
  with a harmless command, then close the probe tab.
- No file near the cap (`terminal.ts` 40 lines, `launch.test.ts` 147).
