# Spec Loop Automation — Technical

Ground truth: `research/2026-09-30-wave-1-loop-mechanics.md`, `…-wave-2-hooks-gh-git.md`, `…-craft-loop-mechanics.md`. Paths relative to `skills/spec/`.

## Conventions (from craft)

Named exports; kebab-case files; `commands/` = thin adapters returning a string, never exiting non-zero; pure `parseX`/`loadX`; writers = pure text patch returning `{kind:"updated",text}|{kind:"unchanged"}|{kind:"invalid",reason}`, command does `writeFileSync`. ≤250 lines/file, ≤50/function, ≤4 params. Zero runtime deps. Every mode-file tool step keeps a no-Bun fallback line. Register each command in `spec.ts` (import, `case`, `USAGE`), a `**Name.**` bullet under SKILL.md *Tools*, and a README line. New `spec.ts` commands are **not** `/spec` sub-commands — never added to `SUB_COMMANDS` (`commands/context.ts:21`).

## Project settings — `docs/specs/_playbook/settings.md`

```yaml
---
docs: main            # main | branch   (default: branch)
pr:
  draft: false        # default: true
  merge: squash       # squash | merge | rebase (used when the user says merge; unset → ask)
checks:
  external: ["Vercel*"]   # status contexts reported separately, not counted red/green
gates:
  after-merge-main: merge-main   # gates.md section run after merging main
  bootstrap: bootstrap           # gates.md section run when a worktree is fresh
nudge-at: 500000      # tokens; unset → no context nudge
---

<prose: why these values; optional>
```

- Module `tools/settings/project-settings.ts`: `SETTINGS_FILE`, `parseSettings(text): ProjectSettings`, `loadSettings(projectDir): ProjectSettings` (defaults applied). Unknown keys → doctor warning. Reuses `core/frontmatter.ts` helpers.
- `spec.ts settings` prints the resolved values (used by handoff/update, which get no pack).
- Resume/execute packs include a one-line `Settings:` summary when the file exists.
- Doctor: `doctor/settings.ts` validates types and that named gates exist in `gates.md`.

## Git/gh runner — `tools/git/run.ts`

```ts
export interface RunResult { code: number; stdout: string; stderr: string }
export interface Runner { run(argv: readonly string[], opts?: { cwd?: string; env?: Record<string, string>; stdin?: string }): RunResult }
export const systemRunner: Runner   // Bun.spawnSync, argv array, no shell
```
Commands take `runner: Runner = systemRunner` as their last param. Tests: stub runner returning canned output (gh), real throwaway repos with fixed `GIT_AUTHOR_*`/`GIT_COMMITTER_*` env (git).

## Commands

| Command | Contract | Module |
|---|---|---|
| `context -` (fix) | parse per below; infer spec from paths when unnamed | `commands/context.ts`, `context/infer-spec.ts` |
| `tick <spec> <phase> "<item prefix>" [--evidence <text>]` | ticks the unique matching `- [ ]` in the phase entry; flips the progress.md box when all subs done; task phases require evidence | `commands/tick.ts`, `phases/tick.ts` |
| `deployed <spec> <phase> [--date YYYY-MM-DD]` | appends ` · deployed <date>` to a ticked progress line; refuses unticked | `commands/deployed.ts`, `phases/deployed.ts` |
| `phase add <spec> "<title>" [--after <id>] [--needs a,b] [--pr X] [--code false]` | new id = next integer, or `<after>` + next free letter; writes phase file + frontmatter + progress line at the right position | `commands/phase.ts`, `phases/add.ts` |
| `phase split <spec> <id> "<title a>" "<title b>"…` | `<id>` → `<id>a`, `<id>b`…; moves unticked items only into the new files per `--items`; rewrites local `needs` that pointed at `<id>` to the last part; lists external `spec#<id>` refs to fix | `phases/split.ts` |
| `lessons add <spec> --kind <k> --paths <globs> --title "<t>" --body-file <f>` | runs `similar` first and refuses on a strong match (prints it); writes entry with `created:` + `seen-in: [<spec>]`, project INDEX row, spec pointer row | `commands/lessons.ts`, `lessons/add.ts` |
| `settings` | resolved settings | `commands/settings.ts` |
| `pr-status [<pr>|<spec>]` | see design.md output; spec → PR number from `pr-opening.md` Spec state | `commands/pr-status.ts`, `git/pr-status.ts`, `git/pr-render.ts` |
| `push` | pushes current branch (sets upstream if none); on the default branch refuses when unpushed commits touch files outside `docs/specs/`; prints `Remote:` line | `commands/push.ts`, `git/push.ts` |
| `publish-docs <spec>` | only when `docs: main`; algorithm below | `commands/publish-docs.ts`, `git/publish.ts` |

### Context parse (replaces `context.ts:24-31`)
1. Tokenize; strip trailing `[.,;:!?]+` per token.
2. First token a sub-command → `mode`, rest = `[name, …hint]`. Else last token a sub-command → `mode`, `name = tokens[0]`, `hint = tokens[1..-1]`. Else `route`.
3. If `name` is a chunk reference (`phase`, `next`, `/^\d+[a-z]?(\.\d+)?$/`, `/^phase[-]?\d/i`) → `hint = [name, …hint]`, `name = undefined`.
4. `name` undefined and mode ∈ {resume, status, execute} → `inferSpec(projectDir, runner)`: paths from `git diff --name-only $(git merge-base HEAD origin/HEAD)` + `git status --porcelain` → `locateSpecFile` → distinct spec names; exactly one → use it. Git failure or 0/≥2 → no pack.

### publish-docs algorithm
1. Refuse unless `settings.docs === "main"`. `git fetch origin <default>`.
2. Files = `git diff --name-only --diff-filter=AM origin/<default>...HEAD -- docs/specs` (+ `*/docs/specs`). Deleted paths → reported "not published".
3. Temp index: `read-tree origin/<default>`; `update-index --add` each non-INDEX file from the worktree.
4. Each `INDEX.md` in the list: main's text + rows present on the branch but not on main, inserted after the last row of the same `##` section (or appended). Stage via `hash-object -w` + `update-index --cacheinfo`.
5. Guard: `diff-index --cached origin/<default>` shows only A/M; for every INDEX, main's lines ⊆ new lines. Else abort.
6. `write-tree` → `commit-tree -p origin/<default> -m "docs(spec): publish <spec>"` → `push origin <sha>:refs/heads/<default>`. Rejected → re-fetch and rebuild once; then stop with the error.
7. Print `published N files to <default> (<sha>)`, INDEX merges, and skipped deletions.

## Doctor additions
- `doctor/gitattributes.ts`: warn when `.gitattributes` lacks a `merge=union` rule matching `docs/specs/**/INDEX.md`. Repo-level warnings (gitattributes, settings) also appear in spec-scoped runs, capped to one line each — update exact-output tests (`hook.test.ts:33`).
- `doctor/index-rows.ts`: duplicate rows and rows whose file is missing, for spec and project INDEX files (union-merge failure modes).
- Indented phase lines in `progress.md` dropped by `parsePhaseLines` → warning.
- `create.md` adds the union rule to `.gitattributes` when missing.

## Hooks
- Shared input: `tools/hooks/hook-input.ts` — `readPayload()`, `writtenPaths(payload)` for Write/Edit/MultiEdit, `mentionsSpecDocs(payload)` for Bash, the fail-open `main()` wrapper. `sessionMemory(prefix)` moves here from `lesson-recall.ts:37-52`.
- `spec-file-check.ts`: matcher `Write|Edit|MultiEdit|Bash`; for Bash mentioning `docs/specs`, validate spec files with mtime newer than the session's last-check stamp (first run: last 120 s), then update the stamp.
- `context-nudge.ts`: PostToolUse, matcher `Bash|Write|Edit|MultiEdit|Agent`; reads the transcript tail (last 256 KB), last assistant `usage` → `input + cache_read + cache_creation`; ≥ `nudge-at` and not yet nudged → `additionalContext`: "Context ≈ N tokens (nudge-at M). Finish the current TDD cycle, then /spec handoff at the next clean boundary." Silent otherwise.
- `skill-wiring.test.ts:32-34` hook count 2 → 3.

## Mode-file changes
- SKILL.md: parse rules (`:36-49`) → one line deferring to the tool; `:74` reworded (names or changed paths, never branches); `:78`, `execute.md:107` reworded for the nudge; `:86` hook coverage; draft wording `:401` → settings; Tools bullets for new commands.
- `execute.md`: `:97,147-149` → `tick`; `:137` → `settings.pr.draft`; `:150` → `phase add`; after merging main → `gates <after-merge-main>`; PR body leads with phase Outcomes; `pr-status` at the gate.
- `update.md`: `:36-49` → `tick`/`deployed`; §9 → push.
- `handoff.md` §3: after commit → `spec.ts push`, then `publish-docs` when `docs: main`; §4 prints the `Remote:` line.
- `create.md`: `:241-242` draft wording → settings; phase template gains `**Outcome:**`; `.gitattributes` scaffold.
- `review.md:335` → settings.
- SKILL.md *Project ledger → Write path* → `lessons add`.

## Test helpers (new, `tools/tests/`)
- `tree.ts` — temp project/spec builder (`write`, `spec()`, `phase()`, `ledger()`, cleanup), seeded from `graph.test.ts:14-20`.
- `git-repo.ts` — throwaway repo + bare origin + worktree, fixed identity env.
- `stub-runner.ts` — canned `RunResult`s keyed by argv prefix.
- Hook payload + transcript JSONL builders.
- Static gh JSON samples in `tests/fixtures/` (ignored as tests).
