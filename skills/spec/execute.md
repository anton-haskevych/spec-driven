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
- **No spec named, and the pack says nothing in this tree points at one** (and the conversation names none) → run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board ready --json --local`, offer the top row in one line (`<spec> <phase> — <title>`) and stop. Focus specs rank first, so this offers the team's focus work before anything else. A yes starts it: run §0 again for that spec and phase. Without Bun, ask which spec instead.
- **Nothing ready** → print the waiting phases with their reasons and stop.
- **No unchecked phase left** → print `All phases complete — see pr-opening.md for the PR gate.` and stop.

Announce the pick in one line before loading anything: `Executing Phase <N> — <name>: <chunk>`. Do not print the Stage A status table, the `**Last session:**` block, or a confirmation prompt — the user already committed.

Read `in-flight.md` only if it exists and has substantive content, and only to avoid redoing half-finished work. Do not summarize it back to the user.

### 0.3. Load Stage B context

Run `resume.md` Stage B's reads — *Read stable references + active phase* through *Read supplementary phase files only when linked* — against the picked chunk: stable references + the active phase entry, then the scoped `code-map.md` and phase-filtered `ledger/INDEX.md` entries, then any supplementary phase file its `plan.md` explicitly links. Skip anything already loaded this session.

## 1. Load the principles

**Place the session in its tree first**, since the claim records the tree it's taken in: `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts trees place <spec> <phase>` (*Tools* → Trees). Run it as a command of its own, never chained with `claim take`: its answer decides whether to claim at all.
- `Tree: <path> · … · existing`, where `<path>` is the session's working directory: stay here.
- Any other `Tree: <path> …`: switch with `EnterWorktree` and `{ path: "<path>" }`, then carry on with §1 there. Pass on, in one line each, a `Trees:` line (the tree root it just detected for this person) and a `Setup failed:` line.
- `EnterWorktree` refuses (a session already inside another worktree can only switch into `.claude/worktrees/`): run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts launch execute <spec> <phase>`, which opens a session in that tree. Pass on its last line and stop here.
- `trees: <path> is busy, <reason>`: another session is working there: it holds a claim (`after <spec> <phase> (<session>)`), is mid-task, or sits idle with uncommitted changes. Never share a tree, and don't claim. Tell the user which session and why, and stop. A session left open after its handoff, idle in a clean tree, doesn't hold it, so the tab you launched from never blocks you.
- Any other `trees:` refusal (no origin, no default branch): work where the session is, and say so in one line.
- Without Bun, skip this step.

**Claim the phase**, so two sessions never start the same one: `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts claim take <spec> <phase>`.
- A `claim:` line means this session holds it. `took over <spec> phase <id> from <holder> (closed)` took a claim its session left behind; say so in one line.
- `claim: their work is on <branch>` follows any take-over: build on that branch (merge or check it out) instead of starting the phase over.
- `claim: origin unreachable; claimed locally only` still means held. Carry on, and mention it in one line: sessions on other machines can't see this claim until a later take reaches origin.
- `claim refused:` with no phase named by the user (the pack picked it): re-run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts context execute <spec>`. The new pack skips the held phase. Reload Stage B for its pick and claim that.
- `claim refused:` for a phase the user named: stop and tell the user who holds it, where (a worktree, or `user@host` for another machine) and how long ago. If the line ends with `say "take it over" to take it anyway`, pass that offer on.
- Run `claim take <spec> <phase> --take-over` only when the user says to take it over in this conversation. It takes any claim, including a live one or one from another machine, so it is never an automatic fix for a refusal.
- Without Bun, skip this step.

**Task phase?** If the picked phase has `code: false` (the execute pack says so under `Picked:`), skip to *Task phases* below; §1–§7 are for code.

**Fresh worktree?** When project settings name `gates.bootstrap` (the pack's `Settings:` line says `fresh worktree: gate <name>`), run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts gates --name <name>` and do the steps whose condition holds; the gate text defines "fresh". Placement's `Fresh tree: work through gate <name>` line means the tree was just created. No `Settings:` line means no bootstrap step. Without Bun, read `gates.bootstrap` in `docs/specs/_playbook/settings.md` and that section of `gates.md`.

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
3. **Green.** Run the unit test → green. Then run the project's per-commit gate: when settings name `gates.per-commit` (the pack's `Settings:` line says `each commit: gate <name>`), run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts gates --name <name>` and do its lines for the subprojects you touched. For a subproject the gate doesn't list, or with no such setting, run the tests your change affects (the affected slice). Never the full suite per commit: it belongs to the PR gate (§10) or CI. Without Bun, read `gates.per-commit` in `docs/specs/_playbook/settings.md` and that section of `gates.md`.
4. **Refactor (if warranted).** Improve names, split functions that grew too large, eliminate duplication that just appeared. Tests stay green throughout.
5. **Commit.** One logical change per commit. Commit message states the *why*, not just the *what*. Body explains anything non-obvious about the approach.
6. **Update progress.** Tick the matching sub-checkbox with `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase tick <spec> <phase> "<item prefix>"` (or `#N` for the Nth open item, which keeps backticks out of the shell). When it ticks the last open item it also flips the `progress.md` box and says `Phase N complete`. Then refresh the **Spec state** in `pr-opening.md` (phases done / left). Without Bun, edit the boxes by hand: the entry's sub-checkbox, and the `progress.md` box only when every sub-checkbox is ticked.

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

1. Run the **pre-PR checks** in `pr-opening.md`, scoped to the subprojects this PR touches. Lines like `gate: landing` point at named blocks in `docs/specs/_playbook/gates.md`; `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts gates <spec-name>` expands the ones this spec references (`gates --name <gate…>` expands any named section). Without Bun, read those sections in `gates.md`.
2. Tick each check only when it actually passes; paste the failing output instead if it doesn't.
3. Refresh the **Spec state** (phases done, branch, PR link once it exists).
4. Open the PR **off a feature branch — never to `main`**, following the PR split recorded in `pr-opening.md`. It is a draft unless project settings say `pr.draft: false` (the pack's `Settings:` line reads `PRs ready`); no `Settings:` line means draft. The PR body opens with the **Outcome** line of each phase it ships, one bullet per phase, before any technical detail.

**Checking on the PR.** Run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts pr-status [<pr>|<spec>]` (no argument: the current branch's PR). It prints the `state:` line (`merged`, `closed`, `conflicting`, `draft`, `red`, `pending`, `green`, `unknown`), the check counts, and for each failing job the failure's tail and whether it fails on main too. It never waits: run it again later rather than looping on `gh`. Without Bun: `gh pr view <n> --json state,isDraft,mergeable`, `gh pr checks <n>`, and for a failed job `gh api repos/{owner}/{repo}/actions/jobs/<job id>/logs` (`gh run view --log-failed` waits for the whole run).

**After merging main into the branch**, when settings name `gates.after-merge-main` (`after merging main: gate <name>`), run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts gates --name <name>` and work through it before pushing.

**Merging the PR** is the user's call; never merge on your own. When they say merge, use the method in `pr.merge` (`merge squash|merge|rebase`); unset → ask which. From a worktree, `gh pr merge` fails trying to check out the default branch, so merge with `gh api -X PUT repos/{owner}/{repo}/pulls/<n>/merge -f merge_method=<method>`.

Without Bun, read `docs/specs/_playbook/settings.md` for these keys and `gates.md` for the named section. No settings file → draft PRs, no after-merge gate, ask for the merge method.

Never invent a "verification" or "open PR" phase to hold this — that's what `pr-opening.md` is for.

## Task phases

A task phase (`code: false`) delivers work outside the repo. No recon waves, no preflight, no TDD, no commits of production code.

1. **Load what the spec points at.** The phase entry, plus any skill or playbook the spec's `CLAUDE.md` or the phase names for this kind of work. Follow its rules.
2. **Split the open items by who can do them.**
   - **Items you can do here** (draft the copy, write the brief, prepare the run of show, build a shareable page): do them, save the result where the project keeps it, and tick each with that file or link.
   - **Items a person must do** (record, meet, send, publish from their account): tell the user what each needs from them, in one short list. Tick an item only when they report it done, with the evidence they give.
3. **Tick with evidence**, always: `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase tick <spec> <phase> "<item prefix>" --evidence "<link, date or file>"` writes `- [x] <item> — <evidence>` and refuses anything that isn't evidence. Without Bun, write that line by hand. The doctor warns about ticks with nothing after them.
4. **Found code work?** It doesn't belong in a task phase. Add a code phase with `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase add <spec> "<title>"` (update.md → *New work → add or split a phase*) and link the two with `needs`.
5. The stopping rule (§8), end-of-chunk (§9) and handoff apply as for code phases.

## Notes

- The TDD loop is non-negotiable for production code paths. Pure scripts, throwaway prototypes, and configuration files are exempt — but most of what you'll write inside a spec is production code.
- "Test exists and passes" beats "test exists and is comprehensive." A focused test that asserts the right invariant outperforms 200 lines of edge-case ceremony around weak invariants.
- Don't write tests *for* the implementation. Write tests for the contract the unit must satisfy. The implementation should be free to change underneath.
- Per commit, the per-commit gate (or the affected slice) is the green bar; the full suite runs once, at the PR gate or in CI. Narrowing what runs never means skipping the green check: no commit without it.
