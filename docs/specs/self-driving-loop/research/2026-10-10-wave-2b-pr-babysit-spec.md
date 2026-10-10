---
date: 2026-10-10
wave: 2b
lens: implementation
slug: pr-babysit-spec
brief: product-brief.md
---

# Recon Wave 2b — the written pr-babysit spec

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Wave 2 §5 and the craft decisions 2–4 were based on pr-babysit's **prep research**. pr-babysit has since been written: commit 77bcb90, status `draft`, 8 phases, under review. This addendum re-reads that spec. Paths are relative to `docs/specs/pr-babysit/` unless written in full. The review may still change these lines, so `create` re-checks them.

## Verified: what pr-babysit now owns

- **The PR question at PR-ready time.** It is asked from execute §10 and handoff, with three numbered answers: `1. Babysit it`, `2. Draft`, `3. Merge now` (design.md § The question). Answer 1 runs `launch babysit <spec> <group>`, then this session hands off.
- **`babysit` sub-command and `launch babysit <spec> [<group>]`.** It joins `SUB_COMMANDS` (`context/request.ts:9`) and places the tree by `feat/<spec>-pr-<group>` (technical.md:25; phase 7). This is the launch target for "PR gate" rows. **This spec adds no gate row kind.**
- **PR claims** `<spec>#pr-<group>`, and `trees place` refuses a tree that has a live PR claim (phase 7).
- **Spec state writer.** `pr/record.ts` is an `EditPlan` writer that appends `PR #<n>` + URL on open (technical.md:92, phase 4) and `PR #921 merged 2026-10-10 as 9b0c1d2 (merge).` on merge (technical.md:104-112, phase 5). `SPEC_STATE`/`PR_LINK` move to `core/spec-state-section.ts` (phase 4). `pr status <spec>` reads the PR number from Spec state (technical.md:11).
- **No docs pushes while CI runs.** The merge record is written after merge (design.md Key decisions; phase 7 rules).
- **Merging main inside the babysit flow.** On `conflicting`, `failsOnMain` or `fixedOnMain`: merge main, run `gates.after-merge-main`, push (design.md flow; phase 7 rules). `fixedOnMain` uses `rev-list --count HEAD..origin/<default>` (technical.md:74).
- **Phase 1 changes.** It promotes `sequencedRunner` into `tests/stub-runner.ts`. It gives the board's `PrCell` a shared verdict, and possibly a status (phase-1 lines 15, 21, 27, 30), re-pinning `board-joins`, `board-render` and `board-attention` goldens.
- **The babysit tab's final report** is already plain-words and impact-first: `Merged PR #921 … · 52 min`, then Fixed / Re-ran / `On merge: main deploys the staff app` / Next (design.md).
- **Babysit log.** `<git-common-dir>/spec-driven/babysit/pr-<n>.jsonl`, a per-clone, never-committed home. It sits next to where this spec's printed-rows store would go.
- **Ships first.** pr-babysit releases 2.42.0 (phase 7), per the seed: "7 needs to be shipped with huge importance".

## What this changes in self-driving-loop's decisions

1. **Spec state (craft decision 2): withdrawn.**
   - Don't derive the whole section. pr-babysit's tool-written PR and merge lines stay.
   - This spec removes only the **hand-refreshed summary prose** (execute.md:117,156, update.md:175, handoff.md:20: phases done/left, branch). That prose is what collided and drifted.
   - "Phases done/left" is shown by status and the board instead.
   - Risk for pr-babysit's review: two PR groups of one spec append to the same section from different branches. Git conflicts on adjacent appended lines, and union merge is ignored on GitHub (`spec-loop-automation/ledger/gotcha-github-ignores-merge-union.md`).
2. **Sync while babysitting (craft decision 3): resolved by composition.**
   - `spec.ts sync` merges main locally, resolves spec-doc conflicts, and lists code conflicts and the after-merge gate. It **never pushes**.
   - The babysit procedure can call it for its "merge main" step and push when it decides.
   - The close step must skip docs publishing while a PR claim is live or the PR's checks run. That rule already exists in pr-babysit.
3. **Gate rows (craft decision 4): confirmed.** They go to `launch babysit`.
4. **New collision: numbered answers.**
   - At PR-ready time, handoff prints pr-babysit's question (`1. Babysit / 2. Draft / 3. Merge now`), and then *Next sessions* (`1. <spec> <phase> …`).
   - A bare "1" — this spec's one-word pick — is then ambiguous.
   - Needs one rule across both specs: one numbered list per message.
5. **Shared files and order.** Both specs edit:
   - SKILL.md (*Next sessions*, Tools)
   - handoff.md
   - execute.md §10
   - `launch/command-line.ts`, `commands/launch.ts`, `context/request.ts`
   - `board/model.ts` `PrCell`, `board/attention.ts`
   - `tests/skill-wiring.test.ts`, `launch.test.ts`

   self-driving-loop phases that touch these declare `needs: [pr-babysit#<n>]` (7 for launch and the mode prose, 1 for board PR cells). They don't land alongside.
6. **Reuse instead of re-doing.** This spec skips:
   - `sequencedRunner` (pr-babysit phase 1)
   - the `SPEC_STATE` lift (phase 4)
   - the PR-cell verdict (phase 1)

   The behind-main count joins the PR cell after phase 1.

## Side finding

`spec.ts claim list` fails in this checkout with `ENOENT … .git/spec-board/base/<sha>/docs/specs/pr-babysit/`. The board's base cache is pinned to origin/main, which doesn't have pr-babysit yet (local main is 4 ahead). A spec that exists only locally breaks a command that shouldn't need it. Not in this spec's scope; record it as a backlog idea or a pr-babysit review finding.

## Still open

- **Numbered-answers rule** (item 4): a cross-spec call for Anton.
- **Re-check after pr-babysit's review lands:** Spec state record shape, the `babysit` sub-command, PrCell changes.
