# Create Mode

You are guiding a full product spec session for `$ARGUMENTS`. The output is a structured spec folder at `docs/specs/$ARGUMENTS/` following the layout defined in `SKILL.md`.

## Process

Work through these 6 stages **interactively**. Ask clarifying questions at each stage — don't generate boilerplate. Use AskUserQuestion for key decisions.

### 1. Discover

Understand the problem space before designing anything.

Ask about:
- What problem does this solve? Who feels the pain today?
- Who are the target users?
- What do they do today without this feature? (workarounds, manual steps)
- Are there hard constraints? (timeline, tech debt, dependencies, compliance)
- Is this a new surface or an extension of something existing?

Search the codebase to understand what exists:
- `Glob` for related files, components, handlers, models
- `Grep` for related domain terms
- `Read` existing specs in `docs/specs/` for context, tone, and conventions
- `Read` project-level `CLAUDE.md` files to understand architecture, conventions, and stack

Adapt your technical vocabulary to match the project's stack and patterns.

### 2. Decide

Walk through key design decisions. For each decision:
- Present 2-3 options with concrete tradeoffs
- Ask the user to pick (use AskUserQuestion)
- Record the decision, what was chosen, and why

Build a decisions table:

```markdown
| Decision | What we chose | Why |
|----------|---------------|-----|
| ... | ... | ... |
```

Fill in **real** tradeoffs — not placeholder rows.

### 3. Design

Generate the UX spec:
- **ASCII wireframes** for every distinct screen state
- **Copy** — actual words the user will see, not "descriptive placeholder text"
- **UX flows** — step-by-step what happens when the user interacts
- **Edge cases** — what happens when data is missing, actions are undone, errors occur

For non-UI features (APIs, infrastructure, backend systems), replace wireframes with:
- **System diagrams** (ASCII flow diagrams)
- **Request/response examples**
- **State machine diagrams** where applicable

Ask: "Does this flow feel right? Anything missing?"

### 4. Architect

Define the technical approach:
- **API contracts** — endpoint, method, request/response shapes
- **Data models** — new fields, entities, schema changes
- **File tree** — where new code lives (follow the project's existing architecture)
- **Integration points** — what existing code is touched

Before writing this section, read the project's `CLAUDE.md` and any subsystem-level docs to understand:
- Architecture patterns (hexagonal, MVC, microservices, etc.)
- State management approach
- Testing conventions
- Code organization rules

Mirror the project's patterns — don't impose new ones.

### 5. Plan

Draft the implementation phases. **Each phase becomes its own entry inside `phases/`** — not a section in `progress.md`. This is the critical shape change from older specs.

For each planned phase, prepare:
- **Phase goal** — what ships at the end of this phase
- **Dependencies** — which earlier phases must be complete
- **Files to touch** — paths that will be edited or created
- **Implementation guidance** — prose explaining how to approach the work, how the files relate, any nuances specific to this phase
- **Sub-checkboxes** — specific, concrete deliverables
- **Phase-local notes** — gotchas or context that only matter for this phase (anything forward-propagating goes to the ledger later)

**Choose phase shape now** (per phase):

- **Default shape: flat file.** `phases/phase-<N>-<slug>.md`. Use this for phases where a single file will comfortably hold everything.
- **Folder shape at birth.** `phases/phase-<N>-<slug>/plan.md` plus supplementary files. Use this only when complexity is obvious at planning time — multi-tier phases, phases with known sub-plans or wireframes that don't fit inline, phases that will need fixture notes or scratch research files alongside the main plan.

Propose the shape explicitly per phase and ask the user to confirm. Default to flat file unless the phase clearly warrants a folder.

**Slug rules:** each phase needs a short, unique, descriptive kebab-case slug (e.g., `canonical-schema`, `migration-runner`, `csv-import`). Check for slug collisions across phases and ask the user to disambiguate if two are similar.

No "Phase 1: TBD" — every phase should describe a specific deliverable before you write it.

### 6. Write

Create the spec folder with the full file set below. Use the taxonomy values from `SKILL.md` — ask the user when you're unsure between two valid values.

#### `docs/specs/$ARGUMENTS/CLAUDE.md`

```markdown
---
created: <ISO 8601 with timezone, e.g. 2026-04-14T10:30:00+02:00>
updated: <ISO 8601 with timezone>
status: draft
area: [<from taxonomy>]
domain: [<from taxonomy>]
scope: [<from taxonomy>]
---

# [Feature Name] Spec

## Files

| File | Purpose |
|------|---------|
| `design.md` | Product & UX spec — wireframes, copy, decisions |
| `technical.md` | API contracts, architecture, data models |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail — one entry per phase, flat file or folder |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `in-flight.md` | Ephemeral pending state (on-demand) |
| `reviews/` | Collegium review snapshots (on-demand) |
| `research/` | Deep research output snapshots (on-demand) |

## Relationship to code

This spec is a *design document*, not a live mirror. For ground-truth architecture, see:
- [relevant CLAUDE.md files and feature docs in this project]
```

#### `docs/specs/$ARGUMENTS/design.md`

Product & UX spec containing:
- Purpose and problem statement
- Key decisions table (from Stage 2)
- Target audience
- Core flow / interaction model
- Screen states with ASCII wireframes or system diagrams (from Stage 3)
- Copy for each state (if user-facing)
- Edge cases
- UX rationale where relevant

#### `docs/specs/$ARGUMENTS/technical.md`

Technical spec containing:
- API contracts (endpoints, request/response shapes)
- Data models / schema changes
- Architecture (file tree, routing, state management — whatever applies)
- Constants (copy, config values, enums)
- Integration points with existing systems

#### `docs/specs/$ARGUMENTS/progress.md`

**Thin index only.** Short, scannable, pointer-driven.

```markdown
# [Feature Name] — Progress

> This file is a thin index. Phase details live in `phases/phase-<N>-<slug>.md` (flat)
> or `phases/phase-<N>-<slug>/plan.md` (folder). Forward-propagating learnings live
> in `ledger/`. Ephemeral state lives in `in-flight.md`. Never write session logs
> or handoff blocks here.

## Success metrics

- [what we'll measure]

## Phases

- [ ] Phase 1 — <Name> → `phases/phase-1-<slug>.md`
- [ ] Phase 2 — <Name> → `phases/phase-2-<slug>.md`
- [ ] Phase 3 — <Name> → `phases/phase-3-<slug>/plan.md`
- ...
```

**Do NOT add** Implementation Notes sections, TODO Later sections, Decisions tables, sub-checkboxes, or session logs to this file. Those live elsewhere per the layout in `SKILL.md`.

#### `docs/specs/$ARGUMENTS/code-map.md`

Scaffold empty with this content:

```markdown
# Code Map — [Feature Name]

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|

## External references

-
```

Tables are empty at spec birth. `update.md` fills them in as load-bearing files are introduced during execution.

#### `docs/specs/$ARGUMENTS/phases/phase-<N>-<slug>.md` (flat file shape)

One file per phase that chose flat-file shape in stage 5. Content template:

```markdown
# Phase <N> — <Name>

**Goal:** <one-sentence phase goal>

**Depends on:** <earlier phases that must be done, or "none">

**Files to touch:**
- <path/to/file>
- <path/to/file>

## Implementation guidance

<prose: how to approach this phase, how the files relate, any phase-specific nuances,
reasoning behind the planned approach>

## Deliverables

- [ ] <specific deliverable 1>
- [ ] <specific deliverable 2>
- [ ] <specific deliverable 3>

## Phase-local notes

<gotchas or context that only matter for this phase — anything forward-propagating
will move to the ledger during execution>
```

#### `docs/specs/$ARGUMENTS/phases/phase-<N>-<slug>/plan.md` (folder shape)

For phases that chose folder shape in stage 5, create the folder and put the equivalent content in `plan.md`. Supplementary files (tier breakdowns, wireframes, fixture notes) can be scaffolded alongside `plan.md` if you already know at planning time what they'll contain — otherwise leave the folder with only `plan.md` and add supplementary files during execution.

#### `docs/specs/$ARGUMENTS/ledger/INDEX.md`

Scaffold with header only:

```markdown
# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas

## Principles

## Domain

## Decisions

## Workarounds
```

Section headings are free-form — add new ones (e.g., `## Research findings`) as new kinds of entries emerge during execution.

## Files NOT scaffolded at birth

These appear on-demand later:

- `in-flight.md` — created by `handoff.md` when pending state needs to be captured
- `reviews/` — created on first collegium review via `review.md`
- `research/` — created on first deep-research output
- Supplementary files inside folder-shape phase folders — added during execution as needed
- Individual `ledger/<kind>-<slug>.md` entries — created during `update.md` or `handoff.md` when learnings emerge

Do not pre-create empty instances of these.

## After writing

Once the spec files are created:
1. Confirm the user is happy with the output
2. Offer to update relevant project docs if the feature touches existing subsystems
3. Suggest next steps (e.g., "Ready to start Phase 1?")

## Style guide

- Wireframes should be detailed enough to implement from
- Copy should be final-draft quality, not placeholder
- Decisions table entries should capture the *why* — the reasoning matters more than the choice
- Technical sections should be precise — endpoint shapes, field names, types
- Phase deliverables should be specific enough that checking one off is unambiguous
- Phase implementation guidance should explain *how files relate* and *the reasoning behind the approach*, not just restate the checklist
- Adapt tone and depth to the project — a startup MVP spec reads differently from an enterprise feature spec
