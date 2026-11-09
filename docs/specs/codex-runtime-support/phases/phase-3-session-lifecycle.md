---
needs: [2b, 4]
pr: C
---

# Phase 3 — Normal launches, next sessions and spin-offs

## Outcome

Codex can open the correct fresh interactive session from next-session suggestions, spin-offs and PR handoffs. Claude keeps its terminal behavior. Normal launching no longer waits for managed background-worker recovery.

## Files to touch

runtime/claude and runtime/codex normal launch binding; launch/command-line and terminal; commands/launch; canonical next-session, spin-off and babysit bindings; focused launch fixtures.

## Deliverables

- [ ] Add native normal launch plans with canonical skill/request binding, explicit cwd, safe arguments and configured model/permissions; retain Claude command goldens and terminal selection.
- [ ] Deliver Anton's approved launch DX: a thin `spec` command over existing entry/launch composition, initiating-host default, and automatic candidate/source discovery without manual shell setup. Preserve explicit override/refusal semantics and add no framework.
- [ ] Extract launchCommand's remaining oversized dependency signature before provider injection, reusing existing Runner and terminal acknowledgement.
- [ ] Route next-session suggestions/replies, prep spin-offs and normal babysitter launches through the selected host; preserve target selection, owner filtering, existing-only PR trees, busy refusal and fresh-session stop rules.
- [ ] Check native capabilities before placement/brief/launch side effects and verify that the intended candidate/current release and assigned spec/phase/cwd reach the fresh session.
- [ ] Add normal-launch, busy-tree, failure and no-duplicate-on-ambiguous-terminal-result coverage plus Claude regressions. Normal acknowledgement never fabricates a managed WorkerHandle.

## Implementation guidance

Keep normal launch planning separate from worker lifecycle. Reuse shared terminal plans and safe argument rendering; native binding translates syntax and tool mechanics only. Do not translate Claude model names/permission flags into guessed Codex equivalents.

Anton approved the thin command, same-host default and automatic discovery as later launch scope on 2026-11-09. This is the scoped exception to the earlier agentic-only/no-new-command preference: routine setup stays agent-operated. Reuse the existing dispatcher, entry and terminal mechanisms; do not add a provider/discovery framework. Phase 2 keeps its explicit, restricted bootstrap until this launch work is implemented and accepted.

A launch must use authoritative phase/PR-group metadata. A replan only on this branch does not update origin/default placement. Continue in the explicitly assigned implementation tree until metadata is published through the authorized existing process; never auto-launch a stale regrouped phase.

Real terminal and fresh-session checks are scoped PR gates in ../pr-opening.md. Background creation, durable workers and crew remain required in Phase 3b.
