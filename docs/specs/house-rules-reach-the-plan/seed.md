---
from: CRM Dance spec manager-role, phase 2 task 2.9 (repo ~/IdeaProjects/crm, branch feat/manager-role-pr-b)
from-session: 06a0ac41-ba03-405a-8a94-4044accccca1
created: 2026-11-15T21:39:55-08:00
---

# house-rules-reach-the-plan — Seed

## Why it branched
In CRM, `/spec execute manager-role 2` built a view field `@Nullable String cannotManageReason` where CRM's house
refusal contract requires `@Nullable RefusalView <action>Refusal`. Recon and preflight both missed the rule. Cause in
the plugin: the execute pack cut `docs/specs/_playbook/engineering.md` mid-table two rows before the "Errors" row,
and preflight's Stage 1 never reads the playbook. Anton caught it after the code was written.

## In the user's words
> "I would like to have a hook for claude code or integration with the spec that could tell you about that rule before you build stuff or catch you when you are making an error rather then after the fact." (Anton, 2026-11-15)
> "We need to enforce these error handling rules and prevent possible mistakes like you just did from happening again" (Anton, 2026-11-15)
> "spin out that spec prep with the right worktree so taht the repo for the plugin itself could take care of that thing" (Anton, 2026-11-15)

## Decided
- CRM-side enforcement (ast-grep, ArchUnit, ESLint, a feature map, the missing playbook row) is CRM's manager-role
  phase 2a, not this spec · Anton
- Proposed scope for this spec (recommended, unconfirmed; prep validates):
  1. Never prefix-clip a playbook: the pack shows it whole, or a complete index (every heading, one line per table
     row: the rule shortened plus where its text lives), budgeted by whole lines like the ledger block. Same for
     `spec.ts playbooks` (prep, create, review read it). Doctor measures characters, not lines.
  2. Preflight Stage 1 reads the rule index and outputs a required "House rules against <unit>" table: each row that
     touches the chunk, its canonical doc actually opened, verdict, consequence; rows that don't apply are counted.
     execute.md hands preflight the playbook alongside principles.md.
  3. After recon, execute runs `spec.ts lessons recall <seam files>` and hands the top five to preflight.
- Rejected: keyword/concern matching (the task text "the web's 'Only … can change' sentence comes from the server"
  contained none of refusal/reason/disabled; "reason" also hits stored facts); row-level `paths:` on playbook rows
  (second path matcher beside lessons; nobody would have tagged the Errors row with view paths); changing lesson
  graduation (after the fact by design) · recommended, unconfirmed
- Keep: a plain session with no /spec gets ~zero extra context; domain-free; value first

## What manager-role needs
Nothing blocking: a side discovery. CRM's phase 2a closes the refusal case in code; this closes the class.

## Evidence
- `research/2026-11-15-wave-0-playbook-clip-and-preflight.md` — the clip chain, preflight gap, recall reach
- CRM `docs/specs/manager-role/research/phase-2/2026-11-15-2.9-preflight.md` § Correction — the miss as recorded
- CRM `docs/specs/manager-role/research/phase-2a/2026-11-15-wave-0-enforcement.md` — all three reviewers
- CRM `docs/specs/_playbook/engineering.md` (8.8 KB, 55 lines) — the playbook that was cut

## Open questions
- Index budget: ~6000 characters (the ledger's) or per-project setting? Prep measures real playbooks across repos.
