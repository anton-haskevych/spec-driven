# Code Map — Oversee Crew

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/oversee-crew.md` | The overseer procedure | 1 |
| `skills/spec/crew-brief.md` | Launch brief and run-file shapes; points at the crew commands | 1, 4 |
| `skills/spec-oversee-crew/SKILL.md` | Thin skill so `/spec-oversee-crew` dispatches | 1 |
| `skills/spec/tools/launch/background.ts` | `--bg` launch: argv run with cwd, id parse | 1 |
| `skills/spec/tools/pr/actions/hold.ts`, `commands/pr/hold.ts` | `pr hold`: label + *How to review* via `GhWrites` (`body`/`setBody`/`label`) | 1 |
| `skills/spec/tools/phases/deployed-land.ts` | `phase deployed --land`: marker on origin's main through `landOnMain` | 1 |
| `skills/spec/tools/tests/fixtures/claude-bg-stdout.txt` | Real `claude --bg` output, service-start line included | 1 |
| `skills/spec/tools/commands/ship.ts` | `spec.ts ship`: lands `ship:` on main | 2 |
| `skills/spec/tools/sessions/agents.ts`, `sessions/transcript.ts` | `claude agents --json` reader; a session's last turn (the `Crew:` line) | 4 |
| `skills/spec/tools/crew/` | Pure crew logic: `run-state.ts` (run.md read/write), `overseer.ts` (follows a parked tab), `roster.ts`, `close-out.ts`, `crew-line.ts`, `tick-step.ts`, `pick.ts`, `brief.ts`; `close-out-run.ts` gathers close-out facts (git, claims by key) | 4 |
| `skills/spec/tools/commands/crew.ts`, `commands/crew/*` | `spec.ts crew overseer\|start\|wait\|check\|launch\|tick`; `launch-session.ts` is brief + placement + `--bg` + `## Launched`; `tick.ts` composes it all behind injectable ports | 4 |
| `skills/spec/tools/launch/place-for-launch.ts` | Placement step shared by `launch` and `crew launch` | 4 |
| `skills/spec/tools/core/gate.ts`, `doctor/phase-gates.ts` | `gate: design \| outward` kinds and `Gate:` items; the doctor/spec-file check | 3 |
| `skills/spec/tools/core/park.ts`, `phases/park.ts` | Park entries under `## Needs you` in `in-flight/phase-<id>.md`; `phase park` / `phase unpark` | 3 |
| `skills/spec/tools/board/parked.ts` | Parked phases (worktree copy before base): out of ready, `question` needs-you rows | 3 |
| `skills/spec/tools/core/markdown-sections.ts` | `## <heading>` section read/replace, shared by the run file and park entries | 3 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/execute.md` | §1 push decision, *Crew worker*, §10 answer 4 | `gotcha-execute-section-0-is-skipped-on-the-resume-path` (project) |
| `skills/spec/handoff.md` | §4 crew branch must come first, or workers end on a question | `gotcha-crew-worker-must-not-end-on-a-question` |
| `skills/spec/babysit.md` | hold mode, an approved PR is auto, infra-only deploy, babysitter waits look idle | `gotcha-babysitter-on-pr-wait-is-not-done`, `decision-deploy-babysitting-infra-only` |
| `skills/spec/update.md:49` | "never infer a deploy from a merge" — infra-gate exception | `decision-deploy-babysitting-infra-only` |
| `skills/spec/tools/context/request.ts` | `SUB_COMMANDS`; also feeds launch and `parseLaunchTitle` | |
| `skills/spec/tools/launch/command-line.ts`, `commands/launch.ts` | Launch builder `--bg` extends; babysit `existingOnly` | |
| `skills/spec/tools/playbook/settings.ts`, `doctor/settings.ts` | `deploy:` key; `pr.ship`, `crew:` (caps, `self-approve`); doctor lists gate keys by hand and errors on unknown self-approve kinds | 5 |
| `skills/spec/tools/core/land-on-main.ts` | Post-merge writes to main (`phase deployed --land`, `ship`) | |
| `skills/spec/tools/trees/find.ts` | A closed claim doesn't block a tree — why parked workers hand off first | `gotcha-babysitter-on-pr-wait-is-not-done` |
| `skills/spec/tools/board/joins.ts` (`prNext`), `board/attention.ts`, `board/render.ts` (`attentionCells`) | Held PR review state → needs-you kinds; exhaustive render switch | `decision-review-state-comes-from-the-pr` |
| `skills/spec/tools/board/lanes.ts:145` | `next: "execute"` on every row, task phases too | `decision-one-home-per-crew-state` |

## External references

- Claude Code CLI 2.1.296: `claude --bg`, `claude agents --json`, `claude attach|stop|rm` (research waves 2, 2b, 2c)
- Proposal page: https://claude.ai/artifact/95tQfF7VHL6YsfeK37Wh4d
