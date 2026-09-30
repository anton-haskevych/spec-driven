---
needs: []
pr: A
---

# Phase 1 — Context pack always loads

**Goal:** `/spec execute`, `execute phase15`, `execute 3`, `my-spec.` and `x phase 2 execute` all produce the pack whenever exactly one spec is in play; the parse rule lives only in `context.ts`.

**Outcome:** Sessions start with their prepared context instead of the agent rebuilding it by hand (5 of those rebuilds errored). No cost; risk is a wrong spec inferred, mitigated by requiring exactly one candidate.

**Files to touch:**
- `skills/spec/tools/commands/context.ts` (`parseContextRequest` :24-31, `phaseForHint` :70-74)
- `skills/spec/tools/context/infer-spec.ts` (new)
- `skills/spec/tools/git/run.ts` (new — the `Runner` seam, first use)
- `skills/spec/tools/core/phase-title.ts` (`numericPart` :17-20)
- `skills/spec/SKILL.md` (:36-49 parse prose, :74 wording)
- `skills/spec/tools/tests/context.test.ts`, `tests/stub-runner.ts` (new), `tests/skill-wiring.test.ts`

## Implementation guidance

Follow `technical.md` → *Context parse*. Keep `parseContextRequest` pure; inference is a separate step that takes a `Runner` so tests stub git. `context.test.ts:93-101` pins `["checkout"]` → `route/checkout` — that stays true (a plain word that isn't a chunk reference is still a name).

Inference: `git merge-base HEAD origin/HEAD` (fall back to `origin/main`, then skip) → `git diff --name-only <base>` + `git status --porcelain` → `locateSpecFile` → distinct names not starting with `_`. Any git failure → no inference, no pack (fail open, silent). Never read the branch name.

SKILL.md: keep the sub-command set line, dispatch table and `argument-hint` (pinned by `skill-wiring.test.ts:81-93`); replace the matching-rule prose with "the pack's `spec=` attribute is the resolved spec; if no pack, infer the name from the conversation and confirm only if ambiguous". Reword `:74`: a session is tied to a spec by its invoked name or, when unnamed, by the one spec its changed files belong to — never by branch or worktree.

`numericPart("9.10")` must sort after `9.9` — compare dotted parts numerically.

## Deliverables

- [ ] `git/run.ts` `Runner` + `systemRunner`; `tests/stub-runner.ts` with argv-prefix canned results
- [ ] Parse: strip trailing punctuation; last-token form keeps middle tokens as hint
- [ ] Parse: chunk reference in the name slot becomes the hint (`phase15`, `3`, `next`, `phase 3a`)
- [ ] `inferSpec` from changed paths; exactly-one rule; git failure → undefined
- [ ] `contextPack` uses inference for resume/status/execute when unnamed
- [ ] `numericPart` dotted comparison (`9.10` > `9.9`) with range and `[phase N+]` tests
- [ ] SKILL.md parse prose trimmed and `:74` reworded; wiring tests green

## Phase-local notes

The `!` injection shape must stay as PR #2 left it (no `&&`/`||` around the here-doc).
