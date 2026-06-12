---
name: spec
description: Load an existing spec to resume work, update progress after implementation, review with the collegium panel, or create a new one. Use when starting a session around a feature, when the user mentions a spec by name, when asked to review/critique a spec, or after completing implementation work.
argument-hint: <feature-name>
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash, Agent
---

# /spec — Feature Spec (Resume, Update, Review, Handoff, or Create)

!`cat ${CLAUDE_SKILL_DIR}/taxonomy.md`

!`cat .claude/taxonomy.md 2>/dev/null || echo "No project taxonomy found — use free-form area/domain values."`

**If `$ARGUMENTS` is empty:** Infer the feature name from the current conversation context. Propose a kebab-case slug and ask the user to confirm before proceeding.

## Sub-command parse

Before treating `$ARGUMENTS` as a feature name, check for an explicit sub-command token.

**Sub-command set:** `create`, `resume`, `review`, `update`, `handoff`, `status`, `list`.

**Matching rule** (case-insensitive, whitespace-tokenized):

1. Split `$ARGUMENTS` on whitespace.
2. If the **first** token is in the sub-command set: `sub_command = first`, `feature = remaining tokens joined by space`.
3. Else if the **last** token is in the sub-command set: `sub_command = last`, `feature = all-but-last tokens joined`.
4. Else: no sub-command — fall through to `## Routing` below.

If `feature` is empty after extraction, infer it from conversation context (same rule as the empty-args branch above). Confirm with the user only if ambiguous. **Exception:** for `list`, an empty `feature` means "no filter — show all"; do not infer from context.

**Dispatch:**

| Token | Action |
|-------|--------|
| `create` | If `docs/specs/<feature>/` already exists, refuse with: `Spec '<feature>' already exists at docs/specs/<feature>/. Use /spec <feature> to resume, or remove the folder first.` Otherwise read [create.md](create.md) and follow it. |
| `resume` | Read [resume.md](resume.md) and follow it. |
| `review` | Read [review.md](review.md) and follow it. |
| `update` | Read [update.md](update.md) and follow it. |
| `handoff` | Read [handoff.md](handoff.md) and follow it. |
| `status` | Read [status.md](status.md) and follow it. |
| `list` | Read [list.md](list.md) and follow it. The feature name is optional — when omitted, list all specs; when present, treat it as a filter. |

For every sub-command except `create`, the sub-mode file is responsible for handling the "spec does not exist" case.

After dispatching, **stop**. Do not also evaluate the routing section below.

## Routing

(Reached only when no sub-command token was matched above.)

Check if a spec folder exists at `docs/specs/$ARGUMENTS/`.

**Spec does not exist** → read [create.md](create.md) and follow its instructions

**Spec exists** → determine intent from conversation context:
- User mentions "handoff", "hand off", "wrap up", "pass to next agent", or "closing session" → read [handoff.md](handoff.md)
- User mentions "review", "critique", "evaluate", "collegium", or asks for agents to review the spec → read [review.md](review.md)
- User just finished implementation, mentions updating/checking off items, or says "update" → read [update.md](update.md)
- Otherwise (session start, wants to work on it, mentions it by name) → read [resume.md](resume.md)

# Spec layout reference (layout v1)

All sub-modes follow the rules below. This reference is embedded in SKILL.md (not injected via `!cat`) so it always loads with the skill.

## File tree

```
docs/specs/<name>/
├── CLAUDE.md                                   # metadata + routing
├── design.md                                   # stable reference — problem, UX, decisions
├── technical.md                                # stable reference — contracts, architecture
├── progress.md                                 # thin index: phase list + top-level checkboxes + pointers
├── code-map.md                                 # load-bearing files inventory (scaffolded empty)
├── in-flight.md                                # ephemeral pending work (on-demand; created by handoff)
├── phases/                                     # parent folder for all per-phase content
│   ├── phase-1-<slug>.md                       #   flat file — default shape for small phases
│   ├── phase-2-<slug>.md
│   └── phase-N-<slug>/                         #   folder — complex phase with supplementary files
│       ├── plan.md                             #     main phase plan (mirrors the flat-file role)
│       └── <descriptive-name>.md               #     supplementary files added as needed
├── reviews/                                    # on-demand; dated YYYY-MM-DD-<slug>.md; immutable
├── research/                                   # on-demand; dated YYYY-MM-DD-<slug>.md; immutable
└── ledger/                                     # forward-propagating learnings
    ├── INDEX.md                                # warm cache: one row per entry with [applies-to] tag
    └── <kind>-<slug>.md                        # free-form kinds: gotcha, principle, domain, decision, workaround, …
```

## Artifact purposes

| Artifact | Kind | Purpose |
|---|---|---|
| `CLAUDE.md` | stable | Metadata frontmatter + file index + relationship to code |
| `design.md` | stable | Problem, decisions table, UX flows, wireframes |
| `technical.md` | stable | API contracts, data models, architecture |
| `progress.md` | small | Thin index of phases; top-level checkboxes; pointers into `phases/` |
| `code-map.md` | small | Load-bearing files this spec depends on or introduces |
| `in-flight.md` | ephemeral | Mid-session pending state; overwritten each handoff |
| `phases/phase-*.md` (flat) | small-to-medium | Per-phase plan + sub-checkboxes + guidance |
| `phases/phase-*/plan.md` (folder) | small-to-medium | Same as flat, for phases with supplementary files |
| `phases/phase-*/<supplementary>.md` | on-demand | Tier sub-plans, wireframes, fixture notes, scratch |
| `reviews/*.md` | on-demand, immutable | Collegium review snapshots; never edited |
| `research/*.md` | on-demand, immutable | Deep research output snapshots; never edited |
| `ledger/INDEX.md` | warm cache | One row per ledger entry with `[applies-to]` tag + one-line summary |
| `ledger/<kind>-*.md` | forward-propagating | Durable learnings tagged by phase scope |

## progress.md rules

- **Thin index only.** Phase list, top-level checkbox per phase, short pointer to each phase entry inside `phases/`.
- **Pointer format reflects phase shape:**
  - Flat-file phase: `phases/phase-1-canonical-schema.md`
  - Folder-shape phase: `phases/phase-8-csv-import/plan.md` (always points at `plan.md` inside the folder)
- **Sample shape:**
  ```
  ## Phases
  - [ ] Phase 1 — Canonical schema → `phases/phase-1-canonical-schema.md`
  - [x] Phase 2 — Migration runner → `phases/phase-2-migration-runner.md`
  - [ ] Phase 8 — CSV import → `phases/phase-8-csv-import/plan.md`
  ```
- **Forbidden content in progress.md:**
  - Session logs
  - Handoff brain-dump blocks
  - Gotchas / dead ends / open questions
  - Decision tables
  - Detailed sub-checkboxes
  - Implementation guidance prose
- If any of the above would otherwise be written here, redirect:
  - Durable learnings (cross-phase) → `ledger/<kind>-<slug>.md`
  - Phase-local guidance + sub-checkboxes → the phase entry inside `phases/`
  - Ephemeral mid-session state → `in-flight.md`
- A phase top-level box flips to `[x]` only when all sub-checkboxes in its phase entry are checked.

## Per-phase entry rules

- **Every phase has its own entry from birth.** Scaffolded at create time, one per planned phase, inside `phases/`.
- **Default shape: flat file** — `phases/phase-<N>-<slug>.md`. Holds phase goal, dependencies, files to touch, implementation guidance, sub-checkboxes, and any phase-local notes that don't forward-propagate.
- **Folder shape** — `phases/phase-<N>-<slug>/` with `plan.md` inside — for phases that need supplementary files (tier breakdowns, sub-plans, ASCII diagrams, fixture notes). Can be chosen at birth when complexity is known, or promoted from flat file later.
- **Promotion path (flat → folder):** when a flat phase file outgrows its scale, offer promotion. Move the flat file's content into `phases/phase-<N>-<slug>/plan.md` and delete the old flat file. Update the pointer in `progress.md`. User confirms before promotion.
- **No reverse demotion.** Folder-shape phases stay folders. A rare manual revert is possible but not automated.
- **Supplementary files inside a phase folder are NOT read by default.** Only `plan.md` is the entry point. If a supplementary file holds critical context, `plan.md` must explicitly link to it so resume picks it up.
- **Slugs must be unique across phases.** Agent proposes slugs and asks the user when two are similar.

## Ledger entry format

Every ledger entry lives at `ledger/<kind>-<slug>.md` with required frontmatter:

```markdown
---
kind: gotcha | principle | domain | decision | workaround | <free>
applies-to: [general] | [phase 5+] | [phase 6, 7] | [general, load-bearing]
created: <ISO 8601 with timezone>
superseded-by: <filename>   # optional — marks this entry as deprecated
---

# <Title>

<body — short, usually 5-30 lines>
```

### `applies-to` grammar

The bracketed value is a comma-separated list of free-form scope tokens. Resume uses it to filter the INDEX and decide which entries apply to the current phase.

- `[general]` — applies to all phases.
- `[phase N]` — exactly one phase.
- `[phase N, M, P]` — enumeration of specific phases.
- `[phase N+]` — phase N and all later phases (forward-open).
- `load-bearing` — composable modifier. When present, the entry is always surfaced regardless of phase filter. Example: `[general, load-bearing]`, `[phase 5+, load-bearing]`.

Pick the **narrowest correct scope** at write time. Use `[general]` only when the learning truly applies to every phase. Use `load-bearing` sparingly — it's for mission-critical knowledge that an agent must see regardless of which phase they're working on.

### INDEX row format

`ledger/INDEX.md` is the warm cache. One row per entry, grouped by kind via section headings:

```markdown
# Ledger Index (layout v1)

## Gotchas
- `gotcha-money-parsing.md` — [general] — parseFloat drops centavos; use strict regex

## Principles
- `principle-no-schema-without-fixtures.md` — [general] — observe real source data before writing transforms

## Domain
- `domain-invoice-line-mapping.md` — [phase 6, 7] — Momence line_item → ticket_type vs class_pass

## Decisions
- `decision-csv-pivot.md` — [phase 8+] — API path abandoned; CSV authoritative
```

### Write discipline

- **Update in place when a near-duplicate exists.** Before creating a new entry, scan INDEX for overlapping scope + kind and edit the existing entry if one fits.
- **Never delete entries.** Stale entries get a `superseded-by:` field pointing to the replacement; resume's filter excludes superseded ones.
- **Append to INDEX whenever a new ledger file is created.** Keep the row format consistent.

## in-flight.md semantics

- **Ephemeral pending state only.** Half-wired code, open session questions, "pick up from here" notes, environment state.
- **Overwritten on each handoff.** Not appended to.
- **Cleared to empty-with-header at clean boundaries.** Clean boundary = all current-phase sub-checkboxes done AND no staged-but-uncommitted spec changes AND no open questions flagged this session.
- **Git is the archive.** Past in-flight contents are recoverable from `git log -p in-flight.md`.

## reviews/ and research/ semantics

- **On-demand folders.** Created on first review/research write. Not scaffolded at spec birth.
- **Filenames:** `YYYY-MM-DD-<slug>.md`. Slug derived from the dominant theme (e.g., `phase-5-readiness`, `integration-boundaries`). Review slugs are always auto-derived (fallback: `phase-<N>-collegium`); research slugs may be confirmed with the user if ambiguous.
- **Written once, immutable, never deleted.** The file is the source of record. Do not edit after writing.
- **Extraction step:** after writing a review/research file, distilled actionable findings are copied into the ledger as separate entries; the report itself stays untouched. Review extraction is autonomous — findings are applied to the spec + ledger and committed without prompts (see review.md); research extraction may be offered interactively.

## Handoff brain-dump redirection

Handoff reflection is preserved but redirected. Reflection content goes to:

- **Ledger entries** for anything durable:
  - Business decisions / pivots → `ledger/decision-<slug>.md`
  - Hard-won gotchas → `ledger/gotcha-<slug>.md`
  - Standing rules that emerged → `ledger/principle-<slug>.md`
  - Newly understood domain facts → `ledger/domain-<slug>.md`
- **`in-flight.md`** for ephemeral state only: half-built code, "pick up from here" instructions, open session questions.

Handoff **must not**:
- Append anything to `progress.md` (no handoff blocks, no session logs)
- Forward-cite ledger entries for phase N+1 (that's resume's job at pickup time)
- Read or prepare the next phase's context

## On-demand creation rules

| Artifact | Scaffolded at spec birth? |
|---|---|
| `CLAUDE.md` | yes |
| `design.md` | yes |
| `technical.md` | yes |
| `progress.md` | yes |
| `code-map.md` | yes (empty table with header) |
| `phases/` | yes |
| `phases/phase-<N>-<slug>.md` or `phases/phase-<N>-<slug>/plan.md` | yes — one per planned phase |
| `ledger/` | yes |
| `ledger/INDEX.md` | yes (header only) |
| `in-flight.md` | no — created by handoff when pending state exists |
| `reviews/` | no — created on first review write |
| `research/` | no — created on first research write |
| Phase folder supplementary files | no — added during execution when needed |
| Individual `ledger/*.md` entries | no — created during update/handoff when a learning emerges |

## Legacy spec detection

- **Rule:** `ledger/INDEX.md` presence = new layout. Absence = legacy.
- **Legacy resume** falls back to reading the whole legacy `progress.md` including any session/handoff blocks. One-line "legacy layout detected" notice printed.
- **Legacy update** may opportunistically create `ledger/` (on user confirmation) for new learnings, but never appends a new session log to the legacy `progress.md`. Legacy content stays untouched.
- **No migration script.** Existing specs are hand-migrated by the user when they choose.

## Shared conventions

- **Timestamps:** never write by hand — run `bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh <spec-name>`
- **Taxonomy values:** use the controlled vocabulary injected at the top of this file.
- **Spec location:** `docs/specs/<name>/`
- **Style:** direct, opinionated, no filler. Use "we" for decisions, "they" for users.
