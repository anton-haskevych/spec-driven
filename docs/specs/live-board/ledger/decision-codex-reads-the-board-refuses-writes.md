---
kind: decision
applies-to: [phase 3+]
created: 2026-11-11T19:41:31-08:00
---

# A Codex pilot reads a joined spec and is refused when it writes one

A Codex local-pilot may run `phase tick | park | unpark` today
(`runtime/workflow-capabilities.ts:12,34`). On a joined spec those would be shared writes with a branch push,
which the pilot's isolation rule forbids, or ticks into frozen files nobody reads.

**Positions put to Anton:** (1) refuse for now and let `codex-runtime-support` add board writes in its own
phase; (2) add a phase to live-board that lets Codex write the board; (3) a spec with a live Codex session
doesn't join.

**Anton, 2026-11-11: "Refuse for now (Recommended)".**

So: Codex reads through the same state source as Claude (reading is not a shared write). The three phase
actions refuse on a joined spec with
`phase tick: <spec> is on the board; a Codex pilot can't write it yet`. Until `codex-runtime-support` lifts
that, a Codex pilot can't execute a joined spec. live-board waits on nothing; its `related` line and code-map
name the files both specs edit.
