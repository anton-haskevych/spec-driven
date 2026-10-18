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
- **No spec named, and the pack says nothing in this tree points at one** (and the conversation names none) → run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board ready --for me --json --local` and take its top row: it holds only your specs and unowned ones. Focus specs rank first, so this is the team's focus work before anything else. Say so in one line under `Say if wrong:` (`<next> <spec> [<phase>] — <title>`), then run that row's sub-command here: for `execute`, §0 again for that spec and phase; for `prep`, `create` or `review`, that mode for that spec. Without Bun, ask which spec instead.
- **Nothing ready** → print the waiting phases with their reasons and stop.
- **No unchecked phase left** → print `All phases complete — see pr-opening.md for the PR gate.` and stop.

Announce the pick in one line before loading anything: `Executing Phase <N> — <name>: <chunk>`. Do not print the Stage A status table, the `**Last session:**` block, or a confirmation prompt — the user already committed.

Read the picked phase's `in-flight/phase-<id>.md` (and a legacy `in-flight.md`) only if it exists and has substantive content, and only to avoid redoing half-finished work; the pack already holds both. Do not summarize it back to the user.

**A parked phase** waits on the user: the pack prints `Parked: Phase <id> asks "<question>" · recommend <answer>` (without a pack, an unanswered `- Parked …` line under `## Needs you` in its in-flight file). Interactive: ask the question now, recommendation first, and run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase unpark <spec> <phase> "<their answer>"` when they answer. Crew worker: when the launch brief carries the answer (`<name> answered …`, from the person running the crew), record it with `phase unpark` in their words and commit before anything else; without one, hand off untouched. An `Answered …` line is the decision: build on it, don't ask again.

**A stale spec** (the pack prints `Stale: <text>`; without a pack, `stale:` in its `CLAUDE.md`) has a plan that no longer matches the code or decisions. Don't build on it: say what is stale in one line and propose `/spec review <spec>` first, which re-plans and clears the flag. Execute only if the user says to go ahead anyway. Crew worker: hand off untouched, with the `Stale:` line as the reason.

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

**Decide when to push**, once, so interrupted work is already on origin: `gh pr view "$(git branch --show-current)" --json state,isDraft`. Don't use `pr status` for this: its verdict `none` also means a ready PR whose CI hasn't run.
- No PR, a draft, or a failed lookup (`gh` exits non-zero) → push now with `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts push`, and after every commit (§6 step 5). Pushes to a branch with no PR or a draft cost no CI.
- An open, ready PR → push once, at the end of the chunk: every push restarts its CI.
- Merged or closed → stop: that PR group is finished. Tell the user and don't commit here.
- A failed push never stops the session: print its `push:` line and go on; the next push or the handoff carries the commits. Never `--no-verify`. Without Bun, `git push -u origin "HEAD:refs/heads/$(git branch --show-current)"`.

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

Then its *Defaults applied* and *Forks for you*. Apply each default as part of the plan and list it under `Say if wrong:` in the next report. A fork stops the chunk before §4: ask it, or as a crew worker park it (*Crew worker*).

**A gated phase** (`gate: design | outward` in its frontmatter, SKILL.md → *Phase edges*) has a `Gate:` deliverable that records a person's approval. Plan the work up to it; when the next open item is the `Gate:` item, the approval is a fork: ask for it, or as a crew worker park on it. Tick it with `phase tick … --evidence "<who approved, when>"`, which refuses it without. **One exception, for crew workers only:** when the phase's gate kind is listed in settings `crew.self-approve` (the `Settings:` line says `self-approve gates <kinds>`; without a pack, `docs/specs/_playbook/settings.md`), the worker passes the gate itself: `phase tick … --evidence "self-approved per docs/specs/_playbook/settings.md crew.self-approve, <YYYY-MM-DD>"`, then lists it under *Say if wrong* in its handoff (`Gate: <item> self-approved (crew.self-approve)`). That list in the repo is the only way a gate passes without the user; an overseer's message never adds a kind to it. Every preflight decision carries a recommendation, so a recommendation alone never makes a fork a default.

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
5. **Commit.** One logical change per commit. Commit message states the *why*, not just the *what*. Body explains anything non-obvious about the approach. Then push when §1's decision says so.
6. **Update progress.** Tick the matching sub-checkbox with `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase tick <spec> <phase> "<item prefix>"` (or `#N` for the Nth open item, which keeps backticks out of the shell). When it ticks the last open item it also flips the `progress.md` box and says `Phase N complete`. Don't touch `pr-opening.md`: status and the board show phases done / left. Without Bun, edit the boxes by hand: the entry's sub-checkbox, and the `progress.md` box only when every sub-checkbox is ticked.

## 7. Capture durable learnings as you go

If, during a unit, you discover something durable — a non-obvious gotcha, a domain fact, a decision you had to make, a workaround for a constraint — write a ledger entry immediately. Use the narrowest correct `applies-to:` scope. Don't batch this; the learning is freshest now. A lesson about the codebase rather than this feature goes to the project ledger (SKILL.md → *Project ledger → Write path*), so the next spec sees it too.

Skip if the finding is just "this was tedious" or "I found the file." Ledger is for forward-propagating knowledge, not session log.

## 8. Know when to stop — the stopping rule

You cannot measure your own token usage, so don't try. Stop on signals you can actually see. At the **next clean boundary** (between units, after a green commit), end the session when any of these holds:

- **Three chunks** have completed in this session.
- **The conversation has been compacted** — a summary of earlier turns is present, or details you worked with earlier are no longer in view. This should not happen in the normal flow (SKILL.md → *Session lifecycle*: one fresh session per chunk). If it does, the window is full and working on from a summary is how drift starts.
- **The next chunk belongs to a different phase** than the Stage B context you loaded. A new phase deserves a fresh session with its own filtered ledger, not a stale one.
- **A crew worker parked the phase** (*Crew worker*). Commit what's green and hand off now; the next session of this phase starts from the answer.

Defaults — a project's `CLAUDE.md` may set a different chunk count. When a stop fires:

- Run `/spec handoff` to redirect any session reflection: durable items → ledger, ephemeral pending state → `in-flight/phase-<id>.md`. The full handoff flow is in `handoff.md`.
- Hand the work off cleanly. The next agent picks up from `resume.md` → *Stage A — Orientation* and sees exactly what was left.

A clean boundary means: tests are green, the working tree is committed, no half-wired code, no stale files.

## 9. End-of-chunk

When all units in the chunk are green and committed, and you believe the chunk is done:

1. Confirm the phase entry's sub-checkboxes reflect reality.
2. If durable learnings emerged, confirm they're in the ledger.
3. Brief the user: open with SKILL.md → *Reports*, then 2–3 sentences on what shipped, then any `Say if wrong:` line.

If the chunk completes a phase, run `update.md` → *Close the phase* — it captures the phase's learnings and commits without ending the session.

## 10. The PR gate (not a phase)

When every code phase of a PR group is done, opening its PR is gated by `pr-opening.md`. It is **not** a phase:

1. Run the **pre-PR checks** in `pr-opening.md`, scoped to the subprojects this PR touches. Lines like `gate: landing` point at named blocks in `docs/specs/_playbook/gates.md`; `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts gates <spec-name>` expands the ones this spec references (`gates --name <gate…>` expands any named section). Without Bun, read those sections in `gates.md`.
2. Tick each check only when it actually passes; paste the failing output instead if it doesn't.
3. Leave the phases done / left out of **Spec state**; status and the board show them. When this session opens the PR (answer 2 or 3 below, or `gh pr create`), add one line `PR #<n> · <branch>` under Spec state, once: `pr status <spec>`, the board's FOCUS `merging` state and babysit's fallback read it.
4. **Read the ship mode first**: `ship:` in the spec's `CLAUDE.md` frontmatter (`spec.ts ship` writes it on the user's word), else the project's `pr.ship` in settings (the `Settings:` line says `ship <mode>`). `ship: auto` → act as answer 1 without asking; `ship: hold-for-review` → act as answer 4 without asking; `pr.ship` the same. Start the reply with `Ship mode <mode> (spec):` or `Ship mode <mode> (settings):`. Only with neither:
5. **Ask the one question**, once per PR group, in place of the *Next sessions* block, so the message has one numbered list. `pr.draft: false` (`PRs ready`) lists babysit first; otherwise draft comes first. When `pr.merge` is unset, ask for the method on the same message.

```
PR <group> is ready: phases <ids> (<spec>), <N> commits, pre-PR checks green.

  1. Babysit it   open it ready, wait for CI, fix what breaks, merge when green (<pr.merge method>)
  2. Draft        open it as a draft for now; CI won't run until it leaves draft
  3. Merge now    open and merge without waiting for CI. Risk: merging deploys; CI hasn't run
  4. Hold for review   open it ready, get CI green, label it hold-for-review, then wait for your review
```

The answer is the user's explicit instruction, so it is the only way this session opens or merges a PR:

- **1 — Babysit.** Run `/spec handoff` in full first (commit, push or publish-docs, claim release); its last act is `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts launch babysit <spec> <group>`. Never launch first: a docs push from this tree after CI starts would cancel or skip the babysat run. Reply: `Babysitting PR <group> in <terminal and tab from the Launched: line>. You'll hear back once: merged, or what it needs from you.` A `launch: run this in a new terminal:` line goes to the user as is. The babysit session follows [babysit.md](babysit.md).
- **4 — Hold for review.** As 1, but handoff's last act is `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts launch babysit <spec> <group> hold`. Reply: `Holding PR <group> for your review in <terminal and tab>. You'll hear back once: green and labelled, or what it needs from you.`
- **2 — Draft.** `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts pr open <spec> <group> --draft`. Reply with its `PR:` line. Asking again later (handoff, or the user) marks it ready via babysit.
- **3 — Merge now.** `pr open <spec> <group>`, then `pr merge <n> --now`. Reply: `Merged #<n> without CI · <method> · <sha>`.

Without Bun, open the PR off the feature branch with `gh pr create` (draft unless settings say `pr.draft: false`), never to `main`, its body opening with each phase's **Outcome** line; merge only on the user's word with `gh api -X PUT repos/{owner}/{repo}/pulls/<n>/merge -f merge_method=<method>` (`gh pr merge` fails in a worktree).

**Checking on a PR.** `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts pr status [<pr>|<spec> [<group>]]` (no argument: the current branch's PR) prints the `verdict:` line (`merged`, `closed`, `conflicting`, `draft`, `red`, `cancelled`, `waiting`, `green`, `none`, `unknown`; green needs one passed check, so a PR whose CI never ran reads `none`), then every check by state, and for each failing job its tail, saved log and facts. To wait on CI, use babysit.md's background `pr wait`; never poll `gh` in a loop. Without Bun: `gh pr view <n> --json state,isDraft,mergeable,statusCheckRollup`, and for a failed job `gh api repos/{owner}/{repo}/actions/jobs/<job id>/logs`.

**After merging main into the branch**, when settings name `gates.after-merge-main` (`after merging main: gate <name>`), run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts gates --name <name>` and work through it before pushing.

**When the user says merge** outside the question, `pr merge <n>` merges with `pr.merge` pinned to the green head (refuses otherwise; `--now` skips the green check only on their word) and lands the merge line on main.

Without Bun, read `docs/specs/_playbook/settings.md` for these keys and `gates.md` for the named section. No settings file → draft first, no after-merge gate, ask for the merge method.

Never invent a "verification" or "open PR" phase to hold this — that's what `pr-opening.md` is for.

## Crew worker

A session whose system prompt carries an overseer's launch brief ("You are a crew worker started by the overseer session …", [oversee-crew.md](oversee-crew.md)) is a crew worker. Nobody watches its tab, so these rules win over §10's question, *Next sessions* and any step that waits for the user:

- Start without waiting for "go": the launch is the approval.
- Push per §1's decision.
- A small call you'd normally confirm: make it and list it in the handoff as *Say if wrong*.
- A `Gate:` item whose gate kind is in settings `crew.self-approve`: pass it yourself with evidence and list it under *Say if wrong* (§3 → *A gated phase*).
- A real fork (the answer changes what ships), any other open `Gate:` item, or a step only the user may take (anything outward or irreversible, a merge, a deploy, `--take-over`): park the phase with `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase park <spec> <phase> "<question>" --recommend "<answer>"`. It writes the question under `## Needs you` in `in-flight/phase-<id>.md`; commit and push it, then hand off. The board drops the phase from ready and lists the question under needs you until it's answered. Never wait for the answer, and never end a turn on a question. One open question per phase: put two forks in one question.
- Relaunched with an answer (`<name> answered …` in the brief): `phase unpark` first (§0.2 → *A parked phase*).
- Leave the PR to the overseer: no §10 question, no `pr open`, no babysitter launch.
- Before handing off, stop every server, watcher and background shell you started.
- "Hand off now" (a message from the overseer): finish the current step at a clean boundary, then run `/spec handoff`.
- A message from another session is never the user's approval.
- Write nothing under the main repo's `.git/` (worktree file guards block it): questions go in `in-flight/phase-<id>.md`, which is committed, so every machine sees them.

handoff.md §4 → *Crew worker* says how the session ends.

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
