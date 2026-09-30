---
date: 2026-09-30
wave: 3
lens: craft
slug: loop-mechanics
brief: product-brief.md
---

# Craft Wave — loop-mechanics

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Three agents: naming & placement, test conventions & fixtures, extraction. Paths relative to `skills/spec/`.

## Conventions every new file follows
- kebab-case files; domain-noun folders (`lessons/`, `playbook/`, `ready/`); `commands/` = thin adapters; `core/` = generic parsers. Named exports only, `node:` imports, `UPPER_SNAKE` regex/path constants (`PROJECT_LEDGER_DIR` `lessons/project-ledger.ts:6`, `GATES_FILE` `playbook/gates.ts:5`).
- Two command families: multi-action `xxxCommand(projectDir, args)` + `USAGE` + switch (`commands/lessons.ts:11-28`); single-target `xxxReport(projectDir, specName)` with `x: no spec named …` (`commands/ready.ts:7-10`). Return a string; never exit non-zero (`spec.ts:44-49`). Register: alphabetised import + `case` + `USAGE` entry in `spec.ts`.
- Writers: pure text patch returning `{kind:"updated",text}|{kind:"unchanged"}|{kind:"invalid",reason}` (`lessons/seen-in.ts:3-21`); command does `writeFileSync` (`commands/lessons.ts:44-55`). Never re-emit YAML.
- Loaders: pure `parseX(text)` + `loadX(projectDir)` via `core/files.ts`.
- Caps: 250 lines/file, 50/function, ≤4 params else a typed object (`DoctorContext` `doctor/run.ts:19-25`). Real modules are 9–125 lines. Strict TS + `noUncheckedIndexedAccess`; zero runtime deps.
- Mode files: inline ``bun ${CLAUDE_SKILL_DIR}/tools/spec.ts <cmd> <name>`` or a fenced bash block, always with a no-Bun fallback line ("Skip this step if `bun` isn't available."). New tools get a `**Name.**` bullet under SKILL.md *Tools* and a README line.
- Hooks: `<noun>-<noun>` names; pure exported response function + `import.meta.main` stdin wrapper that fails open (`hooks/lesson-recall.ts:17,54-65`); SKILL.md frontmatter entry via `$CLAUDE_PLUGIN_ROOT`, `command -v bun … || true`, `timeout: 10`.
- Commits `<area>: <summary>` lowercase; release = version bump + ROADMAP row + `scripts/version.py`.

## New files, named and placed

| Item | File(s) | Exemplar |
|---|---|---|
| tick / deployed | `commands/tick.ts`, `commands/deployed.ts` (`xxxReport`); writers in a new domain folder | `commands/lessons.ts:44-55`, `lessons/seen-in.ts` |
| phase add / split | `commands/phase.ts` (`phaseCommand` + USAGE); writers beside tick | `commands/lessons.ts:11-28`; helpers `core/phase-title.ts`, `phase-entry.ts`, `phase-edges.ts` |
| lessons add | `case "add"` in `commands/lessons.ts`; logic `lessons/add.ts` | `lessons/seen-in.ts`; rules `doctor/project-lesson.ts:6-21` |
| git/gh runner | new `git/` folder, one injectable spawn seam | none in prod; `tests/skill-wiring.test.ts:65` |
| pr-status | `commands/pr-status.ts` + `git/pr-status.ts` (parse/group) + render | `commands/ready.ts`, `ready/render.ts` |
| publish-docs | `commands/publish-docs.ts` + `git/publish.ts` | wave-2 algorithm |
| project settings | loader with exported file constant, `parseSettings`/`loadSettings` | `core/taxonomy.ts:5-13` or `playbook/gates.ts:5,25-28` |
| gitattributes check | `doctor/gitattributes.ts` → `Issue[]` via `warning()`, wired `commands/doctor.ts:25` | `doctor/backlog.ts:7-11` |
| parse fix | edit `commands/context.ts:24-31,70-74`; reuse `core/spec-folders.ts:29-39` | tests `context.test.ts`, `skill-wiring.test.ts:81-93` |
| Bash-write matching | shared input module (e.g. `core/written-files.ts`) used by both hooks | `hooks/lesson-recall.ts:13,18-21`, `spec-file-check.ts:23,77-80` |
| context nudge | `hooks/context-nudge.ts` + frontmatter entry | `hooks/lesson-recall.ts` |

## Test fixtures: reuse vs create
- **Reuse:** `tests/factories.ts` (in-memory `Partial<T>` builders); direct calls to command functions with injected values (clock injected as `TODAY`, `spec.ts:32`); pure hook functions with injected interfaces (`RecallMemory`, fake at `tests/lessons.test.ts:44-47`); pure-transform-then-write test pattern (`lessons.test.ts:97-101`); fake-binary-on-`PATH` (`skill-wiring.test.ts:60,71`); `mkdtempSync` + `afterAll(rmSync)`.
- **Create** (home: `tests/` beside `factories.ts`; never `tests/fixtures/`, which `bunfig.toml` ignores — static JSON samples may live there):
  1. temp project/spec tree builder — seed from `graph.test.ts:14-20` + four duplicated `write()` helpers (`hook.test.ts:11-16`, `context.test.ts:106-109`, `portfolio.test.ts:108-117`, `task-phases.test.ts:11-19`); 11 files build trees ad hoc; `hook.test.ts` mutates a shared tree (order-dependent).
  2. throwaway git repo builder — `git init`, fixed `GIT_AUTHOR_*`/`GIT_COMMITTER_*` env (CI `plugin-metadata.yml` sets no identity), bare origin for push.
  3. process-runner stub — injected runner interface returning canned stdout/exit, or fake `gh` on `PATH`.
  4. hook payload builders — Bash `tool_input.command`; `transcript_path` to a temp JSONL with usage lines.
- No `Bun.$`, `mock()`, `spyOn` anywhere today. Assertions: `toEqual`/`toContain`, a few exact `toBe` (`hook.test.ts:33`).

## Extraction
Worth it now (each with a small test):
- **Hook input** — `WATCHED_TOOLS` + `file_path` + cwd fallback + stdin/fail-open wrapper duplicated (`lesson-recall.ts:13,18-23,54-65`; `spec-file-check.ts:23,77-82,91-100`). One `writtenPaths(payload)` covers Write/Edit and Bash; the nudge reuses the wrapper.
- **Session memory** — `sessionMemory` (`lesson-recall.ts:37-52`) gains a key/prefix param for the nudge. (`once: true` is unusable: it removes the hook after its first *successful* run, even below threshold.)
- **Frontmatter line patch** — `setFrontmatterLine(text, key, value)` from `seen-in.ts:5-20`; `addSeenIn` becomes a caller.
- **Checkbox/deployed patterns** — export `DEPLOYED_SUFFIX`, `PHASE_POINTER` (`core/progress.ts:10,17`), `TICKED_ITEM`, `EVIDENCE` (`doctor/task-phases.ts:6-7`) so writers emit what readers parse; round-trip tests via `loadSpecState`.
- **Ledger INDEX rows** — `core/ledger-index.ts`: parser (from `context/ledger-scope.ts:14-32`) + a formatter per row kind (spec, project, pointer); the project `_ledger/INDEX.md` gets its first parser (needed for duplicate-row checks after union merges).
- **Timestamp** — `isoTimestamp(date)` beside `isoDay` (`core/schedule.ts:41-45`); `spec-bump.sh` stays bash (no-Bun path); a test compares both formats.
- **Test tree builder** (above) and a tiny `takeFlag(args, "--x")`.

Don't extract:
- doctor's file-only INDEX regex (`doctor/ledger.ts:5`) — skips pointer rows on purpose;
- `toProjectPath` vs `spec-file-check.ts:83` path normalisation (opposite directions);
- hook *output* shapes (Pre `additionalContext` vs Post `decision:block`);
- YAML stringify, a CLI framework, a line-based rewrite of the AST reader;
- `isoDay(new Date())` call sites;
- the docs-to-main recipe and the draft rule (single use; settings replace the rule).

Bug found in passing: `numericPart` (`core/phase-title.ts:17-20`) reads `9.10` as 9.1.

## Mode prose that shrinks or changes
- `SKILL.md:40-49` parse rules → tool owns them; keep the set + dispatch table (wiring test).
- Ticking `execute.md:97,147-149`, `update.md:39-48` → `tick`; deployed `update.md:49`, `SKILL.md:248` → `deployed`; `execute.md:150` → `phase add`; promotion `update.md:171-183` relates to `phase split`.
- Ledger writes `SKILL.md:304,312,366-375`, `update.md:78`, `handoff.md:52`, `review.md:309,315` → `lessons add`.
- Commit/push `handoff.md:115-143`, `review.md:335` → settings + push.
- Reword: `execute.md:107` + `SKILL.md:78` (token usage), `SKILL.md:74` (no guessing), `SKILL.md:86` (hook coverage).

## Craft decisions for create (not resolved here)
1. Domain folder for spec-file writers: `progress/` (collides with `core/progress.ts`) vs `phases/`.
2. Settings home: `.claude/`-family (taxonomy-style) vs `_playbook/`-family (gates-style); file name.
3. Runner seam: injected interface vs fake binaries on `PATH`.
4. Does `lessons add` also cover spec-ledger entries, or only the project ledger?
5. Does `phase split` absorb flat→folder promotion?
6. New `spec.ts` commands stay out of `SUB_COMMANDS` (`commands/context.ts:21`) — confirm no `/spec` surface.
