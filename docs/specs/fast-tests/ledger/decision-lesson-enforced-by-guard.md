---
kind: decision
applies-to: [phase 1]
created: 2026-11-13T15:46:11-08:00
---

# The real-git lesson carries `enforced-by`; the guard's red message is the teaching moment

Fork put to Anton in review 2026-11-13. Two options:

- Keep the new project lesson visible (no `enforced-by`), so the before-edit hook shows the rule. The brief promised this.
- Follow the house rule: a guarded lesson gets `enforced-by`, and recall stops showing it.

**Anton: follow the house rule.** The lesson is written with
`enforced-by: skills/spec/tools/tests/real-git-allowlist.test.ts`, after the guard exists (the doctor checks the path).
The agent learns the rule from the guard's failure message the first time the new test runs, and from `principles.md` §13.

Why not visible: a guarded lesson left visible would show up in `lessons candidates` as unguarded once three specs
record it, and each later review would re-ask for a guard that exists.
