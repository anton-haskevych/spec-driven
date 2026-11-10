---
kind: decision
applies-to: [general, load-bearing]
created: 2026-11-08T23:55:12-08:00
---

# Deliver useful Codex increments while retaining complete workflow parity

Anton first accepted the value-first council: “yeah, I want to prioritize the results and value and we could always do incremental improvements later”. On 2026-11-09 he approved reorganizing the full spec and clarified: “I want this full claude code workflow with the spec to be fully ported onto codex too” and “claude code experience should stay the same (or improve if you see clear improvements) but not cut any corners or features or regress”.

Keep the full feature inventory in ../workflow-parity.md. Change sequencing, not final scope: Phase 2 local pilot; 2b shared ownership/board/worktrees; 4 complete interactive modes/personas/hooks; 3 normal launches/next sessions/spin-offs; 3b managed workers/babysit/overseer; 6 full parity/CI closure. Preserve all completed foundations.

The first adoption boundary is an exclusive separate-clone pilot with a distinct Git common directory, explicit spec/phase/cwd and guarded unavailable actions. A sibling worktree or marker cannot protect it from legacy cleanup. Use existing context composition and explicit recall/validation; report restricted local handoff honestly. No clone/profile manager or second workflow copy.

Shared ownership/cutover, native hook trust/execution and worker lifecycle remain required before their capabilities activate. Those protections do not block isolated local use. Feature tests/native evidence and Claude regression checks accompany every enabled increment; all later features remain required here.

Rejected: finish broad infrastructure before useful work; call a fixture/read-only demo full parity; omit safety checks in shared state; rewrite tested foundations; drop daily Claude features. The approved alternative is safe, explicitly bounded adoption that can help finish the complete port.

Use existing native installation/update/release mechanisms and fresh-session recovery. No updater, custom retention, live personal install, auth copying, trust bypass, push or publication is authorized by the planning reorganization. Review rationale: ../reviews/2026-11-09-adoption-before-automation.md; earlier council evidence stays immutable.
