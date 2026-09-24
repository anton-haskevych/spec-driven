# Execute Mode

The inner loop the agent runs once a chunk is locked in. This file owns the work cycle — load the principles, recon the seam, preflight the plan, decompose, TDD per unit, commit per logical change, mini-progress-update per chunk, full `/spec handoff` when the stopping rule fires. Nothing in §5 onward starts until §3 has run.

## 0. Entry

Two ways in. Both land at §1 with Stage B context loaded and run §1 → §3 in order before any code.

- **From resume** — `resume.md` → *Hand off to execute mode* hands off after the user confirmed a chunk. Context is already loaded; **skip the rest of this section** and start at §1.
- **Direct** — the user typed `/spec execute <feature> [chunk hint]`. Typing `execute` *is* the confirmation, so there is no Stage A halt. Run §0.1–§0.3 first.

### 0.1. Preconditions

Run SKILL.md → *Preconditions*. A prep-stage spec has nothing to execute — it routes to [prep.md](prep.md). A legacy spec loads context via `legacy-layout.md` → `execute` in §0.3.

### 0.2. Pick the chunk

**If a `<spec-pack mode="execute">` for this spec is present** (SKILL.md → *Tools*), it already picked the phase (its `Picked:` line) and holds §0.3's context except `design.md` and `technical.md`. Announce the pick, read those two files plus the ledger entries the chunk needs, and continue at §1. Otherwise:

- **Chunk hint given** (`phase 3a`, `3a`, `next`, or a phase named in the conversation) → that is the chunk.
- **No hint** → apply SKILL.md → *Next-chunk rule*: the first phase in the ready set. If other phases are ready too, name them in the announcement line so the user can start them in parallel sessions.
- **Nothing ready** → print the waiting phases with their reasons and stop.
- **No unchecked phase left** → print `All phases complete — see pr-opening.md for the PR gate.` and stop.

Announce the pick in one line before loading anything: `Executing Phase <N> — <name>: <chunk>`. Do not print the Stage A status table, the `**Last session:**` block, or a confirmation prompt — the user already committed.

Read `in-flight.md` only if it exists and has substantive content, and only to avoid redoing half-finished work. Do not summarize it back to the user.

### 0.3. Load Stage B context

Run `resume.md` Stage B's reads — *Read stable references + active phase* through *Read supplementary phase files only when linked* — against the picked chunk: stable references + the active phase entry, then the scoped `code-map.md` and phase-filtered `ledger/INDEX.md` entries, then any supplementary phase file its `plan.md` explicitly links. Skip anything already loaded this session.

## 1. Load the principles

Read [principles.md](principles.md) once at the start of execution. These rules govern every code change you produce.

## 2. Recon the phase seam — before any decomposition

You do not yet know enough to decompose. Lock the seam first: run wave-based phase reconnaissance scoped to **this chunk**, before writing a line of plan or code.

- **`explore-waves` installed** (it appears in the available skills list) → invoke it with its `phase-exec` lens. The spec-driven execute flow is a named, sanctioned caller in that skill's contract — this is an explicit invocation, not speculative exploration.
- **Not installed** → run the same protocol inline. A wave is 2 `Agent` calls with `subagent_type: "Explore"`, fired concurrently in one message, each owning one distinct focus (e.g. the change seam vs. reuse + tests), each told: read-only, `file:line`-referenced findings only, no design, under 6000 tokens. You synthesize between waves; aim wave 2 only at what wave 1 left open. Two waves at most.

Either way, the recon must produce three things:

1. **The seam** — the exact files, functions, and call sites this chunk will touch, and the existing patterns to mirror (`file:line` throughout).
2. **Reuse opportunities** — existing mechanisms to extend instead of reinventing. Every new mechanism the chunk would introduce gets checked against "is this concern already solved here?" (principles.md → *Extract on the second use — with a test*; the prior-art discipline).
3. **Testing-issue estimate** — the obstacles to a clean TDD loop, found *now* rather than discovered mid-flight:
   - Missing fixtures, mocks, or test harness for the code paths in scope.
   - Files already near the 250-line cap (principles.md → *Hard size caps*) that this change would push over.
   - Non-pure functions tangled with I/O that resist isolated unit testing — flag each for an extract-first refactor (per §5 below and principles.md → *Pure functions wherever pure logic exists*).
   - Domain smells on the path: duplication, leaked abstractions, god-objects.

**Self-scaling.** A small or already-well-understood chunk yields a short exploration — do not pad it. If Stage B context already made the seam obvious, a single wave suffices. But the testing-issue estimate is *always* produced; that is the part that makes the plan honest.

**Persist it.** Write the recon synthesis as an immutable note at `docs/specs/<name>/research/phase-<N>/YYYY-MM-DD-<chunk>-recon.md` (layout: SKILL.md → *reviews/ and research/ semantics*). It survives compaction and feeds both the decomposition below and any downstream plan review.

## 3. Preflight the plan — the gate before decomposition

Recon told you *where* the chunk lands. Preflight tells you whether the plan for it is right. Run the `phase-preflight` skill now, via the Skill tool as `spec-driven:phase-preflight`, scoped to **this chunk**. Not optional, not deferred to "after the first unit" — it runs here, every chunk, and self-scales: a trivial chunk produces a near-empty findings list in a minute, which is the correct output.

**Hand it:**

- the phase entry (the plan under review),
- the recon note from §2 — its seam replaces the phase file's `file:line`s as the source of truth for what to read, and its testing-issue estimate is consumed by preflight's seam/testability stage rather than redone,
- `principles.md` as the house rules (preflight ranks house idioms above named canon).

**Take back:** its `Findings that change the plan` and `Amendments`. Apply them *before* §4–§5: a finding that the phase file asserts something false means the code wins and the phase entry is corrected via `update`; an amendment to the design changes the decomposition you are about to write. Persisting the preflight note under `research/phase-<N>/` and writing ledger entries for durable learnings is the skill's own job — confirm it did so.

Do not start §5 with an unapplied amendment outstanding. Do not "note it for later".

## 4. State the chunk goal

In one sentence: what does this chunk deliver? Anchor everything below to this goal. If you cannot state the goal in one sentence, the chunk is too large — narrow it before starting.

## 5. Decompose into the smallest testable units

Break the chunk into units small enough that:

- Each unit can be exercised by a single, focused unit test.
- Each unit lives behind a clear interface (pure function, narrow class, single-purpose module).
- Each unit can be implemented and committed independently of the others in this chunk.

The recon's testing-issue estimate (§2) already named the units that are not testable in isolation — they depend on a database, a network call, a UI tree, or hidden global state. Extract or refactor those first. The refactor is its own commit, lands green, and only then do you proceed to the new logic.

## 6. The per-unit cycle

For each unit:

1. **Red.** Write the unit test. Assert the invariant the unit must satisfy. Run it; confirm it fails for the right reason.
2. **Implement.** Write the smallest code that turns the test green. No extra abstractions, no premature generalization.
3. **Green.** Run the unit test → green. Run the broader test suite → still green.
4. **Refactor (if warranted).** Improve names, split functions that grew too large, eliminate duplication that just appeared. Tests stay green throughout.
5. **Commit.** One logical change per commit. Commit message states the *why*, not just the *what*. Body explains anything non-obvious about the approach.
6. **Update progress.** Tick the corresponding sub-checkbox in the phase entry (`phases/phase-<N>-<slug>.md` or the folder's `plan.md`). If this completes all sub-checkboxes for the phase, flip the top-level box in `progress.md` and refresh the **Spec state** in `pr-opening.md` (phases done / left).

## 7. Capture durable learnings as you go

If, during a unit, you discover something durable — a non-obvious gotcha, a domain fact, a decision you had to make, a workaround for a constraint — write a ledger entry immediately. Use the narrowest correct `applies-to:` scope. Don't batch this; the learning is freshest now. A lesson about the codebase rather than this feature goes to the project ledger (SKILL.md → *Project ledger → Write path*), so the next spec sees it too.

Skip if the finding is just "this was tedious" or "I found the file." Ledger is for forward-propagating knowledge, not session log.

## 8. Know when to stop — the stopping rule

You cannot measure your own token usage, so don't try. Stop on signals you can actually see. At the **next clean boundary** (between units, after a green commit), end the session when any of these holds:

- **Three chunks** have completed in this session.
- **The conversation has been compacted** — a summary of earlier turns is present, or details you worked with earlier are no longer in view. This should not happen in the normal flow (SKILL.md → *Session lifecycle*: one fresh session per chunk). If it does, the window is full and working on from a summary is how drift starts.
- **The next chunk belongs to a different phase** than the Stage B context you loaded. A new phase deserves a fresh session with its own filtered ledger, not a stale one.

Defaults — a project's `CLAUDE.md` may set a different chunk count. When a stop fires:

- Run `/spec handoff` to redirect any session reflection: durable items → ledger, ephemeral pending state → `in-flight.md`. The full handoff flow is in `handoff.md`.
- Hand the work off cleanly. The next agent picks up from `resume.md` → *Stage A — Orientation* and sees exactly what was left.

A clean boundary means: tests are green, the working tree is committed, no half-wired code, no stale files.

## 9. End-of-chunk

When all units in the chunk are green and committed, and you believe the chunk is done:

1. Confirm the phase entry's sub-checkboxes reflect reality.
2. If durable learnings emerged, confirm they're in the ledger.
3. Brief the user in 2–3 sentences: what shipped, what's next.

If the chunk completes a phase, run `update.md` → *Close the phase* — it captures the phase's learnings and commits without ending the session.

## 10. The PR gate (not a phase)

When the code phases this PR covers are all done, opening the PR is gated by `pr-opening.md` — it is **not** a phase:

1. Run the **pre-PR checks** in `pr-opening.md`, scoped to the subprojects this PR touches. Lines like `gate: landing` point at named blocks in `docs/specs/_playbook/gates.md`; `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts gates <name>` expands them.
2. Tick each check only when it actually passes; paste the failing output instead if it doesn't.
3. Refresh the **Spec state** (phases done, branch, PR link once it exists).
4. Open the PR as a **draft, off a feature branch — never to `main`**, following the PR split recorded in `pr-opening.md`.

Never invent a "verification" or "open PR" phase to hold this — that's what `pr-opening.md` is for.

## Notes

- The TDD loop is non-negotiable for production code paths. Pure scripts, throwaway prototypes, and configuration files are exempt — but most of what you'll write inside a spec is production code.
- "Test exists and passes" beats "test exists and is comprehensive." A focused test that asserts the right invariant outperforms 200 lines of edge-case ceremony around weak invariants.
- Don't write tests *for* the implementation. Write tests for the contract the unit must satisfy. The implementation should be free to change underneath.
- If the broader test suite is slow, run the affected slice during the per-unit cycle and the full suite before committing. Don't let "the suite takes 10 minutes" become an excuse to skip green-bar verification.
