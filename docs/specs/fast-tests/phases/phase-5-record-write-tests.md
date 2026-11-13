---
needs: [3a]
pr: A
---

# Phase 5 — Record-writing command tests on fakes

**Goal:** the commands that write the board's record are tested on `fakeRecord`: card, card-load, question,
record-plan-changes, spec-field, session, session-stamp, plan-command.

**Outcome:** ~80 s of the suite's slowest command tests become in-memory · a day · low risk: each file's logic has a
pure sibling (card-plans, question-plans, plan-ops-*, session-stamp, plan-apply).

**Files to touch:**
- `skills/spec/tools/tests/card-command`, `card-load-command`, `question-command`, `record-plan-changes`, `spec-field-commands`, `session-command`, `session-stamp-command`, `plan-command` (`.git.test.ts` → `.test.ts`)
- `skills/spec/tools/tests/real-git-allowlist.test.ts`

## Implementation guidance

Seed with `seedRecord(fakeRecord(), joinedDocs(...))` and `joinedFiles(tree)`; assert with `docOf` / `recordPhaseOf`
/ `commitLog`. Races use `racerBeforeNextPush`; offline uses `fake.offline`. `card-load-command`'s "one commit" is
`commitLog(fake).length`; its JSON-parsing test duplicates `card-load.test.ts` — delete it. spec-field's
"lands on main" goes through the fake `land`. Two-session tests share one fake record.

## Deliverables

- [ ] card-command and card-load-command on fakes (drop the duplicate parse test)
- [ ] question-command and record-plan-changes on fakes (race via `racerBeforeNextPush`, offline via the flag)
- [ ] spec-field-commands on fakes + fake `land`
- [ ] session-command, session-stamp-command, plan-command on fakes
- [ ] Allowlist lines removed, `REAL_GIT_CAP` lowered; full suite green

## Phase-local notes

- Per commit: `test:fast` plus the `.git` files covering what you touched; full `bun test` before ticking the last item.
- Handoff lists every removed test name and where its git behaviour is still proven (fake test or `<file>.git.test.ts:<test>`).
