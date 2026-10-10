---
from: transcript review of the latest 70 CRM Dance sessions (2026-10-07 → 10-10), run from the claude-plugins checkout
created: 2026-10-10T12:36:13-07:00
---

# self-driving-loop — Seed

## Why it branched
Eight agents read 70 CRM sessions looking for chores repeated by hand. Anton approved ideas 1, 2, 3, 4, 5, 8, 9 for the plugin; idea 7 (PR babysit) is its own spec, `pr-babysit`, prepped in parallel. Idea 6 (machine load) is excluded: CRM specs already work on it.

## In the user's words
> "I love ideas 1 2 3 4 5 [7 is HUGELY IMPORTANT …] 8 is a good idea, 9, 10, 11. Not 6 yet, there are specs that are working on it already" (Anton, 2026-10-10)

## The approved ideas, with evidence counts
1. **Auto-chain the next session.** Anton pasted the handoff's "1. <spec> <phase> …" line back with "go" ~35 times and picked #1 almost always; one session idled ~2 h overnight waiting for it. Launched sessions sometimes asked for "go" again. Wanted: handoff launches the same-tree next phase itself; a bare "1" works; launched session starts without confirmation.
2. **Parallel sessions on one spec collide on shared spec files** — `updated:` in `CLAUDE.md`, `in-flight.md`, `pr-opening.md`. publish-docs refused ~10 times; hand-written Python regex merges in ~12 sessions; next session told "merge main first so docs can publish".
3. **Session start/close boilerplate.** Every session retypes `bun …/plugins/cache/…/<version>/…/spec.ts` (stale versions 2.36.7 used after 2.41 shipped); execute/handoff/update mode files `cat`/`sed`-read 76 times; context pack overflows into a tool-results file that must be read back; `board --json` shape guessed wrong in 5+ sessions; `spec.ts`/`spec-bump.sh` say "spec not found" from a subfolder; the same place → claim → gates → fetch/merge-base → merge main → after-merge chain hand-run every time.
4. **Fresh worktrees not ready** (root/ops/websites deps, `tools/migration` bun install, `api/dist` SDK build) in ~15 sessions — already recorded as ledger gotchas, never fixed. Plugin side: placement runs the project's bootstrap without being asked. CRM side: one idempotent ready script.
5. **Merge-main ritual.** Anton typed "merge the latest remote main into the PR … including the migration of the flyway schema" to two sessions a minute apart; duplicate-migration check retyped ~10 times; append-only lock files conflict. Plugin side: one sync step that runs the after-merge gate; board flags PRs far behind main. CRM side: one check script.
8. **Plain-language impact.** ~25 follow-ups like "what is the impact? before and after?", "what will happen after I merge?", "what does that mean: {…}". Wanted: every report opens with impact (measured), what merging does, what's left — internal labels (PR C2, "lease") always glossed.
9. **Don't gate on good defaults.** ~12 "want me to …?" questions answered "yes" (launch next, open PR, review forks). Wanted: apply, list under "say if wrong", ask only real forks.

## Decided
- 7 is a separate spec (`pr-babysit`) and ships first — Anton: "7 needs to be shipped with huge importance".
- 6 excluded (CRM specs own it).
- 10 (bash-guard `grep -r`→`rg` rewrite, CRM api/dist guard false positives) and 11 (stale node@24 PATH line, fixed 2026-10-10) are not plugin work.

## Evidence
- Digests of the 70 sessions: `/private/tmp/claude-501/-Users-antonhaskevych-IdeaProjects-claude-plugins/290a67b0-3454-433f-8bab-19807786261f/scratchpad/digests/` (session-scoped; may be gone — numbers above are the durable record).
- `skills/spec/handoff.md` § Next sessions, `skills/spec/SKILL.md` § Next sessions — today's ask-then-launch flow.
- `skills/spec/tools/publish/publish.ts` — the refusing 3-way merge.

## Open questions
- Should the chain stop at a PR boundary (hand to pr-babysit) or after N phases without Anton?
- Split 4/5 between plugin and CRM: which part is a CRM spec of its own?
