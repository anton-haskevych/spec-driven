---
needs: []
pr: A
---

# Phase 1 — Context pack always loads

**Goal:** `/spec execute`, `execute phase15`, `execute 3`, `my-spec.` and `x phase 2 execute` all produce the pack whenever exactly one spec is in play; the tool and SKILL.md's parse prose agree.

**Outcome:** Sessions start with their prepared context instead of the agent rebuilding it by hand (5 of those rebuilds errored). No cost; risk is a wrong spec inferred, mitigated by requiring exactly one candidate and saying which one was picked.

**Files to touch:**
- `skills/spec/tools/commands/context.ts` (`parseContextRequest` :24-31, `phaseForHint` :70-74)
- `skills/spec/tools/context/infer-spec.ts` (new)
- `skills/spec/tools/core/run.ts` (new — the `Runner` seam + default-branch resolution, first use)
- `skills/spec/tools/core/spec-folders.ts` (`isSpecDocPath`; `locateSpecFile` needs absolute paths — :14)
- `skills/spec/tools/core/phase-title.ts` (`numericPart` :17-20 → `comparePhaseIds`)
- `skills/spec/tools/context/ledger-scope.ts` (:55-59) and `skills/spec/tools/graph/relations.ts` (:44-48 RANGE parse) — `numericPart` callers
- `skills/spec/SKILL.md` (:36-49 parse prose, :74 wording)
- `skills/spec/tools/tests/context.test.ts`, `tests/stub-runner.ts` (new), `tests/git-repo.ts` (new — shared with phase 7), `tests/skill-wiring.test.ts`

## Implementation guidance

Follow `technical.md` → *Context parse*. Keep `parseContextRequest` pure; inference is a separate step that takes a `Runner`. `context.test.ts:93-101` pins `["checkout"]` → `route/checkout` — that stays true (a plain word that isn't a chunk reference is still a name).

Inference paths come from the **branch's own commits** (`git log --name-only --format= <base>..HEAD`) plus `git status --porcelain -z --untracked-files=all` — not a content diff against the merge-base, which loses the spec once published docs come back through a merge of main. Join every path onto `git rev-parse --show-toplevel` before `locateSpecFile`: its pattern needs a `/` before `docs/specs/`, and git prints repo-relative paths, so root specs would never match. Test with a real `git-repo.ts` repo, not only the stub runner, so realistic relative output is covered. Any git failure → no inference, no pack (fail open, silent). Never read the branch name.

The pack gains `inferred="true"` when the name came from inference; SKILL.md tells the agent to state "Working on `<spec>` (inferred from changed files)" in one line and carry on. Zero or several candidates → one line naming them.

SKILL.md **keeps** its parse rules — they're the no-Bun fallback and the only parse for prep/create/review/update/handoff/list/idea — rewritten to match steps 1–3 of *Context parse*, plus "when a pack is present, its `spec=` is the resolved spec". Keep the sub-command set line, dispatch table and `argument-hint` (pinned by `skill-wiring.test.ts:81-93`). Reword `:74`: a session is tied to a spec by its invoked name or, when unnamed, by the one spec its changed files belong to — never by branch or worktree.

`comparePhaseIds(a, b)` orders dotted parts numerically (`9.10` after `9.9`) and letter suffixes after their number (`7` < `7a` < `7b` < `8`); `phaseMatches` and the relations RANGE filter move onto it and `numericPart` is deleted.

## Deliverables

- [x] `core/run.ts` `Runner` + `systemRunner` + default-branch resolution; `tests/stub-runner.ts`; `tests/git-repo.ts`
- [x] Parse: strip trailing punctuation; last-token form keeps middle tokens as hint
- [x] Parse: chunk reference in the name slot becomes the hint (`phase15`, `phase-3`, `3`, `7ab`, `next`, `phase 3a`); `phaseForHint` strips `/^phase[-\s]*/i`
- [x] `inferSpec` from branch-commit + porcelain paths joined to the repo root; exactly-one rule; git failure → undefined (real-repo test incl. a merge of main)
- [x] `contextPack` uses inference for resume/status/execute when unnamed; `inferred="true"`; candidates line on 0/≥2
- [ ] `comparePhaseIds` (dots + letters) replaces `numericPart` in ledger-scope and relations; range and `[phase N+]` tests
- [ ] SKILL.md parse prose aligned (kept) and `:74` reworded; wiring tests green

## Phase-local notes

The `!` injection shape must stay as PR #2 left it (no `&&`/`||` around the here-doc).
