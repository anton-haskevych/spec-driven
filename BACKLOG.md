# spec-driven — Improvement Backlog

Source: working session reconstructing Anton's real per-phase spec workflow (the
`schedule-highlights` Jun 20–21 transcripts). Goal: codify the workflow he runs by
hand so he stops driving the loop manually — **done right, no hacks**.

What already works and stays as-is: `prep`, `create`, the collegium `review` panel,
`principles.md` (the quality bar, verbatim), and `execute.md`'s TDD micro-loop.

The core problem is **adherence + drift**: the rules are written down but the agent
skips them and slowly slides into low-quality code over a long session — and the
per-phase loop is driven entirely by hand.

---

## Theme 1 — Make the existing rules actually fire (adherence)

- **A1 — Per-phase recon before code.** ✅ **DONE.** `execute.md` now opens with a
  "Recon the phase seam" step (`§2`) that runs `/explore-waves` (`phase-exec` lens)
  before decomposition — locking the seam, reuse opportunities, and the testing-issue
  estimate (missing fixtures, files near the 250-line cap, non-pure functions to extract
  first, smells), persisted to `research/`. `explore-waves` gained the `phase-exec` lens
  + named the spec-driven `execute` flow as a sanctioned caller; `resume.md` B.5 and
  `SKILL.md`'s `research/` semantics updated to match. — Impact: High · Effort: Low
- **A3 — The skip problem.** Agent skips the quality bar, the red→green→commit loop, and
  ledger-as-you-go even though all three are written. Largely *emergent* from Theme 2;
  residual is structural reinforcement in `execute.md`. — Impact: High · Effort: Med ·
  Deps: R1, R2

> ~~A2 — Live verification ("drive the UI, not the API").~~ **DROPPED.** Anton does not
> want the agent reflexively spinning up the browser. Verification stays test-based.

## Theme 2 — The "stop and review → verdict" system (drift)

- **R1 — Reviewer fan-out + verdict engine (shared).** Distinct reviewer agents, each
  asking one sharp question — BS? fits the codebase? more elegant? clean? DRY? SOLID?
  DDD? layered? unit-tested? — producing one verdict: `continue / redo / fix`.
  Foundation for R2 **and** R3. — Impact: High · Effort: Med · Deps: none
- **R2 — Drift-guard hook (non-forgettable mid-phase trigger).** PostToolUse counter
  (+ soft nudge) → Stop-gate hard wall → agent runs R1 → reset counter. Only the `Stop`
  hook can force a pause; hooks can't spawn agents, so the fan-out is run by the main
  agent in response. Recipe already researched. — Impact: Very High · Effort: Med ·
  Deps: R1
- **R3 — Phase-end code review wired into `execute`** (the build-naive → review →
  refactor loop). Today `review.md` reviews the *spec* pre-implementation only. Run R1
  as the phase-exit gate. — Impact: High · Effort: Med · Deps: R1

## Theme 3 — Loop automation (stop being the monkey)

- **L1 — Per-phase pipeline.** `/spec resume` on an active spec auto-runs
  recon → plan → plan-review → execute → code-review instead of stopping after
  re-orient. Deletes ~5 manual prompts/phase. — Impact: High · Effort: Med ·
  Deps: A1, R3, L2
- **L2 — Plan-review step.** Fan out reviewers on the *plan* before coding → verdict.
  — Impact: Med-High · Effort: Med · Deps: R1
- **L3 — Cross-phase auto-continuation.** Self-drive handoff → compact → next phase
  until done. The hard one: hooks can't trigger `/compact` or spawn agents; rides on
  Stop-hook + auto-compact + durable spec files. **Needs the compaction-trigger
  constraint verified first.** — Impact: High · Effort: High · Deps: L1, D1
- **D1 — Decision (not a task):** autonomy level — fully autonomous (reviews are the
  gates) vs. human ack at phase boundaries. Gates L1/L3.

---

## Recommended sequencing

1. **A1** — smallest scope, no new infra, already validated, outsized downstream
   leverage (a locked seam makes every later step better). First win.
2. **R1 → R2** — the review engine, then the drift guard. The core pain; R1 is reusable
   infrastructure that R3/L2 plug into, so building it early compounds.
3. **R3, L2** — plug into R1.
4. **A3** — residual reinforcement once Theme 2 exists.
5. **L1** — composes A1 + R3 + L2.
6. **L3** — last; only after the compaction-trigger constraint is verified.
