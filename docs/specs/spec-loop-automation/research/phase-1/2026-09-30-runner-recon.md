# Phase 1 recon — chunk: Runner → parse → inferSpec → contextPack inference

Chunk = deliverables 1–5 of `phases/phase-1-context-pack-loads.md`. One wave, two Explore agents (seam; reuse + test harness). Paths relative to `skills/spec/tools/`.

## The seam

- `commands/context.ts` (74 lines)
  - `parseContextRequest` :24-31 — splits every argv element on whitespace; lowercases only first/last for matching (name keeps case). Last-token form returns `name: tokens[0]` and **drops middle tokens** (:29). No punctuation strip; no chunk-reference handling (SKILL.md:49's execute exception is prose-only).
  - `contextPack(projectDir, request)` :33-52 — `""` unless `name` and mode ∈ resume/status/execute/route (:34); `findSpecs` exactly one (:35-36); needs progress + `ledger/INDEX.md` (:39-40). Header built **only** at :51: `<spec-pack spec="…" mode="…">`. Nothing in code parses pack attributes; prose readers: SKILL.md:87, execute.md:18, resume.md:17, status.md:11, README.md:96.
  - `phaseForHint` :70-74 — strips `/^phase\s+/i` only.
- `spec.ts` (50 lines) — `case "context"` :19-20; `withStdinArgs` :39-42 turns `context -` into `["context", <stdin text incl. trailing \n>]`; `projectDir = process.cwd()` :46 (not the git toplevel); errors caught into `spec tools failed: …` :47-49. Only callers of `contextPack`/`parseContextRequest`: `spec.ts:20`, `tests/context.test.ts`.
- `core/spec-folders.ts` (39 lines) — `SPEC_FILE_PATTERN` :14 needs `/docs/specs/`; `locateSpecFile` :33-39 has one production caller (`hooks/spec-file-check.ts:31`, absolute paths) + `core.test.ts:70-79`. `findSpecs` exact-name.
- `core/phase-title.ts` — `samePhase` case-insensitive equality; phase ids are the raw token after `Phase` (`2`, `5.5`, `2b-pre`, `3a`) or the 1-based line index.
- `SKILL.md` — injection :27-30 (here-doc, `true` tail); parse prose :34-49; lifecycle :74. `skill-wiring.test.ts` pins: injection regex + no `&&`/`||` + `<<'SPEC_ARGS'` (:50-54), sh/zsh no-bun and passthrough runs (:56-80), sub-command set / dispatch rows / argument-hint equal `SUB_COMMANDS` (:88-97), hook count 2 (:32-34).

## Patterns to mirror

- Injected seams: `RecallMemory` interface + factory default wired only under `import.meta.main` (`hooks/lesson-recall.ts:8-17,37-44`); callback-type-as-last-param (`doctor/phases.ts:4,9`; real reader passed at `doctor/run.ts:67`). → `Runner` interface in `core/run.ts`, `systemRunner` default, passed as last param.
- `core/files.ts` (12 lines) — the existing tiny IO module; `run.ts` sits beside it.
- Tests: temp trees via `mkdtempSync(join(tmpdir(), "spec-<area>-"))` + `afterAll(rmSync…)`; `write()` helpers per file (`context.test.ts:106-109`, `graph.test.ts:14-20`). Fakes are in-memory objects (`lessons.test.ts:44-47`), no `mock()`.

## Reuse

- No process spawning exists in production code; `run.ts` is the first. `Bun.spawnSync([...], {cwd, env})` usage + `stdout.toString()` / `exitCode` asserted in `skill-wiring.test.ts:57-80`.
- `locateSpecFile` + `findSpecs` do the path→spec mapping; inference only has to produce absolute paths.
- `tests/fixtures/` exists (empty) and is ignored by `bunfig.toml` (`pathIgnorePatterns = ["**/fixtures/**"]`).

## Testing-issue estimate

- **No git harness.** No test creates a repo; CI (`.github/workflows/plugin-metadata.yml:16-25`) sets no git identity. `tests/git-repo.ts` must set `GIT_AUTHOR_*`/`GIT_COMMITTER_*` and isolate config (`GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`) — and must not replace `env` wholesale the way `skill-wiring.test.ts:60` does (drops `HOME`/`PATH`).
- **`Bun.spawnSync` on a missing binary throws** (gh absent) — `systemRunner` must turn that into a `RunResult` so fail-open holds.
- **`contextPack` becomes impure** (git) — keep inference behind the `Runner` param; existing `contextPack` tests pass names, so they never spawn. New inference tests use real repos (per the gotcha ledger entry) plus stub-runner unit tests for the failure paths.
- **Size.** `context.ts` 74 lines → ~110 with parse changes; fine under 250. `context.test.ts` 174 lines → new inference tests go in a new `infer-spec.test.ts` to keep it under the cap.
- **No-Bun / injection tests** untouched as long as the SKILL.md injection shape is not edited (chunk 2 edits prose only).
- **Smell:** `phaseForHint` and the name-slot chunk check both need "is this a chunk reference?" — one predicate, not two regexes.
