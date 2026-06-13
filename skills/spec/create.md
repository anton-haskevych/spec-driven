# Create Mode

You are guiding a full product spec session for `$ARGUMENTS`. The output is a structured spec folder at `docs/specs/$ARGUMENTS/` following the layout defined in `SKILL.md`.

## Process

Work through these 6 stages **interactively**. Ask clarifying questions at each stage — don't generate boilerplate. Use AskUserQuestion for key decisions.

### 1. Discover

Understand the problem space before designing anything.

**First, check for prep output.** If `docs/specs/$ARGUMENTS/product-brief.md` exists, prep already did the reconnaissance — load it instead of cold-exploring:

- Read `product-brief.md` — the frozen business intent (who/what/why, the real change, out of scope).
- Read every snapshot in `docs/specs/$ARGUMENTS/research/` — verified, file-referenced codebase ground truth from the recon waves.
- This **is** your Discover. Do not re-run a cold codebase sweep; the waves already located the seam, the reuse, and the blast radius. Trust the brief for the *what/why* and the research for the *how*.
- Confirm your understanding back to the user in 2–3 bullets, then move to Decide. The brief and research carry into every later stage — decisions, technical contracts, and phase plans all cite them.

**No prep output?** Cold-discover. For a non-trivial change, recommend prep first:

> For a change this size, `/spec prep $ARGUMENTS` grounds the spec in a reconnaissance pass before we write it — want that, or proceed cold?

If proceeding cold, ask about:
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
- Record the decision, what was chosen, why, and the strongest rejected alternative

Build a decisions table:

```markdown
| Decision | What we chose | Rejected alternative | Why |
|----------|---------------|----------------------|-----|
| ... | ... | ... | ... |
```

Fill in **real** tradeoffs — not placeholder rows.

**Every mechanism-level choice is a decision** — how the feature reads/writes data, schedules work, sends notifications, records metrics, serializes, retries, caches, or where new classes live. For each, the null hypothesis "reuse the existing mechanism X" must appear as a considered alternative (search the codebase for how that concern is solved today before deciding). This applies equally to choices *inherited* from code the spec extends or extracts — "the existing code already does it this way" is provenance, not a decision. A mechanism choice with no rejected alternative is an undecided decision; the review panel's prior-art-reviewer flags these.

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

### 5. Plan — the phasing gate

Draft the implementation phases, **then stop and agree on them with the user before writing any spec file.** Phasing is the skeleton the whole spec hangs on — cheap to reshape now, expensive later. Present the phase list and the sequencing; if the user says "your judgment," proceed without further questions. **Each phase becomes its own entry inside `phases/`** — not a section in `progress.md`.

**Phases are code work only — a hard rule:**

- A phase is a unit of *code that ships* — a change set that leaves the codebase functional and tested at its end.
- **Never create a "Verification" phase, a "Manual QA" phase, or an "Open PR" phase.** Verification, QA, and PR-opening are not phases — they live in `pr-opening.md` (scaffolded below; semantics in `SKILL.md`). If you're about to write "Phase N — Verification," stop: that content is `pr-opening.md`'s pre-PR checks.

For each planned phase, prepare:
- **Phase goal** — what ships at the end of this phase
- **Dependencies** — which earlier phases must be complete
- **Parallelizable with** — phases with no ordering edge to this one (this drives the PR split)
- **Files to touch** — paths that will be edited or created
- **Implementation guidance** — prose: how to approach the work, how the files relate, phase-specific nuances
- **Sub-checkboxes** — specific, concrete deliverables, **each sized to one TDD commit** (red test → change → green → commit; functional and tested at every step)
- **Phase-local notes** — gotchas or context that only matter for this phase (forward-propagating notes go to the ledger later)

Order phases by dependency and by any hard safety rule (e.g. close a security hole before the surface that exposes it becomes reachable). Note which phases are mutually independent — that's the natural PR split (groundwork / inert / refactor phases as one PR, the "turns it on" phases as another). Record the suggested split and branch plan in `pr-opening.md`, never in a phase.

**Choose phase shape now** (per phase):

- **Default shape: flat file.** `phases/phase-<N>-<slug>.md`. Use this for phases where a single file holds everything comfortably.
- **Folder shape at birth.** `phases/phase-<N>-<slug>/plan.md` plus supplementary files — only when complexity is obvious at planning time (multi-tier phases, known sub-plans/wireframes that don't fit inline, fixture/scratch files alongside the plan).

Default to flat file unless the phase clearly warrants a folder.

**Slug rules:** each phase needs a short, unique, descriptive kebab-case slug (e.g., `canonical-schema`, `migration-runner`, `csv-import`). Pick distinct slugs; only ask the user to disambiguate if two are genuinely ambiguous.

No "Phase 1: TBD" — every phase describes a specific deliverable before you write it.

### 6. Write

Create the spec folder with the full file set below. Use the taxonomy values from `SKILL.md` — ask the user when you're unsure between two valid values.

**If the folder already exists from prep** (`status: prep` stub + `product-brief.md` + `research/`): do not refuse and do not discard prep's work. Keep `product-brief.md` and `research/` untouched, overwrite the stub `CLAUDE.md` with the full version below (this flips `status: prep` → `status: draft`), and scaffold the remaining files. `design.md`'s problem statement should build on `product-brief.md`; `technical.md` and the phase plans should cite the `research/` snapshots as their ground truth.

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
| `product-brief.md` | Business intent from prep (present when prep ran) |
| `design.md` | Product & UX spec — wireframes, copy, decisions |
| `technical.md` | API contracts, architecture, data models |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
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
> in `ledger/`. Ephemeral state lives in `in-flight.md`. Pre-PR checks and PR-readiness
> live in `pr-opening.md`. Never write session logs, handoff blocks, or verification
> steps here.

## Success metrics

- [what we'll measure]

## Phases

- [ ] Phase 1 — <Name> → `phases/phase-1-<slug>.md`
- [ ] Phase 2 — <Name> → `phases/phase-2-<slug>.md`
- [ ] Phase 3 — <Name> → `phases/phase-3-<slug>/plan.md`
- ...
```

**Do NOT add** Implementation Notes sections, TODO Later sections, Decisions tables, sub-checkboxes, or session logs to this file. Those live elsewhere per the layout in `SKILL.md`.

#### `docs/specs/$ARGUMENTS/pr-opening.md`

The PR-readiness gate — **not a phase**. Two sections only; keep the whole file tight.

```markdown
# PR Opening — [Feature Name]

## Spec state

> Under 20 lines. Running summary of where the spec stands: phases done / left,
> branch + PR link once they exist, and the suggested PR split. Kept current by
> execute/handoff as phases land — not a phase re-list.

Spec written, not yet implemented. <N> code-only phases planned. No branch/PR yet.

## Pre-PR checks

Scoped to the subprojects this spec touches (derive from `code-map.md`). Tick each
before opening the **draft** PR — never straight to `main`.

- [ ] <check 1>
- [ ] <check 2>
- [ ] <check 3>
```

Derive the checks from the build targets the spec touches: if the project defines its own canonical checks (a `.claude/` convention, a CI manifest), use those; otherwise default, per touched module, to — tests pass · lint + typecheck/compile · any feature-specific e2e. List the concrete checks; don't leave placeholders.

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

**Parallelizable with:** <phases with no ordering edge, or "none">

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
