# Resume Mode

Load the spec and orient the session so you can start working immediately. Pull only the context you need for the active phase — not the whole spec history. See `SKILL.md` for the layout rules this mode relies on.

## 1. Detect layout

Check whether `docs/specs/<name>/ledger/INDEX.md` exists.

- **Exists** → new layout. Proceed through sections 2–4 and 6.
- **Does not exist** → legacy layout. Skip to section 5 for the fallback path, then present the briefing in section 6.

Do this per-spec, statelessly. Never cache the detection across specs.

## 2. Infer active phase

Parse `progress.md` checkboxes:

- The first phase whose top-level checkbox is unchecked is the **inferred active phase**.
- If multiple phases are unchecked but work is clearly in progress across more than one (e.g., partial sub-checkboxes in multiple phase entries, or an `in-flight.md` referencing a different phase than the first unchecked one), surface all in-progress phases and ask the user which to pick up. This supports parallel agent work on the same spec.
- If no phases exist yet (never-touched spec), fall back to "phase 1" and note it to the user.

Read the pointer in `progress.md` for the inferred phase — it tells you the exact path, whether the phase is flat-file (`phases/phase-<N>-<slug>.md`) or folder-shape (`phases/phase-<N>-<slug>/plan.md`). Do not guess at the path; follow the pointer.

## 3. Read core context

Read in parallel, both layouts:

- `CLAUDE.md` — frontmatter (status, area, domain, scope) + relationship to code
- `design.md` — problem, decisions, UX flows
- `technical.md` — API contracts, data models, architecture
- `progress.md` — phase index + checkbox state

## 4. Read new-layout artifacts (skip if legacy)

Read in parallel:

- `code-map.md` — tolerate empty
- `in-flight.md` — only if present and non-empty
- `ledger/INDEX.md` — the warm cache
- The inferred phase's entry via the pointer from `progress.md` — either `phases/phase-<N>-<slug>.md` or `phases/phase-<N>-<slug>/plan.md`

**Filter `ledger/INDEX.md` by phase scope.** For each row, parse the `[applies-to]` bracket:

- Always include: entries tagged `general` or containing `load-bearing`
- Include if the inferred phase number matches: `phase <N>` (exact), `phase <enumeration containing N>`, `phase <M>+` where M ≤ N
- Skip entries with a `superseded-by:` value in their frontmatter (follow the link only if explicitly needed)

Open **only the matching ledger entries**. Never read the entire `ledger/` folder blindly.

**Supplementary files inside a folder-shape phase are NOT read automatically.** If the phase's `plan.md` links to a supplementary file you need to read (e.g., "see `tier-1-student-transform.md` for the CSV column mapping"), open only that linked file.

## 5. Legacy fallback

For legacy specs (no `ledger/INDEX.md`):

- Read the whole legacy `progress.md` including any `## Implementation Notes` section, session blocks, and handoff blocks.
- Surface the latest handoff/session entries in the briefing so the user can see where things were left.
- Print a one-line notice: `(legacy layout detected — reading full progress.md as session-log source)`
- Do not attempt to auto-migrate or create new-layout artifacts during resume. That happens via `update.md` on the user's explicit confirmation.

## 6. Present a session briefing

Output a concise briefing (not a wall of text — the user already wrote the spec):

```
## [Feature Name] — [status]

**What**: [1-sentence summary of the problem/feature]
**Key decisions**: [2-3 most important decisions from design.md, with the "why"]
**Phase**: [inferred phase number + name]
**Progress**: [N/M sub-checkboxes done in the active phase]
**Next up**:
- [ ] First unchecked sub-item from the active phase entry
- [ ] Second unchecked sub-item
- [ ] ...
```

**If new layout and `in-flight.md` is non-empty**, add:

```
**In-flight pending state**:
[quote or summarize the contents of in-flight.md — this is what the previous
session left half-built or blocked on]
```

**If new layout and filtered ledger entries are present**, add:

```
**Applicable learnings** (from ledger):
- `gotcha-money-parsing.md` [general] — parseFloat drops centavos, use regex
- `decision-csv-pivot.md` [phase 8+] — API dead, CSV is authoritative
- `principle-no-schema-without-fixtures.md` [general] — observe real source data first
```

List only the ledger entries that passed the filter. One line per entry: filename + scope tag + the one-line summary from INDEX.

**If `code-map.md` has load-bearing files relevant to the active phase**, add:

```
**Code touchpoints**:
- `path/to/file.ts` — [role from code-map.md]
- `path/to/other.ts` — [role]
```

Pick the code-map rows that match the active phase's "Files to touch" list — do not dump the whole code-map.

**If legacy layout and session/handoff blocks exist in progress.md**, add:

```
**From previous sessions** (legacy log):
- [Gotchas]: [traps to watch out for, extracted from the latest handoff block]
- [Dead ends]: [approaches that failed — don't retry]
- [Open questions]: [decisions still needed]
- [Current state]: [what's half-built]
- [Last session recommended]: [where to start]
```

Only include subsections that have content.

## 7. Ready to work

After the briefing, ask: **"What do you want to tackle?"** — don't assume. The user might want to:

- Continue implementing the next sub-checkbox
- Revisit a design decision
- Check off completed items (route to `update.md`)
- Discuss a blocker or deviation
- Run a collegium review (route to `review.md`)
