---
needs: [7]
code: false
---

# Phase 8 — CRM adopts PR babysit

**Goal:** CRM's settings, triage gate, rules and Anton's saved memories match the new PR step, and the first CRM PR is babysat to merged.

**Outcome:** In CRM, every finished PR gets the one question and babysits itself to merged, with website previews never blocking and the project's own triage steps used · small · risk: an old rule or memory telling agents "never merge / never watch CI" — all of them are updated here.

**Files to touch (in `~/IdeaProjects/crm`):**
- `docs/specs/_playbook/settings.md` — `pr.merge: merge`, `checks.external: ["Vercel*"]`, `gates: { ci-triage: ci-triage }`
- `docs/specs/_playbook/gates.md` — new `## ci-triage` section
- `.claude/rules/git-workflow.md`, `.claude/rules/e2e-debugging.md`
- `~/.claude/projects/-Users-antonhaskevych-IdeaProjects-crm/memory/` — `feedback_no_babysitting_ci_deploy_verification.md`, `feedback_pr_ready_is_antons_call.md`, `feedback_merge_decisions_are_antons.md`

## Implementation guidance

CRM settings live on main (`docs: main`): land the settings and gates edits through a docs commit to main, the way phase 6 of `active-work-view` seeded focus. The `ci-triage` gate lists the steps that worked in the transcripts (wave 1 → "What actually happened"): `pnpm -C ops e2e:debug --pr <n>`, `e2e:log-summary --run`, `e2e:artifacts` (fallback `gh run download -n e2e-results`), the cross-run collision check, the already-fixed-on-main check (`git rev-list --count HEAD..origin/main`, `git log origin/main -- <path>`; history, not ancestry), reproduce locally with the one test.

`git-workflow.md:3-4` changes from "never merge to main" to "merge only on the user's yes to the PR question (babysit or merge now)". `e2e-debugging.md:78` already matches the strict flake rule; add one line pointing at `pr rerun`'s infra-only scope (cancelled-by-timeout is not infra). The three memories get a superseding line naming the question as the explicit instruction (Anton's words, 2026-10-10).

## Deliverables

- [ ] CRM `settings.md` + `gates.md` landed on main — evidence: commit link
- [ ] `git-workflow.md` and `e2e-debugging.md` updated — evidence: commit link
- [ ] Three CRM memories updated to the question — evidence: file paths
- [ ] First CRM PR babysat to merged — evidence: PR link + `pr log` excerpt
