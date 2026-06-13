# Resume Mode

Two stages. **Stage A** = cheap orientation, runs every time. **Stage B** = deep context load, runs only after the user confirms a specific chunk.

The point: don't burn 100K tokens on `design.md`, `technical.md`, and filtered ledger entries before the user has even decided what to work on. Stage A reads only `progress.md`, the per-phase Goal/Implementation lines, and (if it exists) `in-flight.md`. Everything else is Stage B.

---

## Stage A — Orientation

### A.1. Existence check

If `docs/specs/<name>/` does not exist, print `Spec '<name>' not found at docs/specs/<name>/.` and stop. Do not run anything below.

If the spec is still in **prep** (`docs/specs/<name>/progress.md` does not exist — only `product-brief.md`/`research/`), there is nothing to resume yet. Read [prep.md](prep.md) instead — it resumes reconnaissance from where it left off. Do not run Stage A or Stage B below.

### A.2. Detect layout

Check whether `docs/specs/<name>/ledger/INDEX.md` exists.

- **Exists** → new layout.
- **Absent** → legacy layout. Print once: `(legacy layout detected — reading progress.md as the phase source)`.

### A.3. Render the status table

Follow `status.md` sections 3a (or 3b for legacy), 4, and 5 to produce the same 4-column table the user would see from `/spec <name> status`.

Read **only** what `status.md` requires: `progress.md` plus per-phase Goal / Implementation guidance lines from each phase entry. Do **not** read `CLAUDE.md`, `design.md`, `technical.md`, `code-map.md`, or any ledger entry files in this stage.

### A.4. Read in-flight (only if it has substantive content)

If `docs/specs/<name>/in-flight.md` exists, read it. Then:

- **Skip the block entirely** if the file is empty, missing, or contains only filler ("No pending work", "Clean boundary reached", a date stamp, a reassurance that the previous session ended cleanly). Absence is itself the signal — never state it.
- **Otherwise**, summarize the substantive contents as bulletpoints under a `**Last session:**` heading.

Bulletpoint rules:

- One bullet per discrete fact or pending item. **Maximum 5 bullets.**
- **Each bullet ≤ 15 words.** If a thought needs more, split it.
- **No editorial framing.** Banned phrases: "The handoff also flagged…", "Next agent should…", "It's worth noting…", "Note that…". State the fact directly.
- Reference ledger entries by filename only: `decision-foo.md`, not the full path.
- Drop session metadata (dates, agent identifiers) unless directly relevant to picking the work back up.

Concrete shape (compare against the verbose paragraph form this replaces):

```
**Last session:**

- Phase 2 closed (revised) — Java bounded context replaced TS profile data. See `decision-java-service-bounded-context.md`.
- 6 ledger entries superseded; 3 new principle/gotcha entries seeded.
- Studio identity locked: Northshore Dance Academy, Sea Breeze FL, EST, USD, ballroom.
```

### A.5. Suggest the next chunk

Deterministic rule, no extra context required:

1. **Active phase** = the first phase whose top-level checkbox in `progress.md` is `[ ]`.
2. **Next chunk** = the first cluster of unchecked sub-checkboxes inside that phase's entry.

A "cluster" is a contiguous run of `- [ ]` lines under the same heading. If the unchecked items span multiple sub-headings or are split by checked items, take the first contiguous run, capped at 5 items.

Output, immediately after the status table (and the `**Last session:**` block if rendered):

```
**Suggested next:** Phase <N> — <name>

- <sub-item 1>
- <sub-item 2>
- <sub-item 3>
```

Then **stop**. No CTA, no "Reply with X" prompt — the suggestion stands as a question by its placement, and the user replies in whatever feels natural.

Bullet rules:

- ≤ 5 sub-items, from the first contiguous run of unchecked items in the active phase entry.
- **Each bullet ≤ 20 words.** Strip explanatory prose; keep the action.
  - Good: `3a. Author NorthshoreDanceAcademy profile component`
  - Bad: `3a. Author NorthshoreDanceAcademy profile component under backend/src/main/java/dance/crm/platform/demofixture/domain/profile/ (highest priority — blocks SPEC #1 Phase 5)` — that path detail and priority annotation belong in Stage B, not here.
- **No trailing paragraph** elaborating on parallelizable tasks, blockers, or rationale. If a parallel task matters at Stage A scale, mention it as one extra bullet: `- (parallelizable: 4-pre, 4a)`.

If `in-flight.md` was non-empty (rendered in A.4), the suggested chunk still appears — but its bullets must not duplicate items in the `**Last session:**` block.

### A.6. Stop

Wait for the user. Do not load Stage B yet — not even speculatively.

---

## Stage B — Deep context load

Triggered when the user confirms a chunk. **Read intent, not magic words.** Any of the following counts as confirmation:

- **Affirmatives:** `yes`, `yep`, `yeah`, `sure`, `ok`, `okay`, `go ahead`, `do it`, `proceed`, `sounds good`, `let's go`, `let's do this`.
- **Action verbs:** `execute`, `start`, `run`, `implement`, `build`, `load`, `do this phase`.
- **Bare phase reference:** `phase 3a`, `3a`, `the next one`, `that one`.
- **A different phase pick:** "actually let's do phase 4 first" → load Stage B context for phase 4 instead of the suggested one.

If the user asks a design question, raises a concern, or wants to discuss decisions / past choices / the spec itself, **stay in conversation** — load only the specific files needed to answer, not the full Stage B set.

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
