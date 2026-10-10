---
needs: [3, 4, 5, 6]
pr: A
---

# Phase 7 — The question and the babysit procedure

**Goal:** At PR-ready time execute §10 and handoff ask the one question and act on it; `/spec babysit <spec> [<group>]` runs the written procedure in its own tab, holding the tree with a PR claim; release 2.42.0.

**Outcome:** You answer one question per PR; a babysit tab carries it to merged and tells you once — no more pasting failing checks or watching CI · medium · risk: prose drift between execute, handoff and babysit — one procedure file, linked from both.

**Files to touch:**
- `skills/spec/babysit.md` (new), `skills/spec-babysit/SKILL.md` (new router)
- `skills/spec/SKILL.md`, `skills/spec/execute.md` (§10), `skills/spec/handoff.md`
- `skills/spec/tools/context/request.ts`, `launch/command-line.ts`, `commands/launch.ts`
- `skills/spec/tools/claims/store.ts`, `claims/rules.ts`, `trees/place.ts` (if it filters claim ids)
- `README.md`, `ROADMAP.md`, `.claude-plugin/plugin.json` and the other version files (`scripts/version.py`)
- tests: `skill-wiring.test.ts`, `launch.test.ts`, `claims-*.test.ts`, `request.test.ts`

## Implementation guidance

`babysit.md` is the single written procedure: claim → `pr open` (unless open and ready) → `pr wait` in background Bash → on the notification, `pr status` → act by the design.md flow → loop → `pr merge` → `pr log` → final report (design.md copy) → release the claim. Limits: 2 reruns per commit (tool-enforced), 3 fix pushes, 3 hours. Rules it must state: never push docs while CI runs; fixes go through the per-commit gate; for a test failure run the project's `pr.triage` gate first; merging main runs `gates.after-merge-main`; write a `pr log --add` line for each triage decision; stop and ask when the cause isn't clear.

The question lives in execute §10 and handoff with the exact copy from design.md; both link `babysit.md` instead of repeating it. Remove "never merge on your own" and "never waits" from execute §10; SKILL.md Tools → Remote describes the `pr` group.

`babysit` joins `SUB_COMMANDS`; the wiring test pins the sub-command set, Dispatch row, argument-hint and the router. `launch babysit <spec> [<group>]` places the tree by the group's branch and opens the session there.

PR claims: `claim take <spec> pr-<group>`; done when that PR is merged or closed; `trees place` treats a live PR claim like a phase claim.

## Deliverables

- [ ] `pr-<group>` claims: store accepts them, rules mark them done on merged/closed PR, place refuses a tree with a live one — tests
- [ ] `babysit` sub-command: `SUB_COMMANDS`, SKILL.md set/Dispatch/argument-hint, `skills/spec-babysit/SKILL.md` router; `skill-wiring.test.ts` green
- [ ] `launch babysit <spec> [<group>]` places by group branch and launches — tests; one read-only live launch check (ledger `spec-spin-off/domain-verifying-a-terminal-launch`)
- [ ] `skills/spec/babysit.md` procedure (flow, limits, rules, report copy)
- [ ] execute §10 + handoff ask the question and act on each answer; SKILL.md Remote rewritten; old "never merge"/"never waits" lines gone
- [ ] README rows, ROADMAP section + 2.42.0 row, `python3 scripts/version.py --set 2.42.0`

## Phase-local notes

- The first real babysit is this PR itself (pr-opening.md pre-PR checks).
