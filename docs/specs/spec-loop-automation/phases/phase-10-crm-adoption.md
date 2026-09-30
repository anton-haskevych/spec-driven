---
needs: [1, 2, 3, 4, 5, 6, 7, 8, 9]
code: false
---

# Phase 10 — CRM adoption

**Goal:** CRM declares its loop rules through the new mechanisms, so its sessions stop improvising them.

**Outcome:** In CRM, INDEX conflicts disappear, PRs open ready with CI, spec docs publish to main automatically, and after-merge steps are one list. Needs the released plugin version; config only.

**Files to touch (in `~/IdeaProjects/crm`):**
- `.gitattributes` (new)
- `docs/specs/_playbook/settings.md` (new)
- `docs/specs/_playbook/gates.md` (new)
- `docs/specs/_playbook/page.md` (new tag playbook)
- `.claude/rules/git-workflow.md` (reconcile with settings)
- `docs/specs/_ledger/workaround-push-spec-docs-to-main-from-a-worktree.md` (`enforced-by:`)

## Implementation guidance

Settings (Anton's decisions, 2026-09-30): `docs: main`, `pr.draft: false`, `pr.merge: squash`, `checks.external: ["Vercel*"]`, `gates.after-merge-main: merge-main`, `gates.bootstrap: bootstrap`, `nudge-at: 500000`.

`gates.md` sections — lift, don't invent (sources in `research/2026-09-30-wave-1-loop-mechanics.md` → *CRM prior art*):
- per target, named after the CI filter outputs (`ci.yml:70-80`): backend, frontend, api, landing, websites, infra, ops, hooks;
- `merge-main`: `pnpm install` → `api:regen` if OpenAPI changed → Modulith export if `backend/` changed (revert order-only churn) → route lock ×2 after regen → typecheck every touched subproject;
- `bootstrap`: `pnpm install` → `pnpm api:build`; ports stay with `pnpm dev:all --auto-port`.

`page.md`: `match: { scope: [uiux-design] }`; core from `growth.md:37-43` (`/seo` search-intent brief → `page-design` showcase round), under 60 lines.

`git-workflow.md`: ready PRs (CI runs), merge is Anton's call via squash, CI checked on request, spec docs to main through publish-docs. Don't bulk-migrate existing specs or lessons.

## Deliverables

- [ ] `.gitattributes` union rule committed (evidence: commit sha)
- [ ] `_playbook/settings.md` with the decided values (evidence: sha; `spec.ts settings` output)
- [ ] `_playbook/gates.md` targets + merge-main + bootstrap (evidence: sha; `spec.ts doctor` clean on settings)
- [ ] `_playbook/page.md` tag playbook (evidence: sha)
- [ ] `git-workflow.md` reconciled; workaround lesson `enforced-by:` set (evidence: sha)
