# Update Mode

Capture implementation progress and route new knowledge into the right artifacts. Unlike the old model, update.md does **not** append session logs to `progress.md`. Instead, it routes content into focused files: sub-checkboxes go into the phase entry, durable learnings become ledger entries, load-bearing files are recorded in code-map.md, and ephemeral state is staged for handoff (which writes `in-flight.md`).

See `SKILL.md` for the layout rules this mode relies on.

## 1. Preconditions

Run SKILL.md → *Preconditions*. A legacy spec follows `legacy-layout.md` → `update` instead of the sections below that target files the spec doesn't have.

## 2. Load current state

Read in parallel:

- `progress.md` — phase index + top-level checkbox state
- `CLAUDE.md` — frontmatter (status, area, domain, scope)
- `technical.md` — skim for planned approach (needed for divergence detection)
- `code-map.md`
- `ledger/INDEX.md`
- The current phase's entry — follow the pointer from `progress.md`, read either the flat file or the folder's `plan.md`

The "current phase" is the active phase from SKILL.md → *Next-chunk rule*. If multiple phases are in progress, ask the user which phase this update is for.

## 3. Cross-reference with git

Run: `git log --oneline -20` and `git diff --stat HEAD~5`

Also check: `git status` — are there uncommitted changes?

Compare recent commits against unchecked sub-items in the current phase entry. For each item, classify:

- **Done as specified** — implementation matches what the phase entry described
- **Done differently** — implemented, but approach diverged from the phase plan (note *why*)
- **Partially done** — touched but not fully complete
- **New work not in spec** — discovered dependencies, prerequisite refactors, etc.

## 4. Apply progress changes

### Check off sub-checkboxes inside the phase entry

- Edit the phase's flat file or folder `plan.md` to change `- [ ]` to `- [x]` for completed sub-items.
- **Do NOT check off or modify anything in `progress.md`** except in the narrow case below.

### Update the top-level phase checkbox in progress.md

- Only flip a top-level phase checkbox in `progress.md` to `[x]` when **all** sub-checkboxes in that phase's entry are checked.
- Do not partially mark a phase as done at the top level.

### Add supplementary files to a folder-shape phase if warranted

- If the current phase is folder-shape and the work has produced content that needs its own file (tier sub-plan, scratch analysis, wireframe, fixture notes), create a new supplementary file inside the phase folder with a descriptive name.
- Link to it from the phase's `plan.md` so resume picks it up when relevant.
- No ceremony required — this is a normal file write during update.

### Explicit prohibitions

- **Do NOT append a session log to `progress.md`.** Session content is routed: durable → ledger, phase-local → phase entry, ephemeral → `in-flight.md` (at handoff).
- **Do NOT write implementation notes or prose guidance to `progress.md`.** Those belong in the phase entry's prose section.
- **Do NOT create a "Implementation Notes" or "TODO Later" section in `progress.md`.** Legacy specs may still have these; leave them alone (see `legacy-layout.md`).

## 5. Capture learnings into the ledger

Reflect on the session. For each item that emerged, classify it as **durable**, **phase-local**, or **ephemeral**:

### Durable (cross-phase) → new ledger entry

Learnings that will matter after this phase is done, or apply across multiple phases:

- **Approach changes / pivots** — decisions about how to implement something that should inform future work. Kind: `decision`.
- **Gotchas** — traps that bit you and would bite a future agent too. Kind: `gotcha`.
- **Standing principles** — rules of thumb that emerged ("always X before Y"). Kind: `principle`.
- **Domain facts** — how entities/features relate, how the data model really works, relationships you had to discover. Kind: `domain`.
- **Workarounds** — temporary fixes that will need revisiting. Kind: `workaround`.
- **Dead ends** — approaches that were tried and failed, with the reason (prevents future agents from re-trying them). Kind: `gotcha` (typically) or free-form.

For each, write `ledger/<kind>-<slug>.md` per SKILL.md → *Ledger entry format* (frontmatter, `applies-to` grammar — pick the narrowest correct scope; a `[phase N]`-only learning usually belongs in the phase entry instead) and *Write discipline* (update a near-duplicate in place; add the INDEX row). Body: 5–30 lines, the rule/fact + why it matters.

### Phase-local → write into the phase entry

Learnings that only matter for the current phase and won't forward-propagate:

- Add them to the phase entry's **"Phase-local notes"** section (or a free-form prose section inside the phase entry / the folder's `plan.md`).
- If the note is substantial enough to deserve its own file **and** the current phase is folder-shape, create a new supplementary file inside the phase folder instead.

### Ephemeral → stage for handoff

Half-built state, session-specific notes, "pick up from here" instructions, environment state that matters until the pending work is resumed:

- **Don't write these during update.** Stage them mentally for when `handoff.md` runs — that's where `in-flight.md` gets written.
- If you're running update but the session isn't ending, ephemeral notes can be held in conversation context and written when handoff fires.

## 6. Update code-map.md

If this session introduced a new **load-bearing** file — one a future agent would need to know about to navigate the code — add a row to `code-map.md`:

### For files introduced by this spec

Append to the "Introduced by this spec" table:

```
| File | Role | Phase |
|------|------|-------|
| path/to/new-file.ts | <short role description> | phase <N> |
```

### For existing files the spec touched meaningfully

Append to the "Existing files touched" table:

```
| File | Why we care | Ledger |
|------|-------------|--------|
| path/to/existing.ts | <why it matters for this spec> | `ledger/<entry>.md` if relevant |
```

**Discipline: load-bearing only.** If the file is trivial CRUD, generated code, or follows an obvious pattern, skip it. The goal is a short list a new agent can scan in one screen.

## 7. Update frontmatter

Bump the `updated` timestamp in `CLAUDE.md`:

```
bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh <spec-name>
```

Transition status if applicable:

- `draft` → `active`: first items checked off across any phase
- `active` → `done`: all top-level phase checkboxes in `progress.md` are `[x]`
- A legacy `in-progress` status counts as `active` — rewrite it to `active` on the next transition
- Print a notice when status transitions: "Status: draft → active"

## 8. Report and nudge

After writing changes, print what was done:

```
Updated: docs/specs/<name>/

Phase <N> — <Name>:
  ✓ Checked off <count> sub-items (now <done>/<total>)
  ✓ Added <count> ledger entries: <kind>-<slug>, <kind>-<slug>, ...
  ✓ Added <count> rows to code-map.md

Remaining in phase <N>:
- [ ] <next unchecked sub-item>
- [ ] <next unchecked sub-item>

Next phase: <N+1> — <Name> (not started)
```

If there are uncommitted changes, add:

```
You have uncommitted changes — consider committing the implementation + spec update together.
```

## 9. Close the phase

If the top-level phase checkbox in `progress.md` just flipped to `[x]` (all sub-items in the phase entry are done), **do not just report it** — close the phase so the spec is resumable at the boundary and phase N's durable learnings reach the ledger:

1. Read [handoff.md](handoff.md) and run its *Reflect and redirect* and *Commit* sections. Skip *Signal completion* — the session is **not** ending.
2. Refresh the **Spec state** in `pr-opening.md` (phases done / left).
3. Print one line: `Phase <N> complete — Phase <N+1> ready.` (or `All phases complete — see pr-opening.md for the PR gate.`), then continue with whatever the session was doing.

Ending the session is a separate decision — `/spec handoff`, or execute mode's stopping rule.

## 10. Flat-to-folder promotion (opt-in)

If the current phase is a **flat file** and it has outgrown its scale — multiple tiers have emerged, supplementary diagrams are needed that don't fit inline, the file is getting uncomfortably long (rough heuristic: past ~200 lines or sub-structure is clearly forming) — offer to promote it to a folder.

### Promotion procedure (after user confirmation)

1. Create the folder: `phases/phase-<N>-<slug>/`
2. Create `phases/phase-<N>-<slug>/plan.md` with the flat file's entire content
3. Delete the old flat file `phases/phase-<N>-<slug>.md`
4. Update the pointer in `progress.md` from `phases/phase-<N>-<slug>.md` to `phases/phase-<N>-<slug>/plan.md`
5. The next resume/update session automatically uses the new folder path because `progress.md` is authoritative

Reverse demotion (folder → flat file) is not automated. If it's ever needed, the user does it manually.
