# Resume Mode

Two stages. **Stage A** = cheap orientation, runs every time. **Stage B** = deep context load, runs only after the user confirms a specific chunk.

The point: don't burn 100K tokens on `design.md`, `technical.md`, and filtered ledger entries before the user has even decided what to work on. Stage A reads only `progress.md`, the per-phase Goal/Implementation lines, and (if it exists) `in-flight.md`. Everything else is Stage B.

---

## Stage A — Orientation

### A.1. Existence check

If `docs/specs/<name>/` does not exist, print `Spec '<name>' not found at docs/specs/<name>/.` and stop. Do not run anything below.

### A.2. Detect layout

Check whether `docs/specs/<name>/ledger/INDEX.md` exists.

- **Exists** → new layout.
- **Absent** → legacy layout. Print once: `(legacy layout detected — reading progress.md as the phase source)`.

### A.3. Render the status table

Follow `status.md` sections 3a (or 3b for legacy), 4, and 5 to produce the same 4-column table the user would see from `/spec <name> status`.

Read **only** what `status.md` requires: `progress.md` plus per-phase Goal / Implementation guidance lines from each phase entry. Do **not** read `CLAUDE.md`, `design.md`, `technical.md`, `code-map.md`, or any ledger entry files in this stage.

### A.4. Read in-flight (only if it exists)

If `docs/specs/<name>/in-flight.md` exists and is non-empty, read it. The file is small; cost is negligible. Quote it under a `**Previous session left:**` heading after the table.

### A.5. Suggest the next chunk

Deterministic rule, no extra context required:

1. **Active phase** = the first phase whose top-level checkbox in `progress.md` is `[ ]`.
2. **Next chunk** = the first cluster of unchecked sub-checkboxes inside that phase's entry.

A "cluster" is a contiguous run of `- [ ]` lines under the same heading (e.g. all unchecked items under `## Deliverables`). If the unchecked items span multiple sub-headings or are split by checked items, take the first contiguous run, capped at 5 items.

Output, immediately after the status table (and the in-flight quote if present):

```
**Suggested next chunk:** Phase <N> — <name>

- [ ] <sub-item 1>
- [ ] <sub-item 2>
- [ ] <sub-item 3>

Reply "load" to deep-read the relevant context for this chunk, or tell me what
you'd rather work on (different phase, different sub-items, design discussion,
review, etc.).
```

If `in-flight.md` is non-empty, replace the suggested-chunk block with:

```
**Previous session left state in-flight.** Pick up there?

> <quote in-flight.md contents>

Reply "load" to deep-read the relevant context, or tell me to start somewhere
else.
```

### A.6. Stop

Wait for the user. Do not load Stage B yet — not even speculatively.

---

## Stage B — Deep context load

Triggered when the user confirms a chunk. Confirmation signals: `load`, `yes`, `let's do this`, `proceed`, `go`, naming a different but specific chunk, or otherwise indicating intent to start work.

If the user instead asks a design question or wants to discuss something (e.g. "why did we choose X?"), stay in conversation — load only the specific files needed to answer, not the full Stage B set.

### B.1. Read stable references + active phase

In parallel:

- `CLAUDE.md`
- `design.md`
- `technical.md`
- The active phase entry via the pointer in `progress.md` (flat file or folder's `plan.md`)

If the user named a different phase or chunk in their confirmation, follow that pointer instead.

### B.2. Read scoped ledger and code-map

In parallel:

- `code-map.md`
- `ledger/INDEX.md` (warm cache)

**Filter `ledger/INDEX.md` by phase scope** (rules in `SKILL.md`):

- Always include entries tagged `general` or containing `load-bearing`
- Include entries whose `[applies-to]` matches the active phase: exact `phase <N>`, enumeration containing `N`, or open-ended `phase <M>+` where `M ≤ N`
- Skip entries with a `superseded-by:` field

Open **only the matching ledger entries**. Never read the entire `ledger/` folder blindly. The filter is the whole point.

### B.3. Filter code-map to the active phase

Pick the rows in `code-map.md` whose file paths appear in the phase entry's "Files to touch" list (or are referenced by name in its implementation guidance). Don't dump the whole code-map.

### B.4. Read supplementary phase files only when linked

Supplementary files inside a folder-shape phase folder (`phases/phase-<N>-<slug>/<other>.md`) are **not** read automatically. If the phase's `plan.md` explicitly links to one as required reading for this chunk, open that file — and only that file.

### B.5. Hand off to execute mode

Once Stage B context is loaded, read [execute.md](execute.md) and follow it. The execution loop owns the chunk from this point: TDD per unit, commit per logical change, mini-progress-update per chunk, full `/spec handoff` before the context budget runs out.

---

## Legacy fallback

For legacy specs (no `ledger/INDEX.md`):

- **Stage A** still works — `status.md` section 3b parses inline phase blocks from the legacy `progress.md`. The notice from A.2 is the only legacy-specific output.
- **Stage B** replaces section B.2 (ledger filter) with reading the legacy `progress.md` in full, including any `## Implementation Notes` section, session blocks, and handoff blocks. Surface the most recent session/handoff content briefly so the user sees where things were left.
- No auto-migration — that's `update.md`'s job, only on explicit user confirmation.

---

## What this mode does not do

- **Does not auto-start coding.** Stage A always halts for confirmation; Stage B hands off to `execute.md` only after the user picks the chunk.
- **Does not skip Stage A even when context is low.** The status table is the contract — the user always sees the full picture before deciding.
- **Does not reload context that's already loaded.** If the user confirms a chunk and Stage B was already run earlier in the session for the same phase, do not re-read.
