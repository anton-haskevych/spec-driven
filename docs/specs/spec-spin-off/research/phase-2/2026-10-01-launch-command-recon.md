# Phase 2 recon — launch command

*Immutable. Seam from explore-waves wave 2 (`../2026-10-01-wave-2-docs-and-launcher.md`) + local probes.*

## Seam
- New: `tools/launch/command-line.ts`, `tools/launch/terminal.ts`, `tools/commands/launch.ts`, `tests/launch.test.ts`.
- Edit: `tools/spec.ts` `COMMANDS` table (usage must start with `launch`, `tests/commands-table.test.ts`).
- Docs: `SKILL.md` *Tools*; `README.md` command list.

## Patterns to mirror
- `commands/pr-status.ts:10` — `runner: Runner = systemRunner` as a defaulted trailing parameter; one-line `<cmd>: <reason>` refusals.
- `tests/pr-status.test.ts` / `tests/git.test.ts:7-9` — `stubRunner`, assert on returned lines and `runner.calls`.
- `context/request.ts:9` `SUB_COMMANDS` validates the sub-command.

## Reuse
- `Runner`, `Result<T>` (`core/result.ts`), `SUB_COMMANDS`. No new deps.

## Testing-issue estimate
- `process.env` is read nowhere in production code but `core/run.ts:24` → inject `env` like the runner so terminal choice is testable.
- osascript can't run in CI → only argv is unit-tested; the real tab is a pre-PR smoke check.
- No size risk (new files, each well under 100 lines).
