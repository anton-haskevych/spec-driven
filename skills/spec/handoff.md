# Handoff Mode

The session is ending. A fresh agent will start from zero context — the spec is the only bridge. Whatever isn't written down is lost.

This mode can be triggered explicitly (`/spec handoff`) or automatically when a phase completes during update.

**Key rule:** the handoff brain dump is not removed — it is **redirected**. The same reflection that used to produce a `### Handoff — YYYY-MM-DD` block in `progress.md` now routes its output into focused artifacts: durable learnings become ledger entries, ephemeral state becomes `in-flight.md`. Progress.md is never touched by handoff.

See `SKILL.md` for the full layout and the brain-dump redirection rules.

## 1. Run the update flow

If there is any implementation work to record (commits since last session, unchecked items that are now done, uncommitted changes):

- Follow `update.md` sections 2–8 fully: load state, cross-reference git, apply sub-checkbox changes to the phase entry, capture durable learnings into the ledger, update `code-map.md`, bump the frontmatter timestamp.

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

- Create a new file `docs/specs/<name>/ledger/<kind>-<slug>.md` with required frontmatter:

  ```markdown
  ---
  kind: gotcha | principle | domain | decision | workaround
  applies-to: [<scope tokens>]
  created: <ISO 8601 with timezone>
  ---

  # <Title>

  <body — capture the reasoning, not just the conclusion>
  ```

- Append a row to `docs/specs/<name>/ledger/INDEX.md` under the appropriate kind section:

  ```
  - `<kind>-<slug>.md` — [<applies-to>] — <one-line summary>
  ```

- Pick the narrowest correct `applies-to` scope. See `SKILL.md` for the full grammar. Use `load-bearing` as a composable modifier (`[general, load-bearing]`) only for mission-critical knowledge that must always surface.

- **Prefer update-in-place over near-duplicates.** Before creating a new entry, scan INDEX for overlapping scope + kind and edit the existing entry when one fits.

#### Ephemeral pending state → `in-flight.md`

If the item is half-built code, session-specific "pick up from here" instructions, open questions, or environment state that only matters until the pending work is resumed:

- Write it to `docs/specs/<name>/in-flight.md`, **overwriting** any prior content. This file holds only the current pending state — history lives in git.

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

#### Clean boundary? Clear `in-flight.md`

If the session ended at a **clean boundary**, don't write new pending state — clear `in-flight.md` instead.

**Clean boundary definition (all three must be true):**

1. All current-phase sub-checkboxes in the phase entry are checked (the phase is fully done)
2. No staged-but-uncommitted spec changes
3. No open questions or blockers flagged during this session

When at a clean boundary, overwrite `in-flight.md` with an empty-with-header marker:

```markdown
# In-flight state

*No pending work — clean boundary reached <YYYY-MM-DD>.*
```

Do not delete the file outright — keeping the empty-with-header form avoids the "on-demand creation ambiguity" of a missing file.

### Explicit prohibitions

Handoff **must not**:

- **Append anything to `progress.md`.** No handoff blocks, no session logs, no "Implementation Notes" entries. Progress.md stays a thin index.
- **Forward-cite ledger entries for phase N+1.** Do not decide which ledger entries will be relevant for the next phase. That's `resume.md`'s job at pickup time — it filters INDEX by the active phase.
- **Read or prepare the next phase's context.** Handoff's sole responsibility is closing out the current phase. Preparing the next phase is the resume agent's responsibility, with a hot cache at pickup time and the filtered ledger as the glue.

## 3. Commit

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

## 4. Signal completion

Print:

```
---
Handoff complete for <spec-name>.

Committed: <commit hash> — <commit message first line>
Ledger entries added: <count> — <comma-separated slugs>
In-flight state: <"has pending work" | "clean boundary">

Next agent should run: /spec resume <spec-name>
---
```

If the handoff was triggered by phase completion, also print:

```
Phase <N> is complete. Phase <N+1> is ready to begin.
```

Do not ask follow-up questions. Do not suggest further work. The session is ending.
