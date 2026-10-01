# Phase 2 preflight — launch command

*Immutable. phase-preflight over the phase entry + recon note; read `commands/pr-status.ts`, `core/run.ts`, `core/result.ts`, `context/request.ts`, `tests/stub-runner.ts`, `tests/commands-table.test.ts`.*

## Findings that change the plan

1. The phase file lists tmux after iTerm; inside tmux (often itself inside iTerm) a tmux window is the natural target. Pick order: `TMUX` → iTerm → Terminal.app → none.
2. A launch attempt that the terminal refuses (osascript non-zero, e.g. automation permission denied) must still give the user the command; the report degrades to the print line with the refusal reason, never an error.

## Canon against Phase 2

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Pure functions at the core, I/O at the seam | Bites | `command-line.ts` and `terminal.ts` pure (args/env → data/argv); only `commands/launch.ts` calls the runner |
| Explicit dependencies | Bites | `launchReport(dir, args, env = process.env, runner = systemRunner)` |
| Validate at boundaries | Bites | Spec name `^[a-z0-9][a-z0-9-]*$` and sub-command ∈ `SUB_COMMANDS` checked once in `command-line.ts`; quoting still applied to `projectDir` (may hold spaces) |
| SRP | Bites | Two units: what to run (command line) vs where to run it (terminal) |
| OCP | Bites | A new terminal = one `Terminal` case + one argv builder; the report doesn't change |
| LSP / ISP / DIP | Inert | — |
| DDD | Skipped | Tooling |

## Amendments

1. Terminal order `TMUX` → `iTerm.app` → `Apple_Terminal` → none.
2. Refused launch → `launch: run this in a new terminal: <line> (<terminal>: <first stderr line>)`.

## Decisions for you

None.
