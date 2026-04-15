# Update Mode

Capture implementation progress and route new knowledge into the right artifacts. Unlike the old model, update.md does **not** append session logs to `progress.md`. Instead, it routes content into focused files: sub-checkboxes go into the phase entry, durable learnings become ledger entries, load-bearing files are recorded in code-map.md, and ephemeral state is staged for handoff (which writes `in-flight.md`).

See `SKILL.md` for the layout rules this mode relies on.

## 1. Detect layout

Check whether `docs/specs/<name>/ledger/INDEX.md` exists.

- **Exists** → new layout. Proceed through all sections.
- **Does not exist** → legacy layout. See section 11 for the legacy path.

## 2. Load current state

Read in parallel:

- `progress.md` — phase index + top-level checkbox state
- `CLAUDE.md` — frontmatter (status, area, domain, scope)
- `technical.md` — skim for planned approach (needed for divergence detection)
- `code-map.md`
- `ledger/INDEX.md`
- The current phase's entry — follow the pointer from `progress.md`, read either the flat file or the folder's `plan.md`

The "current phase" is inferred the same way `resume.md` does it: first phase with its top-level box unchecked. If multiple phases are in progress, ask the user which phase this update is for.

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
- **Do NOT create a "Implementation Notes" or "TODO Later" section in `progress.md`.** Legacy specs may still have these; leave them alone but don't add new ones.

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

For each, create `ledger/<kind>-<slug>.md` with required frontmatter:

```markdown
---
kind: <kind>
applies-to: [<scope tokens>]
created: <ISO 8601 with timezone — run the date command to get it accurate>
---

# <Title>

<body — 5-30 lines; the rule/fact + why it matters>
```

**Pick the narrowest correct `applies-to` scope:**

- `[general]` — applies to every phase. Use sparingly.
- `[phase N+]` — phase N and later. Use for decisions or principles that only become relevant once you reach that phase.
- `[phase N, M]` — specific enumeration.
- `[phase N]` — only this phase. Rare — usually this is phase-local and belongs in the phase entry, not the ledger.
- Add `load-bearing` as a composable modifier when the learning is mission-critical and must always surface: `[general, load-bearing]`.

**Prefer update-in-place over creating near-duplicates.** Before creating a new ledger entry, grep `ledger/INDEX.md` for overlapping scope + kind. If an existing entry covers the same topic, edit it instead of creating a second one.

**Append a row to `ledger/INDEX.md`** for each new entry, in the right section heading (Gotchas / Principles / Domain / Decisions / Workarounds). Row format:

```
- `<filename>` — [<applies-to>] — <one-line summary>
```

Keep the one-line summary under 80 characters.

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

- `draft` → `in-progress`: first items checked off across any phase
- `in-progress` → `done`: all top-level phase checkboxes in `progress.md` are `[x]`
- Print a notice when status transitions: "Status: draft → in-progress"

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

## 9. Auto-handoff on phase completion

If the top-level phase checkbox in `progress.md` just flipped to `[x]` (all sub-items in the phase entry are done), **do not just report it** — automatically continue with the handoff flow:

1. Read [handoff.md](handoff.md) and execute sections 2–4 (the reflection and redirect step, then commit, then signal).
2. In the handoff signal, include: `Phase [N] is complete. Phase [N+1] is ready to begin.`

This ensures the spec is always in a resumable state when a phase boundary is crossed, and that any durable learnings from phase N get captured into the ledger before the session ends.

## 10. Flat-to-folder promotion (opt-in)

If the current phase is a **flat file** and it has outgrown its scale — multiple tiers have emerged, supplementary diagrams are needed that don't fit inline, the file is getting uncomfortably long (rough heuristic: past ~200 lines or sub-structure is clearly forming) — offer to promote it to a folder.

### Promotion procedure (after user confirmation)

1. Create the folder: `phases/phase-<N>-<slug>/`
2. Create `phases/phase-<N>-<slug>/plan.md` with the flat file's entire content
3. Delete the old flat file `phases/phase-<N>-<slug>.md`
4. Update the pointer in `progress.md` from `phases/phase-<N>-<slug>.md` to `phases/phase-<N>-<slug>/plan.md`
5. The next resume/update session automatically uses the new folder path because `progress.md` is authoritative

Reverse demotion (folder → flat file) is not automated. If it's ever needed, the user does it manually.

## 11. Legacy path

For legacy specs (no `ledger/INDEX.md`):

- **Check off boxes** wherever they live in the legacy `progress.md` (since legacy specs have all checklists inline).
- **Do NOT append a new session log** to legacy `progress.md`. The new rule is enforced even on legacy specs — the old "Implementation Notes" section is left untouched but never grown.
- **Offer opportunistic `ledger/` creation:** if durable learnings emerged this session, ask the user: "This spec uses the legacy layout. Create a `ledger/` folder to capture these learnings going forward? [y/N]". If yes, scaffold `ledger/INDEX.md` and create the new ledger entries as specified in section 5. The spec is now mixed-layout — that's fine; resume's detection will pick up the ledger on future sessions.
- **code-map.md** — similarly, offer to scaffold on demand if the session introduced load-bearing files worth recording. Don't force it.
- **Leave legacy content untouched** — do not rewrite, archive, or migrate existing legacy progress.md content. The user does that manually when they choose.
