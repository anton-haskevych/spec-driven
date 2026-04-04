# Create Mode

You are guiding a full product spec session for `$ARGUMENTS`. The output is a structured spec folder at `docs/specs/$ARGUMENTS/` with 4 files.

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

Create implementation phases with concrete checkboxes:
- Group by deployable increments (each phase should be independently shippable)
- Include dependencies between phases
- Add success metrics where measurable
- List files to touch

No "Phase 1: TBD" — every checkbox should describe a specific deliverable.

### 6. Write

Create the spec folder with 4 files:

#### `docs/specs/$ARGUMENTS/CLAUDE.md`

Include YAML frontmatter with metadata. Propose values from the taxonomy (already injected in SKILL.md) based on conversation context. If unsure between two values, ask the user.

```markdown
---
created: <ISO 8601 with timezone, e.g. 2026-03-13T18:30:00+02:00>
updated: <ISO 8601 with timezone>
status: draft
area: [<from taxonomy, can be multiple>]
domain: [<from taxonomy, can be multiple>]
scope: [<from taxonomy, can be multiple>]
---

# [Feature Name] Spec

## Files

| File | Purpose |
|------|---------|
| `design.md` | Product & UX spec — wireframes, copy, decisions |
| `technical.md` | API contracts, architecture, data models |
| `progress.md` | Implementation phases, checklists, notes, TODOs |

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
- Files to touch
- Integration points with existing systems

#### `docs/specs/$ARGUMENTS/progress.md`

Implementation tracking containing:
- Success metrics (what we'll measure)
- Implementation phases with checkbox lists
- MVP task list (ordered by dependency/difficulty)
- Implementation notes (decisions made during build)
- TODO Later (post-MVP items)
- Decisions locked for MVP

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
- Progress checkboxes should be specific enough that checking one off is unambiguous
- Adapt tone and depth to the project — a startup MVP spec reads differently from an enterprise feature spec
