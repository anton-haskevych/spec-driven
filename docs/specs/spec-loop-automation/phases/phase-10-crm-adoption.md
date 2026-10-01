---
needs: [1, 2, 3, 4, 5, 6, 7, 9]
code: false
---

# Phase 10 — CRM adoption

**Goal:** CRM declares its loop rules through the new mechanisms, so its sessions stop improvising them.

**Outcome:** In CRM, INDEX conflicts disappear, PRs open ready with CI, spec docs publish to main automatically, and after-merge steps are one list. Needs the released plugin version; config only.

**Files to touch (in `~/IdeaProjects/crm`):**
- `.gitattributes` (new — both union rules)
- `docs/specs/_playbook/settings.md` (new)
- `docs/specs/_playbook/gates.md` (new)
- `.claude/rules/git-workflow.md` (reconcile with settings)
- `docs/specs/_ledger/workaround-push-spec-docs-to-main-from-a-worktree.md` (`enforced-by:`)

## Implementation guidance

Settings (Anton's decisions, 2026-09-30): `docs: main`, `pr.draft: false`, `pr.merge: squash`, `checks.external: ["Vercel*"]`, `gates.after-merge-main: merge-main`, `gates.bootstrap: bootstrap`.

`.gitattributes`: `docs/specs/**/INDEX.md merge=union` **and** `*/docs/specs/**/INDEX.md merge=union` — CRM has 16 `landing/docs/specs` specs (11 with ledgers). Verify with `git check-attr merge` on one of each.

`gates.md` sections — lift, don't invent (sources in `research/2026-09-30-wave-1-loop-mechanics.md` → *CRM prior art*):
- per target, named after the CI filter outputs (`ci.yml:70-80`): backend, frontend, api, landing, websites, infra, ops, hooks;
- `merge-main`: `pnpm install` → `api:regen` if OpenAPI changed → Modulith export if `backend/` changed (revert order-only churn) → route lock ×2 after regen → typecheck every touched subproject;
- `bootstrap`: `pnpm install` → `pnpm api:build`; ports stay with `pnpm dev:all --auto-port`.

`git-workflow.md`: ready PRs (CI runs), merge is Anton's call via squash, CI checked on request, spec docs to main through publish-docs (a feature branch gains a no-op `docs(spec): snapshot` merge per publish — expected). Don't bulk-migrate existing specs or lessons.

`enforced-by:` must resolve inside CRM (`doctor/project-lesson.ts:25-28` resolves against the project), so point it at `docs/specs/_playbook/settings.md` (its `docs: main` key), not the plugin's code.

The `_playbook/page.md` tag playbook from the draft is out of this spec's scope — capture it with `/spec idea` in CRM instead.

## Deliverables

- [ ] `.gitattributes` union rules committed (evidence: commit sha; `git check-attr` output)
- [ ] `_playbook/settings.md` with the decided values (evidence: sha; `spec.ts settings` output)
- [ ] `_playbook/gates.md` targets + merge-main + bootstrap (evidence: sha; `spec.ts doctor` clean on settings)
- [ ] `git-workflow.md` reconciled (evidence: sha)
- [ ] Workaround lesson `enforced-by: docs/specs/_playbook/settings.md` (evidence: sha; doctor clean)
