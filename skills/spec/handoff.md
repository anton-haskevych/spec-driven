# Handoff Mode

The session is ending. A fresh agent will start from zero context — the spec is the only bridge. Whatever isn't written down is lost.

This mode runs when the session is actually ending: explicitly (`/spec handoff`) or from execute mode's stopping rule. A phase completing does **not** trigger it — that is `update.md` → *Close the phase*, which reuses this file's *Reflect and redirect* and *Commit* but keeps the session going.

**Key rule:** the handoff brain dump is not removed — it is **redirected**. The same reflection that used to produce a `### Handoff — YYYY-MM-DD` block in `progress.md` now routes its output into focused artifacts: durable learnings become ledger entries, ephemeral state becomes this phase's hand-off note (`phase note`). Handoff never edits `progress.md` by hand; for a spec on the board, §3's `join --tidy` cuts it to its stub.

See `SKILL.md` for the full layout and the brain-dump redirection rules.

## 0. Preconditions

Apply the entry's [workflow capabilities](capabilities.md) throughout this mode. `local-pilot` follows the local restricted handoff path there: no publication, claim release, prune, PR/babysitter decisions or board/launch-based Next sessions, and no managed-success claim.

Run SKILL.md → *Preconditions*. A legacy spec without `ledger/` follows `legacy-layout.md` → `create`, `prep`, `review`, `handoff` (offer to create the ledger before writing entries).

## 1. Run the update flow

If there is any implementation work to record (commits since last session, unchecked items that are now done, uncommitted changes):

- Follow `update.md` from *Load current state* through *Report and nudge* fully: load state, cross-reference git, tick and change tasks through the commands (SKILL.md → *Plan changes*), capture durable learnings into the ledger, update `code-map.md`.
- Leave `pr-opening.md` alone: phases done / left live in the phase state, status and the board. Do **not** tick the pre-PR checkboxes here; those are ticked only when the PR is about to open.

If there is NO implementation work (e.g., you only added spec details, did research, or had a design conversation):

- Skip to section 2, but still check `git status` — if spec files were modified, note that.

## 2. Reflect and redirect

This is the critical step. Reflect beyond what the structured `update.md` flow already captured. Think about what YOU know right now that a fresh agent won't — and **route each piece of knowledge to the right artifact**.

### Reflection prompts

Walk through these explicitly:

- **Business decisions / pivots / approach changes** — what did we decide this session that future agents must know?
- **Hard-won gotchas** — what traps bit us that would bite the next agent?
- **Standing principles / rules of thumb** — did any cross-cutting rules emerge? ("always X before Y", "never use Z in this codebase")
- **Newly understood domain facts** — what did we learn about how the data model, entities, or features actually work, beyond what the existing spec documented?
- **Implicit assumptions** — what are we relying on that isn't written down anywhere?
- **Environment state** — branches, migrations pending, services running, feature flags, fixture data
- **Conversations or decisions made with the user** that didn't make it into `design.md` or `technical.md`
- **Half-built state** — handler wired but mapper not done; test exists but skipped; migration written but not applied
- **Blocked or open questions** — what needs user input before the next agent can proceed?

### Redirect each reflection item

For each item that came out of the reflection, write it to the right place. **Nothing goes into `progress.md`.**

#### Durable learnings → new ledger entries

If the item is cross-phase, a standing rule, a domain fact, or a decision that future sessions need to know:

- Write `docs/specs/<name>/ledger/<kind>-<slug>.md` per SKILL.md → *Ledger entry format* and *Write discipline*: narrowest correct `applies-to`, `load-bearing` only for must-always-surface knowledge, update a near-duplicate in place, add the INDEX row. In the body, capture the reasoning, not just the conclusion.

#### Ephemeral pending state → the phase's hand-off note

If the item is half-built code, session-specific "pick up from here" instructions, open questions, or environment state that only matters until the pending work is resumed:

- Write the note to a scratch file in the shape below, then run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase note <spec> <phase> --file <that file>`. It writes the note where the next session's pack reads it: `in-flight/phase-<id>.md` for a spec in files (overwriting the file but keeping its `## Needs you`), the phase's record document for a spec on the board. Pass its `note:` line on. A question for the user is never part of the note: `phase park` asks it (one open question per phase) and `phase unpark` records the answer, and the board reads them from where `phase park` put them. One note per phase is what keeps two sessions on one spec from colliding. The note holds only the current pending state.
- A session with no phase (the PR gate) writes `in-flight/pr-<group>.md` by hand, and commits it.
- A legacy `docs/specs/<name>/in-flight.md` from before the split: move the part about this phase into its note and leave the rest; delete the legacy file once nothing pending is left in it.

- Use this shape:

  ```markdown
  # In-flight state

  **Session ended:** <YYYY-MM-DD>
  **Active phase:** <N> — <Name>

  ## Where things stand

  - [what's working right now — "X is deployed and tested", "Y renders correctly"]
  - [what's half-built — "handler wired but mapper not done", "test exists but skipped"]
  - [what's blocked — "needs user input on Z", "waiting for API access"]

  ## Implicit context

  - [environment state — branches, migrations pending, services running, feature flags]
  - [conversations or decisions made with the user that didn't make it into design.md]

  ## Pick up from here

  - [the single most actionable first step for the resuming agent]
  - [any setup needed — "run migrations", "check out branch X", "read file Y first"]
  ```

Omit subsections that have nothing to report. Err on the side of writing too much — the next agent can skim, but can't recover what you didn't write.

#### Clean boundary? Clear this phase's note

If the session ended at a **clean boundary**, don't write new pending state — clear this phase's note instead.

**Clean boundary definition (all three must be true):**

1. All current-phase sub-checkboxes in the phase entry are checked (the phase is fully done)
2. No staged-but-uncommitted spec changes
3. No open questions or blockers flagged during this session, and no unanswered question on the phase (the pack's `Parked:` line)

When at a clean boundary, run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase note <spec> <phase> --clear` (for `in-flight/pr-<group>.md`, `git rm` it). No note means nothing is pending; there is no marker to write. A note that must outlive the phase, such as a deploy still to do on a ticked phase, stays.

### Explicit prohibitions

Handoff **must not**:

- **Append anything to `progress.md`.** No handoff blocks, no session logs, no "Implementation Notes" entries. Progress.md stays a thin index.
- **Tick, edit or add a plan line by hand.** Ticks and plan changes found while reflecting go through `spec.ts phase …` (SKILL.md → *Plan changes*); §1's update flow runs them.
- **Forward-cite ledger entries for phase N+1.** Do not decide which ledger entries will be relevant for the next phase. That's `resume.md`'s job at pickup time — it filters INDEX by the active phase.
- **Read or prepare the next phase's context.** Handoff's sole responsibility is closing out the current phase. Preparing the next phase is the resume agent's responsibility, with a hot cache at pickup time and the filtered ledger as the glue.

## 3. Commit

First run the doctor on this spec (SKILL.md → *Tools*):

```bash
bun ${CLAUDE_SKILL_DIR}/tools/spec.ts doctor <spec-name>
```

Fix every `error` line and any `warning` this session caused. For example, a phase you ticked while a sub-item is still open, or a ledger entry with no INDEX row. Leave older warnings alone and name them in the completion signal. Skip this step if `bun` isn't available.

Stage and commit all changes — both spec files and any implementation code:

```bash
git add docs/specs/<spec-name>/
# Also add any implementation files that were modified
git status  # verify what's staged
```

Commit with a descriptive message:

```
[handoff] <spec-name>: <1-line summary of session work>

Durable learnings captured in ledger: <comma-separated entry slugs>
In-flight state: <"pending" | "clean boundary">
Next: <what the next agent should pick up>
```

If there are no changes to commit (everything was already committed), skip this step and note it.

Then send the work to origin. `spec.ts settings` says where spec docs live (`docs on main` or `docs on branch`):

```bash
bun ${CLAUDE_SKILL_DIR}/tools/spec.ts publish-docs <spec-name>   # docs: main — pushes the branch, then publishes the spec docs
bun ${CLAUDE_SKILL_DIR}/tools/spec.ts push                       # docs: branch
```

Pushing is confined: the branch goes to its own name, and only committed spec docs go to the default branch. Keep the output for *Signal completion*. A line starting `push:` or `publish-docs:` is a refusal; print it as is and don't retry, force or work around it. `diverged on main` means main changed the same spec lines: the next session merges main, then publishes. Without Bun, run `git push -u origin "HEAD:refs/heads/$(git branch --show-current)"` and say that the docs were not published; the next publish covers everything since the last snapshot.

Then take the frozen lines out of a spec on the board: `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts join <spec-name> --tidy` (SKILL.md → *Tools* → Join). It commits on the default branch only the files no tree or `feat/<spec>*` branch still changes, and names the tree or branch holding the rest (`left …`); a spec not on the board, or one already tidy, says so. Keep its line as is for *Signal completion*: a later handoff, once that work has merged, finishes the tidy. Without Bun, skip it.

Then release this session's claims on the spec, so another session can pick the phase up: `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts claim release <spec-name>`. Keep its `claim:` lines for *Signal completion*. `phase <id> was taken over by <holder> <age> ago; your work is on <branch>` means another session took the phase with `--take-over`. Print it as is: the user needs to know their commits on that branch are now someone else's starting point. Releasing a half-done phase is safe: `claim take` refuses it in any other worktree while the work sits in this one. Then end the session's document, so the board stops counting its last stamp as work not on the remote: `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts session end` (its line is not part of the report; `no document to remove` is normal off the board). Without Bun, skip both.

Then start removing the merged trees: `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts trees prune --auto`. It returns at once: a detached process removes every worktree whose branch is merged, fully pushed and has no session open in it, with its branch, never this session's own tree, and keeps going after the tab closes. `git worktree remove` keeps any tree with edits, and folders git doesn't list as worktrees are named, never removed. This is a standing yes (given 2026-10-30, recorded in CRM's `agent-session-papercuts` brief): run it without asking, never ask before it, and never wait on it. Keep its one line (`Pruning merged trees in the background · last run: Pruned …`, or a `trees:` refusal) for *Signal completion*. Without Bun, skip it.

## 4. Signal completion

Open with SKILL.md → *Reports* (once: §1's update flow skipped its own), then print:

```
---
Handoff complete for <spec-name>.

Committed: <commit hash> — <commit message first line>
Ledger entries added: <count> — <comma-separated slugs>
In-flight state: <"has pending work" | "clean boundary">
<the Remote: line, plus any refusal line, from Commit>
<the claim: lines from Commit>
<the Pruning line from Commit>

Unblocked: <specs whose needs point at phases finished this session, from `spec.ts graph <spec-name>`; omit the line if none>
---
```

Then, in this order:

- **Crew worker** (the system prompt carries an overseer's launch brief; execute.md → *Crew worker*). This branch comes first and replaces the others: nobody reads this tab, the overseer reads the transcript. Stop every server, watcher and background shell the session started, then print after the block:
  ```
  Say if wrong: <call you made>; <call you made>
  Crew: needs you <n> (a question on the board, or its in-flight note) · say if wrong <n> · PR group ready <group | no> · next <same phase | phase <id> | nothing> · servers stopped <list | none>
  Handed off.
  ```
  Leave out *Say if wrong* when there are none. `PR group ready` means every code phase of the group is ticked and its pre-PR checks pass. End there: no §10 question, no *Next sessions*, no question of any kind. Questions for the user are already asked with `phase park`.
- **This handoff answers "Babysit it"** or **"Hold for review"** (execute.md §10): run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts launch babysit <spec-name> <group>` (with `hold` for "Hold for review") as the very last act, after the push and the claim release above, and reply with §10's line for that answer. No *Next sessions* block.
- **A PR group is ready and nobody asked**: every code phase of the group is ticked, its pre-PR checks are ticked, no answer was given in this conversation, and `pr status <spec-name> <group>` shows no ready PR (none yet, or a draft). The spec's `ship:`, else the project's `pr.ship`, answers for the user (execute.md §10 step 4): `ship: auto` acts as "Babysit it", `ship: hold-for-review` as "Hold for review", with no question. With neither, ask execute.md §10's question in place of *Next sessions* and act on the answer as §10 says; [babysit.md](babysit.md) is what the babysit session follows.
- **Otherwise** print SKILL.md → *Next sessions*, with this spec's next ready phase at 1 when it has one.

Do not ask other follow-up questions or suggest work outside that block. A reply with rows follows SKILL.md → *Next sessions* step 3; otherwise the session is ending.
