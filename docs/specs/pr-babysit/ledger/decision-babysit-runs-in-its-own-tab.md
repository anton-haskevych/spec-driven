---
kind: decision
applies-to: [phase 7]
created: 2026-10-10T13:17:04-07:00
---

# Babysitting runs in its own launched session, not the execute session

On "babysit", the session that finished the code launches `/spec babysit <spec> <group>` in the PR's
tree and hands off. Anton chose this on 2026-10-10 over "the same session keeps going".

Why: one session per chunk stays true; a long, heavy execute session isn't held open for 15–60 min
of CI; one tab per PR shows what is being babysat. Cost: the babysit session reloads context for
fixes from the spec pack and `pr status` instead of having it in memory.
