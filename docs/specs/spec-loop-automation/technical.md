# Spec Loop Automation — Technical

Ground truth: `research/2026-09-30-wave-1-loop-mechanics.md`, `…-wave-2-hooks-gh-git.md`, `…-craft-loop-mechanics.md`, and `reviews/2026-09-30-pre-execution-collegium.md` (supersedes the research where they differ). Paths relative to `skills/spec/`.

## Conventions (from craft)

Named exports; kebab-case files; `commands/` = thin adapters returning a string, never exiting non-zero; pure `parseX`/`loadX`. ≤250 lines/file, ≤50/function, ≤4 params. Zero runtime deps. Every mode-file tool step keeps a no-Bun fallback line. New `spec.ts` commands are **not** `/spec` sub-commands — never added to `SUB_COMMANDS` (`commands/context.ts:21`).

- **Command table.** `spec.ts` dispatches through `COMMANDS: Record<name, {usage, run}>`; `USAGE` is derived from it and a wiring test pins every entry. Each new command also gets a README line; SKILL.md *Tools* groups them in three bullets (*Spec-file writers*: `phase …`, `lessons add`; *Remote*: `push`, `publish-docs`, `pr-status`; *Settings*: under *Playbook*), pointing at `spec.ts` usage for flags.
- **Flags.** `parseArgs` from `node:util` (strict, positionals). No hand-rolled `indexOf("--x")`.
- **Writers return an edit plan.** `EditPlan = {kind:"ok", edits: {file, text}[], renames?: {from, to}[]} | {kind:"unchanged"} | {kind:"invalid", reason}`. Writers are pure and build the whole plan; before returning `ok` they run the existing checkers on the planned text (`checkPhases`, `taskPhaseIssues`, `checkProjectLesson`, `checkLedgerIndex`) and return `invalid` on errors. One `core/apply-edits.ts` applies a plan (renames, then writes) — the only place writers touch disk.
- **Shared text patterns** live in `core/`, never imported from `doctor/`: `core/checkbox.ts` (open/ticked item, evidence, `formatTickedItem`), `core/progress.ts` (`PHASE_POINTER`, deployed suffix), `core/ledger-index.ts` (rows), `core/phase-title.ts` (`comparePhaseIds`).
- **Spec-doc paths.** One predicate `isSpecDocPath(repoRelative)` in `core/spec-folders.ts` covers `docs/specs/**` and `*/docs/specs/**`; push, publish, hooks and the `.gitattributes` scaffold all use it.
- **Timestamps.** `core/schedule.ts` `isoTimestamp` deliberately duplicates `spec-bump.sh --now` (the script stays the no-Bun path); a test compares the two.

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
nudge-at: 500000      # tokens; assumes 1M-window sessions; unset → no context nudge
---

<prose: why these values; optional>
```

- Module `playbook/settings.ts` (beside `playbook/gates.ts`): `SETTINGS_FILE`, `parseSettings(text): ProjectSettings`, `loadSettings(projectDir): ProjectSettings` (defaults applied). Uses `core/frontmatter.ts`, which gains `booleanField`, `numberField` and a nested-record accessor (tested).
- `spec.ts settings` prints the resolved values (used by handoff/update, which get no pack).
- Resume/execute packs include a one-line `Settings:` summary when the file exists.
- Doctor: `doctor/settings.ts` validates types, unknown keys, and that named gates exist (same shape as `doctor/gates.ts:4-9`). The spec-file check routes `_playbook/settings.md` to it on write (today `spec-file-check.ts:27,41` sends it to `checkPlaybook`, which returns nothing without `match:`).

## Named gates — `spec.ts gates`

Today `gates <spec>` expands only the gates a spec's `pr-opening.md` references (`commands/gates.ts:6-11`). Add `gates --name <g…>`: expands the named `gates.md` sections via `loadGates` directly. `execute.md:134` and SKILL.md's `gates <name>` wording are corrected to match.

## Runner — `core/run.ts`

```ts
export interface RunResult { code: number; stdout: string; stderr: string }
export interface Runner { run(argv: readonly string[], opts?: { cwd?: string; env?: Record<string, string>; stdin?: string }): RunResult }
export const systemRunner: Runner   // Bun.spawnSync, argv array, no shell
```
Commands take `runner: Runner = systemRunner` as their last param. Tests: stub runner returning canned output (gh), real throwaway repos with fixed `GIT_AUTHOR_*`/`GIT_COMMITTER_*` env (git). argv arrays also avoid zsh modifier traps (`$D:refs` → `:r`).

**Default branch** (push, publish, inference): `git symbolic-ref --short refs/remotes/origin/HEAD` → `gh repo view --json defaultBranchRef` → give up (inference: no pack; push/publish: refuse with the reason).

## Commands

| Command | Contract | Module |
|---|---|---|
| `context -` (fix) | parse per below; infer spec from the branch's paths when unnamed | `commands/context.ts`, `context/infer-spec.ts` |
| `phase tick <spec> <phase> "<item prefix>"\|#N [--evidence <text>]` | ticks the unique matching open item (prefix on markdown-stripped text, or the Nth open item); task phases require `--evidence` that passes `EVIDENCE`; when the entry has no open box left (`countCheckboxes(entry).unchecked === 0`) flips the progress.md box and prints `Phase N complete — run update.md → Close the phase` | `commands/phase.ts`, `phases/tick.ts` |
| `phase deployed <spec> <phase> [--date YYYY-MM-DD]` | inserts ` · deployed <date>` **immediately after the pointer** of a ticked progress line (trailing notes stay after it); refuses unticked; idempotent | `phases/deployed.ts` |
| `phase add <spec> "<title>" [--after <id>] [--needs a,b] [--pr X] [--code false]` | new id = next integer, or `<after>` + first free letter; progress line inserted after the last existing `<after>*` line; phase file from the flat template (incl. `**Outcome:**`) | `phases/add.ts` |
| `phase split <spec> <id> "<title b>" ["<title c>"…] [--items "b:1,2 c:3"]` | **`<id>` keeps its id, file and ticked items**; new parts take the next free letters (`7` → `7`, `7a`, `7b`; collisions via `samePhase`); listed open items (`#N` positions; labels `b`, `c`… = titles in order; `--items` repeatable or space-separated, since `parseArgs` takes one value per flag) move to the new parts; parts copy the original's edges; a move that leaves the original fully ticked flips its box; sibling `needs` on `<id>` are left alone (the original still exists) and reported for review; refuses folder-shape and done phases | `phases/split.ts` |
| `lessons add <entry.md> <spec>` | bookkeeping on a lesson the agent already wrote at its final `_ledger/` path (hook-validated): prints `lessons similar` close matches as a warning, sets `created:` if missing, sets `seen-in: [<spec>]`, appends the project INDEX row and the spec pointer row | `commands/lessons.ts`, `lessons/add.ts` |
| `settings` | resolved settings | `commands/settings.ts` |
| `gates --name <g…>` | see *Named gates* | `commands/gates.ts` |
| `pr-status [<pr>\|<spec>]` | see design.md output and *pr-status* below | `commands/pr-status.ts`, `pr/*` |
| `push` | `git push origin HEAD:refs/heads/<current>` (sets upstream when none); refuses detached HEAD; on the default branch refuses when unpushed commits touch paths outside `isSpecDocPath`; prints `Remote:` line | `commands/push.ts`, `publish/push.ts` |
| `publish-docs [<spec>]` | only when `docs: main` and not on the default branch; algorithm below; `<spec>` only labels the commit | `commands/publish-docs.ts`, `publish/snapshot.ts`, `publish/publish.ts` |

### Context parse (replaces `context.ts:24-31`)
1. Tokenize; strip trailing `[.,;:!?]+` per token.
2. First token a sub-command → `mode`, rest = `[name, …hint]`. Else last token a sub-command → `mode`, `name = tokens[0]`, `hint = tokens[1..-1]`. Else `route`.
3. If `name` is a chunk reference — whole token only: `next`, `/^\d+[a-z]*(\.\d+)?$/i`, `/^phase[-\s]*\d+[a-z]*(\.\d+)?$/i`, or `phase` followed by another token — and no spec by that name exists (`isSpecName`, injected; `spec.ts` passes a `findSpecs` check) → `hint = [name, …hint]`, `name = undefined`. Implemented in `context/request.ts`.
4. `phaseForHint` strips `/^phase[-\s]*/i` (today only `phase\s+`, so `phase15` misses).
5. `name` undefined and mode ∈ {resume, status, execute} → `inferSpec(projectDir, runner)`:
   - base = `git merge-base HEAD origin/<default>`;
   - paths = `git log --name-only --format= <base>..HEAD` (the branch's own commits — survive merges of main and publishes) ∪ `git status --porcelain -z --untracked-files=all` (NUL-parsed, rename targets kept);
   - each joined onto `git rev-parse --show-toplevel` before `locateSpecFile` (its pattern needs an absolute path, `core/spec-folders.ts:14`);
   - distinct names not starting with `_`. Exactly one → pack with `inferred="true"`; the agent states "Working on `<spec>` (inferred from changed files)" in one line and proceeds. Zero or several → no pack, one line naming the candidates (or open specs). Any git failure → nothing, silently.

SKILL.md keeps its parse rules — they are the no-Bun fallback and the only parse for pack-less modes (prep, create, review, update, handoff, list, idea) — rewritten to match steps 1–3. When a pack is present its `spec=` wins.

### publish-docs algorithm (probe-verified, see review)
1. Refuse unless `settings.docs === "main"`; skip when on the default branch. `git fetch origin <default>`; **pin** `M = rev-parse origin/<default>` and use `M` everywhere after.
2. Base `P` = the last snapshot commit reachable from HEAD (`git log -1 --format=%H --grep '^docs(spec): snapshot' HEAD`), else `git merge-base HEAD M`.
3. Files = `git diff --name-only --no-renames --diff-filter=AM P HEAD` filtered by `isSpecDocPath`. Deleted paths → reported "not published".
4. Snapshot: temp `GIT_INDEX_FILE`; `read-tree P`; for each file `update-index --add --cacheinfo <mode>,<HEAD blob>,<path>` (HEAD blobs — never worktree content); `write-tree`; `X = commit-tree -p P -m "docs(spec): snapshot <spec>"`.
5. `git merge-tree --write-tree M X`. Exit 1 (conflict) → stop, name the conflicting files ("diverged on main — merge main first"), push nothing. INDEX files union-merge through `.gitattributes`; no hand merge, no line guard.
6. `D = commit-tree <tree> -p M -p X -m "docs(spec): publish <spec>"`; `push origin D:refs/heads/<default>`. Non-fast-forward → re-fetch, re-pin, rebuild once; then stop. Any other rejection (protection, pre-push hook) → stop with the error, no retry.
7. `git merge --no-edit X` into the branch — a no-op diff that records the snapshot as an ancestor, so the next "merge main" and the next publish see only new changes.
8. Print `published N files to <default> (<sha>)` and skipped deletions.

### pr-status
1. PR: argument; else `gh pr view --json number` for the current branch; with `<spec>`, every PR link in `pr-opening.md` Spec state — report the last open one and name the others.
2. `gh pr view <n> --json state,isDraft,mergeable,mergeStateStatus,headRefOid`; `mergeable == UNKNOWN` → one re-poll.
3. Checks: `gh pr checks <n> --json name,state,bucket,workflow,link` (exit 1 on failures is data, not a crash). Names matching `settings.checks.external` are counted separately.
4. `state:` precedence: `merged`/`closed` → `conflicting` → `draft` → `red` → `pending` → `green` → `unknown`.
5. Failed jobs: run ids from `link`; `gh run view <run> --json jobs` (fetched once per run) for job ids; logs via `gh api repos/{owner}/{repo}/actions/jobs/<id>/logs` — `--log-failed` waits for the whole run (CRM lesson `workaround-read-a-failed-job-log-while-the-run-is-still-going.md`). Non-Actions checks have no job → name only. Strip BOM/ANSI/`<ISO>Z ` prefixes; the 30 lines ending at the first `##[error]` line (the log's tail is post-job cleanup), else the last 30.
6. Main comparison per failed job: workflow id from `gh run view <run> --json workflowDatabaseId` (names repeat, e.g. two "E2E Tests"), then `gh run list --branch <default> --workflow <id> --json databaseId,conclusion,createdAt`, walk back past runs where the job was skipped/cancelled/absent; cap 15 runs per job and 30 gh calls per invocation; else "not run in the last N runs".

Modules: `pr/gh.ts` (the only gh caller: typed records + 30-call budget), `pr/checks.ts` (pure counts + state precedence), `pr/main-compare.ts` (walk-back), `pr/log-tail.ts` (pure), `pr/report.ts` (orchestration), `pr/render.ts`.

## Doctor additions
- `checkLedgerIndex` (`doctor/ledger.ts:29`) counts rows instead of collecting a Set → duplicate rows become warnings. The project `_ledger/INDEX.md` gets the same check (missing files, duplicates) plus spec pointer rows whose `docs/specs/_ledger/…` target is missing. No new `index-rows.ts`.
- `doctor/gitattributes.ts`: only when `_playbook/settings.md` exists; `git check-attr merge -- <a root spec INDEX> <a */docs/specs INDEX>` must say `union`; no git → skip. Repo-level lines (gitattributes, settings) come **after** spec issues in spec-scoped runs, one line each — update exact-output tests (`hook.test.ts:33`).
- Indented phase lines in `progress.md` dropped by `parsePhaseLines` → warning.
- `create.md` adds both union rules (`docs/specs/**/INDEX.md`, `*/docs/specs/**/INDEX.md`) to `.gitattributes` when missing.

## Hooks
- Shared input: `tools/hooks/hook-input.ts` — `readPayload()`, `writtenPaths(payload)` for Write/Edit/MultiEdit, the fail-open `main()` wrapper, and `sessionMemory(prefix)` moved from `lesson-recall.ts:37-52` (`RecallMemory` → `SessionMemory`; no session id → no memory writes).
- `bash-guard.ts` (new, **PreToolUse**, matcher `Bash`, `if:` pre-spawn filter on commands mentioning `docs/specs`): when the command matches a write signal (the ~8 regexes of CRM `ops/src/hooks/pre-tool-use/protect-generated.ts:13-22`, copied — zero deps) and `git mv|rm|add|commit|checkout|restore|merge` is not the verb, deny with "Use `spec.ts phase tick|deployed|add|split` / `lessons add`, or the Write/Edit tools". Replaces the PostToolUse mtime sweep.
- `spec-file-check.ts`: unchanged matcher (`Write|Edit|MultiEdit`); `_playbook/settings.md` routed to the settings check.
- `context-nudge.ts`: PostToolUse, matcher `Bash|Write|Edit|MultiEdit|Agent`; reads the transcript tail (last 256 KB), skips the first partial line and `isSidechain`/`<synthetic>` entries, last assistant `usage` → `input + cache_read + cache_creation`; ≥ `nudge-at` and not yet nudged → `additionalContext`: "Context ≈ N tokens (nudge-at M). Finish the current TDD cycle, then /spec handoff at the next clean boundary." Silent otherwise.
- `skill-wiring.test.ts:32-34` hook count 2 → 4.

## Mode-file changes
- SKILL.md: parse rules (`:36-49`) rewritten to match *Context parse* 1–3 (kept, not dropped); `:74` reworded (names or changed paths, never branches); `:78`, `execute.md:107` reworded for the nudge (auto-compact may be off — the nudge, not compaction, is the stop signal); `:86` hook coverage; draft wording `:401` → settings; grouped Tools bullets.
- `execute.md`: `:97,147-149` → `phase tick`; `:134` gates wording; `:137` → `settings.pr.draft`; `:150` → `phase add`; after merging main → `gates --name <after-merge-main>`; PR body leads with phase Outcomes; `pr-status` at the gate.
- `update.md`: `:36-49` → `phase tick`/`phase deployed`; §9 → push.
- `handoff.md` §3: after commit → `spec.ts push`, then `publish-docs` when `docs: main`; §4 prints the `Remote:` line.
- `create.md`: `:241-242` draft wording → settings; phase template gains `**Outcome:**`; `.gitattributes` scaffold.
- `review.md:335` → settings.
- SKILL.md *Project ledger → Write path* → write the entry, then `lessons add`.

## Test helpers (new, `tools/tests/`)
- `tree.ts` — temp project/spec builder (`write`, `spec()`, `phase()`, `ledger()`, cleanup), seeded from `graph.test.ts:14-20`.
- `git-repo.ts` — throwaway repo + bare origin + worktree, fixed identity env.
- `stub-runner.ts` — canned `RunResult`s keyed by argv prefix.
- Hook payload + transcript JSONL builders.
- Static gh JSON samples in `tests/fixtures/` (ignored as tests).
