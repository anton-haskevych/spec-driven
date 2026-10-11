# Phase 2 preflight — babysit log and `pr log`

Self-scaled: three small files plus one command; recon read the seam in full.

## Findings that change the plan

1. **`stateDir(git, …)` does not fit the base cache.** `baseCache(git, sha, commonDir)` (`mainline/base-cache.ts:10`) takes
   the common dir as a string, and its caller `baseProject` (`mainline/load.ts:49-55`) returns that common dir, so it must
   resolve it anyway. Routing the cache through `stateDir(git, …)` would run `rev-parse` twice. Lift the path rule as a pure
   `stateDirIn(commonDir, …segments)` and build `stateDir(git, …)` on it; claims and babysit use `stateDir`, the cache `stateDirIn`.
2. **The log line shape can't render the header.** technical.md's line is `{at, event, sha, detail}`, but the header names the
   group and spec (design.md:118). `babysit-start` carries `spec` and `group` fields; other events don't.
3. **Event kind is a closed set** (technical.md → Babysit log). Read validates `event` against it; a line with an unknown kind or
   missing `at` counts as malformed, so the renderer never sees a shape it can't print.

## Canon against phase 2 (non-inert rows)

| Rule | Verdict | Consequence |
|---|---|---|
| Pure functions / Humble Object | Bites | `parseEvents(text)` and `renderTimeline(log, pr, timeZone)` pure; `appendEvent`/`readEvents` are the only fs calls |
| Explicit dependencies | Bites | `at` comes from the caller's `now`; zone is a parameter (bun test is UTC) |
| Single source of truth | Bites | `"spec-board"` appears once, in `stateDirIn` |
| Validate at boundaries | Bites | validation only in `parseEvents`; render trusts the type |
| SRP | Inert | — |
| Pass D (DDD) | Skipped | tooling, no domain model |

## Amendments

1. `core/git.ts`: `stateDirIn(commonDir, …segments)` + `stateDir(git, …segments)`; `claimsDir` uses `stateDir(git, "claims")`, `baseCache` uses `stateDirIn(commonDir, "base")`.
2. `BabysitEvent = { at; event: EventKind; sha?; detail?; spec?; group? }`; `spec`/`group` only written on `babysit-start`.
3. `pr log <n>` with a bare number makes no gh call; other targets go through `resolvePr`.
4. Result lines: `pr log --add` → `PR #<n>: note added`; empty → `PR #<n>: no babysit log on this machine`.

## Decisions for you

None.
