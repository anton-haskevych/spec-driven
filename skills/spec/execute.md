# Execute Mode

The inner loop the agent runs once a chunk has been confirmed in Stage B of `resume.md`. This file owns the work cycle — recon the seam, TDD per unit, commit per logical change, mini-progress-update per chunk, full `/spec handoff` before the context budget runs out.

## 1. Load the principles

Read [principles.md](principles.md) once at the start of execution. These rules govern every code change you produce.

## 2. Recon the phase seam — before any decomposition

You do not yet know enough to decompose. Lock the seam first: run wave-based phase reconnaissance via the `/explore-waves` skill, scoped to **this chunk**, before writing a line of plan or code. The spec-driven execute flow is a named, sanctioned caller in that skill's contract — this is an explicit invocation, not speculative exploration. Use its `phase-exec` lens.

The recon must produce three things:

1. **The seam** — the exact files, functions, and call sites this chunk will touch, and the existing patterns to mirror (`file:line` throughout).
2. **Reuse opportunities** — existing mechanisms to extend instead of reinventing. Every new mechanism the chunk would introduce gets checked against "is this concern already solved here?" (principles.md §9; the prior-art discipline).
3. **Testing-issue estimate** — the obstacles to a clean TDD loop, found *now* rather than discovered mid-flight:
   - Missing fixtures, mocks, or test harness for the code paths in scope.
   - Files already near the 250-line cap (principles.md §5) that this change would push over.
   - Non-pure functions tangled with I/O that resist isolated unit testing — flag each for an extract-first refactor (per §4 below and principles.md §3).
   - Domain smells on the path: duplication, leaked abstractions, god-objects.

**Self-scaling.** A small or already-well-understood chunk yields a short exploration — do not pad it. If Stage B context already made the seam obvious, a single wave suffices. But the testing-issue estimate is *always* produced; that is the part that makes the plan honest.

**Persist it.** Write the recon synthesis as a dated, phase-scoped, immutable note under `docs/specs/<name>/research/` (the same home as prep recon-wave snapshots). It survives compaction and feeds both the decomposition below and any downstream plan review.

## 3. State the chunk goal

In one sentence: what does this chunk deliver? Anchor everything below to this goal. If you cannot state the goal in one sentence, the chunk is too large — narrow it before starting.

## 4. Decompose into the smallest testable units

Break the chunk into units small enough that:

- Each unit can be exercised by a single, focused unit test.
- Each unit lives behind a clear interface (pure function, narrow class, single-purpose module).
- Each unit can be implemented and committed independently of the others in this chunk.

The recon's testing-issue estimate (§2) already named the units that are not testable in isolation — they depend on a database, a network call, a UI tree, or hidden global state. Extract or refactor those first. The refactor is its own commit, lands green, and only then do you proceed to the new logic.

## 5. The per-unit cycle

For each unit:

1. **Red.** Write the unit test. Assert the invariant the unit must satisfy. Run it; confirm it fails for the right reason.
2. **Implement.** Write the smallest code that turns the test green. No extra abstractions, no premature generalization.
3. **Green.** Run the unit test → green. Run the broader test suite → still green.
4. **Refactor (if warranted).** Improve names, split functions that grew too large, eliminate duplication that just appeared. Tests stay green throughout.
5. **Commit.** One logical change per commit. Commit message states the *why*, not just the *what*. Body explains anything non-obvious about the approach.
6. **Update progress.** Tick the corresponding sub-checkbox in the phase entry (`phases/phase-<N>-<slug>.md` or the folder's `plan.md`). If this completes all sub-checkboxes for the phase, flip the top-level box in `progress.md` and refresh the **Spec state** in `pr-opening.md` (phases done / left).

## 6. Capture durable learnings as you go

If, during a unit, you discover something durable — a non-obvious gotcha, a domain fact, a decision you had to make, a workaround for a constraint — write a ledger entry immediately. Use the narrowest correct `applies-to:` scope. Don't batch this; the learning is freshest now.

Skip if the finding is just "this was tedious" or "I found the file." Ledger is for forward-propagating knowledge, not session log.

## 7. Watch the context budget

The agent's effective context window is ~300–400K tokens. Track it.

- At ~75% of the budget, **stop the chunk at the next clean boundary** (between units, after a green commit). Do not push through.
- Run `/spec handoff` to redirect any session reflection: durable items → ledger, ephemeral pending state → `in-flight.md`. The full handoff flow is in `handoff.md`.
- Hand the work off cleanly. The next agent picks up from `resume.md` Stage A and sees exactly what was left.

A clean boundary means: tests are green, the working tree is committed, no half-wired code, no stale files.

## 8. End-of-chunk

When all units in the chunk are green and committed, and you believe the chunk is done:

1. Confirm the phase entry's sub-checkboxes reflect reality.
2. If durable learnings emerged, confirm they're in the ledger.
3. Brief the user in 2–3 sentences: what shipped, what's next.

If the chunk completes a phase, mention that the next phase is ready.

## 9. The PR gate (not a phase)

When the code phases this PR covers are all done, opening the PR is gated by `pr-opening.md` — it is **not** a phase:

1. Run the **pre-PR checks** in `pr-opening.md`, scoped to the subprojects this PR touches.
2. Tick each check only when it actually passes; paste the failing output instead if it doesn't.
3. Refresh the **Spec state** (phases done, branch, PR link once it exists).
4. Open the PR as a **draft, off a feature branch — never to `main`**, following the PR split recorded in `pr-opening.md`.

Never invent a "verification" or "open PR" phase to hold this — that's what `pr-opening.md` is for.

## Notes

- The TDD loop is non-negotiable for production code paths. Pure scripts, throwaway prototypes, and configuration files are exempt — but most of what you'll write inside a spec is production code.
- "Test exists and passes" beats "test exists and is comprehensive." A focused test that asserts the right invariant outperforms 200 lines of edge-case ceremony around weak invariants.
- Don't write tests *for* the implementation. Write tests for the contract the unit must satisfy. The implementation should be free to change underneath.
- If the broader test suite is slow, run the affected slice during the per-unit cycle and the full suite before committing. Don't let "the suite takes 10 minutes" become an excuse to skip green-bar verification.
