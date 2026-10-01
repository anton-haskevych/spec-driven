---
kind: decision
applies-to: [phase 8, 10]
created: 2026-09-30T18:16:57-07:00
---

# No context nudge

Anton (2026-09-30): the once-per-session "context ≈ N tokens, hand off" hook is unnecessary. Dropped from phase 8 before any of it was built: no `context-nudge.ts`, no transcript reading, no `SessionMemory` extraction (it only existed to share "nudged" state), no stopping-rule rewording in `execute.md`/`SKILL.md`.

Removed the `nudge-at` setting that phase 5 had already shipped; it is now an unknown key, so the doctor flags it if a project sets it. Phase 10 no longer sets it or reconciles CRM's `checkpoint-reminder.ts` with a nudge.

Phase 8 keeps the Bash write guard and the hook-lifetime probe (the guard needs to outlive the `/spec` turn too). Wiring test expects 3 hooks, not 4.
