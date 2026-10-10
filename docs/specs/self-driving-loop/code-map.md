# Code Map — Self-Driving Loop

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/tests/spec-bump.test.ts` | `spec-bump.sh` resolution from subfolders | 4 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/SKILL.md` | *Next sessions*, new *Reports* / *Say if wrong*, in-flight and pr-opening semantics, Timestamps; also edited by pr-babysit phase 7 | `decision-review-follows-create` |
| `skills/spec/execute.md` | §3 preflight take-back, :22, §6, §10 PR line; pr-babysit phase 7 rewrites §10 | `decision-pr-link-stays-in-spec-state` |
| `skills/spec/handoff.md` | in-flight writes, report header, *Next sessions* pointer; pr-babysit phase 7 edits it | `decision-in-flight-one-file-per-phase` |
| `skills/spec/update.md` | §7 bump, report, Spec-state refresh | |
| `skills/spec/create.md` | *After writing* → review row | `decision-review-follows-create` |
| `skills/phase-preflight/SKILL.md` | *Defaults applied* / *Forks for you* split | |
| `skills/spec/tools/board/model.ts` | `ReadyRow.title`, `NextStep` + review, `BOARD_VERSION` | |
| `skills/spec/tools/board/lanes.ts` | stage rows (`stageLanes`), review row | |
| `skills/spec/tools/commands/context.ts` | `OFFER_TOP_READY` string the pack prints | |
| `skills/spec/tools/pr/resolve.ts` | reads `PR #n` from Spec state; why the PR line stays | `decision-pr-link-stays-in-spec-state` |
| `skills/spec/tools/core/spec-state.ts` | reads in-flight | `decision-in-flight-one-file-per-phase` |
| `skills/spec/tools/context/packs.ts` | `inFlightBlock`, `projectLessonsBlock`, budgets | |
| `skills/spec/tools/doctor/phases.ts` | `checkInFlight` | |
| `skills/spec/tools/core/spec-folders.ts` | `findProjectDir` beside `TOP_SPEC_ROOT` | `decision-project-dir-is-outermost-docs-specs` |
| `skills/spec/tools/spec.ts` | `run(argv, projectDir)` entry | |
| `skills/spec/tools/hooks/lesson-recall.ts`, `hooks/spec-file-check.ts` | resolve from `payload.cwd` | `decision-project-dir-is-outermost-docs-specs` |
| `skills/spec/scripts/spec-bump.sh` | bash walk, name branch | |
| `skills/spec/tools/tests/skill-wiring.test.ts` | prose pins; pr-babysit pins here too | |
| `skills/spec/tools/tests/context.test.ts` | pack expectations; pr-babysit edits it too | |

## External references

- `docs/specs/pr-babysit/design.md:47-48` — the one-list rule (pr-babysit owns it)
