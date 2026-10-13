---
needs: [1]
code: false
---

# Phase 6 — CRM adoption

**Goal:** CRM runs on the crew:
- its infra paths and their deploy gate are declared once
- its active specs have ship modes
- its Academy phases that need Anton carry gate markers
- a first full crew run on CRM lanes is done, with its lessons recorded

**Outcome:** Your CRM lanes run without you relaying, re-confirming or watching babysitters; you answer questions and review held PRs · edits in the CRM repo, each confirmed with you · risk: the deploy gate must match how CRM really deploys, so it starts from what the Oct 11 babysitters did and you confirm it.

**Files to touch:**
- CRM `docs/specs/_playbook/gates.md` (`## deploy`), CRM `docs/specs/_playbook/settings.md` (`deploy: { paths, gate }`, later `crew:`)
- CRM specs' `CLAUDE.md` (`ship:`), Academy phase files (`gate:`)

## Implementation guidance

A task phase: each item is done with Anton and ticked with evidence (a CRM commit, a run
date). Nothing is written into CRM that Anton didn't confirm.

Deploy babysitting covers infra only (Anton, 2026-10-12). Non-infra CRM merges deploy on
their own and the babysitter stops at merge. Propose `deploy.paths` (Anton confirms which
paths count as infra; don't guess). The gate starts from what the Oct 11 babysitters did by
hand (research `wave-0`):
- diff each stack from `origin/main` and name every change as this PR or other undeployed main code
- stop and ask if the diff holds more than this PR
- deploy `crm-prod` before satellite stacks

Its last check must prove the deploy (stack status or a canary), so babysit can mark the
phases deployed. Anton edits it before it lands.

Ship modes: one confirmation per spec, e.g. `hold-for-review` for UI-heavy specs and `auto`
for backend refactors and lint rules.

Gate markers need phase 3's release installed. Item 6.3 waits for it.

## Deliverables

- [ ] 6.1 CRM `deploy: { paths, gate }` (infra paths) and `gates.md` `## deploy` ending in a checkable deployed line, confirmed by Anton
- [ ] 6.2 `ship:` on CRM's active specs, confirmed by Anton per spec
- [ ] 6.3 `gate:` markers on the Academy phases that need Anton (after phase 3 is installed)
- [ ] 6.4 First full crew run on CRM lanes; lessons recorded in the ledger

## Phase-local notes

- Memory rule: never invent CRM settings or setup requirements; every CRM change here is
  proposed to Anton and lands only on his word.
