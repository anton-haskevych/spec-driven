---
kind: decision
applies-to: [phase 3+]
created: 2026-10-13T09:53:48-07:00
---

# A park is a line in the phase's in-flight note; the worker unparks, never the overseer

- **Shape:** `- Parked <time>: <question> · recommend: <answer>` under `## Needs you` in
  `in-flight/phase-<id>.md`; the answer is an indented `- Answered <time>: <text>` line under it
  (`T/core/park.ts`). Free-form `## Needs you` lines are not parks.
- **One open question per phase.** `phase park` refuses a second, so `unpark` always answers the one
  asked. A worker with two forks asks them in one question.
- **The relaunched worker runs `phase unpark`** from the answer in its brief (execute.md §0.2). The
  overseer has no tree for the phase and writes no code, so it only relaunches with `--note`.
- **Handoff keeps `## Needs you`** when it rewrites the note, and an unanswered park is never a clean
  boundary; otherwise the handoff after the park erases the question (preflight finding 1).
- **The board reads a worktree's copy before base** (`T/board/parked.ts`). Another machine sees the park
  only once the branch's docs land; the overseer falls back to `git show origin/<branch>:…`.
- **Gate kinds live in `GATE_KINDS`** (`T/core/gate.ts`); phase 5's `crew.self-approve` validates against it.
