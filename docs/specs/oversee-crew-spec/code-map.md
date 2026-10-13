# Code Map — Oversee Crew

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/oversee-crew.md` | The overseer procedure | 1 |
| `skills/spec/crew-brief.md` | Launch brief template, run-file skeleton, roster-wait script | 1 |
| `skills/spec-oversee-crew/SKILL.md` | Thin skill so `/spec-oversee-crew` dispatches | 1 |
| `skills/spec/tools/launch/background.ts` | `--bg` launch: argv run with cwd, id parse | 1 |
| `skills/spec/tools/pr/actions/hold.ts` | `pr hold`: label + *How to review* via `GhWrites` | 1 |
| `skills/spec/tools/commands/ship.ts` | `spec.ts ship`: lands `ship:` on main | 2 |
| `skills/spec/tools/sessions/agents.ts` | `claude agents --json` + transcript reader | 4 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/execute.md` | §1 push decision, *Crew worker*, §10 answer 4 | `gotcha-execute-section-0-is-skipped-on-the-resume-path` (project) |
| `skills/spec/handoff.md` | §4 crew branch must come first, or workers end on a question | `gotcha-crew-worker-must-not-end-on-a-question` |
| `skills/spec/babysit.md` | hold mode, infra-only deploy, babysitter waits look idle | `gotcha-babysitter-on-pr-wait-is-not-done`, `decision-deploy-babysitting-infra-only` |
| `skills/spec/update.md:49` | "never infer a deploy from a merge" — infra-gate exception | `decision-deploy-babysitting-infra-only` |
| `skills/spec/tools/context/request.ts` | `SUB_COMMANDS`; also feeds launch and `parseLaunchTitle` | |
| `skills/spec/tools/launch/command-line.ts`, `commands/launch.ts` | Launch builder `--bg` extends; babysit `existingOnly` | |
| `skills/spec/tools/playbook/settings.ts`, `doctor/settings.ts` | `deploy:` key; doctor lists gate keys by hand | |
| `skills/spec/tools/core/land-on-main.ts` | Post-merge writes to main (`phase deployed --land`, `ship`) | |
| `skills/spec/tools/trees/find.ts` | A closed claim doesn't block a tree — why parked workers hand off first | `gotcha-babysitter-on-pr-wait-is-not-done` |
| `skills/spec/tools/board/lanes.ts:145` | `next: "execute"` on every row, task phases too | `decision-one-home-per-crew-state` |

## External references

- Claude Code CLI 2.1.296: `claude --bg`, `claude agents --json`, `claude attach|stop|rm` (research waves 2, 2b, 2c)
- Proposal page: https://claude.ai/artifact/95tQfF7VHL6YsfeK37Wh4d
