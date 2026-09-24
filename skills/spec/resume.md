# Resume Mode

Two stages. **Stage A** = cheap orientation, runs every time. **Stage B** = deep context load, runs only after the user confirms a specific chunk.

The point: don't burn 100K tokens on `design.md`, `technical.md`, and filtered ledger entries before the user has even decided what to work on. Stage A reads only `progress.md`, the per-phase Goal/Implementation lines, and (if it exists) `in-flight.md`. Everything else is Stage B.

---

## Stage A — Orientation

### A.1. Preconditions

Run SKILL.md → *Preconditions*. A prep-stage spec routes to [prep.md](prep.md) — do not run Stage A or Stage B. A legacy spec applies `legacy-layout.md` → `resume` for the substitutions below; it owns the notice text.

### A.2. Render the status table

**If a `<spec-pack mode="resume">` for this spec is present** (SKILL.md → *Tools*), print its status table exactly as given, then take A.3's in-flight text and A.4's next-chunk items from the pack. Do not read `progress.md`, the phase entries or `in-flight.md`. Otherwise:

Follow `status.md` → *Read phases*, *Compute status per phase*, and *Render* to produce the same 4-column table the user would see from `/spec <name> status`.

Read **only** what `status.md` requires: `progress.md` plus per-phase Goal / Implementation guidance lines from each phase entry. Do **not** read `CLAUDE.md`, `design.md`, `technical.md`, `code-map.md`, or any ledger entry files in this stage.

### A.3. Read in-flight (only if it has substantive content)

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

### A.4. Suggest the next chunk

Apply SKILL.md → *Next-chunk rule*. No extra context required.

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
- If the pack's *Related specs* shows open `needs` ("Blocked by"), add one bullet: `- (blocked by: <spec>#<phase>, not done)`.
- If the ready set has other phases, add one bullet: `- (also ready: 3, 5)`. That replaces the hand-written parallelizable bullet.

If `in-flight.md` was non-empty (rendered in A.3), the suggested chunk still appears — but its bullets must not duplicate items in the `**Last session:**` block.

### A.5. Stop

Wait for the user. Do not load Stage B yet — not even speculatively.

---

## Stage B — Deep context load

Triggered when the user confirms a chunk. **Read intent, not magic words.** Any of the following counts as confirmation:

- **Affirmatives:** `yes`, `yep`, `yeah`, `sure`, `ok`, `okay`, `go ahead`, `do it`, `proceed`, `sounds good`, `let's go`, `let's do this`.
- **Action verbs:** `execute`, `start`, `run`, `implement`, `build`, `load`, `do this phase`.
- **Bare phase reference:** `phase 3a`, `3a`, `the next one`, `that one`.
- **A different phase pick:** "actually let's do phase 4 first" → load Stage B context for phase 4 instead of the suggested one.

If the user asks a design question, raises a concern, or wants to discuss decisions / past choices / the spec itself, **stay in conversation** — load only the specific files needed to answer, not the full Stage B set.

### B.0. One call instead of B.1–B.4

When Bun is available, run this once with the confirmed phase:

```bash
bun ${CLAUDE_SKILL_DIR}/tools/spec.ts context execute <name> <phase-id>
```

It prints the Stage B pack: the phase entry, phase-scoped ledger rows (load-bearing first), matching code-map rows, `CLAUDE.md`, in-flight and a doctor summary. Then read `design.md`, `technical.md`, only the ledger entries this chunk needs, and any supplementary phase file the entry links, and go to B.5. Fall back to B.1–B.4 when the command prints nothing.

### B.1. Read stable references + active phase

In parallel:

- `CLAUDE.md`
- `design.md`
- `technical.md`
- The active phase entry via the pointer in `progress.md` (flat file or folder's `plan.md`)

If the user named a different phase or chunk in their confirmation, follow that pointer instead.

List `research/phase-<N>/` for the active phase. Open a note only if it covers the chunk you're about to run (an interrupted earlier session) — otherwise execute's recon writes a fresh one. Never load prep snapshots at the `research/` root or other phases' folders here.

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

Once Stage B context is loaded, read [execute.md](execute.md) and follow it from *Load the principles* (its *Entry* section is for direct `/spec execute` invocations — context is already loaded here). The execution loop owns the chunk from this point: it loads `principles.md`, opens with wave-based phase-seam recon (`explore-waves` `phase-exec` lens if installed, else inline Explore waves) to lock the seam and estimate testing issues, gates on `spec-driven:phase-preflight` (plan reviewed against house idioms and canon, findings applied before decomposition), then TDD per unit, commit per logical change, mini-progress-update per chunk, full `/spec handoff` when the stopping rule fires (chunk count, compaction, or a phase change).

---

## What this mode does not do

- **Does not auto-start coding.** Stage A always halts for confirmation; Stage B hands off to `execute.md` only after the user picks the chunk.
- **Does not skip Stage A even when context is low.** The status table is the contract — the user always sees the full picture before deciding.
- **Does not reload context that's already loaded.** If the user confirms a chunk and Stage B was already run earlier in the session for the same phase, do not re-read.
