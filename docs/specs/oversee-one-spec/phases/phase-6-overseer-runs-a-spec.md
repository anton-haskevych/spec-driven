---
needs: [1, 2, 4, 5]
pr: D
---

# Phase 6 — The overseer runs a spec end to end

**Goal:** `oversee-crew.md`, the worker brief and the execute/handoff crew rules describe the one-spec run: plan the order, launch lanes, merge back (spec branch and main) at handoff, ship one PR in the spec's ship mode without waiting on a question that has a default.

**Outcome:** Pointing an overseer at a spec is the whole instruction; it plans, runs and ships it, and only comes to you for real decisions · small · risk: mode-doc wording read by every crew session.

**Files to touch:**
- `skills/spec/oversee-crew.md` (*One spec* section), `skills/spec/crew-brief.md`, `skills/spec/tools/crew/brief.ts`
- `skills/spec/execute.md` (§1, *Crew worker*), `skills/spec/handoff.md` (§3–§4), `skills/spec/SKILL.md` (Crew, Trees, Remote bullets)
- `README.md`, `ROADMAP.md`
- tests: `crew-brief.test.ts`, `skill-wiring.test.ts`, `commands-table.test.ts`

## Implementation guidance

technical.md → *Phase 6*. One section, not "if spec / else" through the doc: everything that differs
in a one-spec run lives under *One spec*; the rest of the doc stays as is.

Ship mode never waits: the spec's `ship:`, else `pr.ship`, else `hold-for-review`, which babysits to
green and holds (`decision-final-pr-holds-by-default`). The overseer never merges to main on a default.

The brief carries the merge-back steps as one line and "never create or push other branches"; the
tools enforce the rest.

## Deliverables

- [ ] `oversee-crew.md` *One spec*: start (order, regroup/split, ship-alone groups, Say if wrong), takeover (`crew start --spec` again: checks skipped), ticks, the `PR moment` line, ship mode without waiting (`ship:` → `pr.ship` → `hold-for-review`), the run ends `finished`
- [ ] Brief: spec-branch line and the no-other-branches rule; `crew-brief.test.ts`
- [ ] `execute.md` / `handoff.md`: lanes run `merge-back` (spec branch and main, gates) instead of `publish-docs`/`push`; Crew line in the `[handoff]` commit body
- [ ] SKILL.md bullets, README mode row, ROADMAP row

## Phase-local notes

- `gotcha-execute-pack-predates-a-main-merge`: after `merge-back` brings new work in, the worker rebuilds its pack.
- `gotcha-session-runs-the-cached-plugin-not-the-branch`: try it from the installed release, not the branch.
