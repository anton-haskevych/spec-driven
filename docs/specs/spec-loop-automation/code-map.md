# Code Map — Spec Loop Automation

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/core/run.ts` | `Runner` seam (argv spawn) + default-branch resolution | 1 |
| `skills/spec/tools/context/request.ts` | Pure `/spec` argument parse: sub-command, name, hint, chunk references | 1 |
| `skills/spec/tools/context/infer-spec.ts` | `specsInPlay`: unnamed execute/resume/status → specs the branch's changes belong to | 1 |
| `skills/spec/tools/tests/git-repo.ts`, `tests/stub-runner.ts` | Real throwaway repos (bare origin + worktree) and canned gh output | 1 |
| `skills/spec/tools/tests/tree.ts` | Temp project/spec builder for writer tests | 2 |
| `skills/spec/tools/core/apply-edits.ts` | `EditPlan` + the only place writers touch disk | 2 |
| `skills/spec/tools/core/checkbox.ts` | Checkbox/evidence patterns shared by writers and doctor | 2 |
| `skills/spec/tools/phases/` | `tick`, `deployed`, `add`, `split` writers + shared `find-phase`, `locate`, `validate` (diff-based checks), `ids`, `template`, `progress-lines`, `move-items`, `review-refs` | 2, 3 |
| `skills/spec/tools/commands/phase.ts` | `phase tick\|deployed\|add\|split` adapter | 2, 3 |
| `skills/spec/tools/core/ledger-index.ts` | One INDEX row parser for spec, project and pointer rows; `insertRow` | 4 |
| `skills/spec/tools/lessons/add.ts` | Lesson bookkeeping after the agent writes the entry | 4 |
| `skills/spec/tools/playbook/settings.ts` | `_playbook/settings.md` parse + defaults | 5 |
| `skills/spec/tools/doctor/settings.ts`, `doctor/gitattributes.ts` | Settings and union-rule checks (only when settings.md exists) | 5 |
| `skills/spec/tools/pr/` | `checks`, `main-compare`, `log-tail`, `render` | 6 |
| `skills/spec/tools/publish/` | `snapshot`, `publish`, `push` | 7 |
| `skills/spec/tools/hooks/hook-input.ts` | Shared hook payload/memory/fail-open wrapper | 8 |
| `skills/spec/tools/hooks/bash-guard.ts`, `hooks/context-nudge.ts` | PreToolUse spec-write deny; PostToolUse context nudge | 8 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/commands/context.ts` | Sub-command parse + pack assembly; `phaseForHint` | `decision-parse-prose-stays-as-fallback.md` |
| `skills/spec/tools/core/spec-folders.ts` | `locateSpecFile` needs absolute paths; gains `isSpecDocPath` | `gotcha-locate-spec-file-needs-absolute-paths.md` |
| `skills/spec/tools/core/phase-title.ts` | `numericPart` → `comparePhaseIds`; callers in `context/ledger-scope.ts`, `graph/relations.ts` | `decision-phase-ids-never-retire.md` |
| `skills/spec/tools/core/progress.ts` | Phase-line reader; deployed suffix only seen right after the pointer | `gotcha-deployed-marker-goes-after-the-pointer.md` |
| `skills/spec/tools/spec.ts` | Switch → command table with derived USAGE | — |
| `skills/spec/tools/commands/gates.ts` | Takes a spec name today; gains `--name` | — |
| `skills/spec/tools/doctor/ledger.ts` | `checkLedgerIndex` — extended for duplicates + project INDEX | — |
| `skills/spec/tools/hooks/spec-file-check.ts`, `hooks/lesson-recall.ts` | Migrate onto `hook-input.ts`; settings.md routing | `decision-bash-writes-denied-not-swept.md` |
| `skills/spec/SKILL.md` | Parse prose, Tools, hook frontmatter, stopping rule | `decision-parse-prose-stays-as-fallback.md` |
| `skills/spec/execute.md`, `update.md`, `handoff.md`, `create.md`, `review.md` | Mode prose calls the new commands | — |

## External references

- `~/IdeaProjects/crm/docs/specs/_ledger/workaround-push-spec-docs-to-main-from-a-worktree.md` — origin of the publish-docs problem (the algorithm is now the snapshot merge)
- `~/IdeaProjects/crm/docs/specs/_ledger/workaround-read-a-failed-job-log-while-the-run-is-still-going.md` — why pr-status uses the jobs-log API
- `~/IdeaProjects/crm/ops/src/hooks/pre-tool-use/protect-generated.ts` — write-signal regexes the Bash guard copies
- `~/IdeaProjects/crm/ops/src/hooks/post-tool-use/checkpoint-reminder.ts` — existing CRM nudge to reconcile in phase 10
- `~/.claude/hooks/REFERENCE.md` — hook events, payloads, `if:` filter
