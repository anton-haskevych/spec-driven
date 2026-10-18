# Phase 1 preflight — owners, assigned and read everywhere

Paths relative to `skills/spec/tools/`. Inputs: the phase entry, `2026-10-17-owners-everywhere-recon.md`,
`principles.md`.

## Findings that change the plan

1. **The phase's `anonymousRunner` can't serve the repo-local-name case.** It sets `GIT_AUTHOR_NAME=""`,
   and git treats an empty env name as set: `fatal: empty ident name (for <>) not allowed` even with a
   repo-local `user.name` (probed, recon → Testing issues). `systemRunner` merges `process.env`
   (`core/run.ts:34`), so the helper must unset the identity keys for the spawned git, not blank them.
2. **`planShip` is a test import** (`tests/ship-command.test.ts:2`, asserts at `:21-27`). "Ship tests
   unchanged" means `planShip` stays exported from `commands/ship.ts` as a wrapper over a pure
   `planSpecField`, with the same `write`/`unchanged`/`refused` shapes and reasons.
3. **`samePerson`/`personKey` tests live in `tests/board-people.test.ts:3-25`.** They move with the code to
   `tests/core-people.test.ts`; `board/render-focus.ts:4` imports `personKey` from core.
4. **One field, not three.** Ready, flight and blocked rows all extend `RowBase` (`board/model.ts:12-16`):
   `owner?` goes there once.

## Clean Code against phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names | Bites | `runnerName` vs `authorName`: comment on `authorName` says it's the claim holder only; `Board.me` comment (`board/model.ts:166`) rewritten |
| Small functions / few args | Bites | `landSpecField(projectDir, runner, edit)` — 3 params; `SpecFieldEdit` object carries spec/key/value/same/already/message |
| No flag args | Bites | removal is `value: undefined`, not a `remove: boolean` |
| Errors as values | Bites | `runnerName` returns `Result<string>` (`core/result.ts:1`), never undefined |
| Comments | Inert | — |

## Clean Architecture against phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | `core/people.ts` imports only the `SpecMeta` type; `board/` and `claims/` import core, never the reverse (today `claims/remote.ts` has its own `UNKNOWN_USER` because matching sat in `board/`) |
| Humble object | Bites | `planSpecField` pure; `landSpecField` the git edge, tested with `repoWithOrigin` like ship |

## SOLID against phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | `commands/owner.ts` = parse + copy; landing in `core/land-spec-field.ts` (two actors: `ship`, `owner`) |
| OCP | Bites | next variant: a third "set one key on main" command; it plugs into `landSpecField` without edits |
| LSP / ISP | Inert | — |
| DIP | Bites | `landSpecField` takes a `Runner`, so tests pass `isolatedRunner` |

## DDD

Skipped: tooling code, no domain model beyond the "owner"/"offered" words, which `core/people.ts` names.

## Guard blindness

`tests/commands-table.test.ts` checks usage starts with the command name: it sees a missing or misnamed
`owner` entry. Nothing claims a guard for "never default an owner"; tests of `spec.ts owner` and the
untouched parse cover it.

## Seam and testability (deltas from recon)

- `board/lanes.ts` 201 lines → ~205 with the owner spreads; under the cap.
- YAML safety: a git name is free text. Write the owner plain when it round-trips through the frontmatter
  parser, else as a double-quoted scalar; one unit test.

## Amendments

1. `anonymousRunner` unsets `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`,
   `GIT_COMMITTER_EMAIL`, `EMAIL` for the spawned git (temporarily removed from `process.env` around
   the synchronous `systemRunner` call) plus `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`.
2. `planShip` kept as a wrapper; `planSpecField(edit, claudeMd)` holds the logic.
3. Matching tests move to `tests/core-people.test.ts`.
4. `owner?` on `RowBase`, set through one `ownerField(meta)` helper in `board/people.ts` used by
   `lanes.ts` and `flight.ts`.

## Defaults applied

- Owner mark goes first in the ready note: `(taras) · must · unblocks 2`.
- `spec.ts owner X none` when already unset: `owner: X already has no owner`.
- "Already" is exact string equality on the trimmed value, not `samePerson` (`Taras` → `taras` rewrites).
- A failed `me` lookup prints runnerName's reason + `, or name the person`.
- FOCUS rows keep reading `meta.owner` (not in this phase's files; a malformed owner shows no owner there).

## Forks for you

None.
