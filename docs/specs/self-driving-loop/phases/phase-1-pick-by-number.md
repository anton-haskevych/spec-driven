---
needs: []
pr: A
---

# Phase 1 — Pick by number

**Goal:** A bare row number (or several) after *Next sessions* launches those rows, the launched session starts work without asking "go", and the PR question and the rows never share a message.

**Outcome:** You type "1" (or "1 3") instead of pasting a row and saying "go"; the new tab just starts · small, prose only · risk: a vague rule launches the wrong row — the block is printed right above the reply, and the launch line names what started.

**Files to touch:**
- `skills/spec/SKILL.md` (*Next sessions*, *Tools* → Board `--json` shape)
- `skills/spec/execute.md` (§3 preflight take-back, :22 no-spec entry)
- `skills/spec/handoff.md` (:174-176)
- `skills/spec/tools/tests/skill-wiring.test.ts`

## Implementation guidance

Prose only (technical.md → Prose edits). Write the reply rule once in SKILL.md *Next sessions*; handoff, review, create and list already point there (list.md:29 restates step 3 — make it point instead). The "go again" fix is in execute §3: preflight's *Decisions for you* had no rule, so sessions halted on them (digest 56); apply the recommended option and list it. Launched rows stay `execute <spec> <phase>`, which already skips Stage A — don't touch `resume`.

pr-babysit phase 7 rewrites handoff and execute §10 around its PR question. Whichever lands second merges main and keeps both: the question's copy is pr-babysit's, the one-list rule is ours.

## Deliverables

- [ ] SKILL.md *Next sessions*: `Reply with row numbers to launch.`, the reply rule (`1`, `1 3`, `go`/`yes`, pasted row), one-list-per-message rule; list.md points at it; wiring pins
- [ ] execute.md §3: *Decisions for you* applied with the recommended option and listed; :22 applies the top ready row and says so; wiring pin
- [ ] SKILL.md *Tools* → Board: the `--json` shape (lanes, ready-row fields, no `title`/`tree`)

## Phase-local notes

Lesson `gotcha-execute-section-0-is-skipped-on-the-resume-path`: anything every execute session must do goes in §1 or later, never §0.
