---
kind: gotcha
paths: [skills/spec/execute.md, skills/spec/resume.md]
seen-in: [spec-loop-automation]
created: 2026-09-30T17:42:54-07:00
---

# A step every execute session must run goes in execute.md §1, not §0

Sessions that start with `/spec resume` enter execute mode at §1 (`resume.md` → B.5 hands off at *Load the principles*; `execute.md` §0 says "skip the rest of this section"). Only a direct `/spec execute` runs §0. Put per-session steps, such as the `gates.bootstrap` gate, at the top of §1 so both paths hit them.

The phase 5 plan first placed the bootstrap gate in §0; preflight caught it (`docs/specs/spec-loop-automation/research/phase-5/2026-09-30-mode-prose-preflight.md`).
