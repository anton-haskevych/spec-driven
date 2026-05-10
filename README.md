# spec-driven

A spec-driven development toolkit for [Claude Code](https://claude.ai/code). Write specifications first, review them with an expert panel, then implement with confidence.

## The workflow

```
Create → Review → Implement → Update → Handoff → Resume → ...
```

This plugin gives you the complete lifecycle:

| Step | What you do | What the plugin provides |
|------|------------|------------------------|
| **Create** | `/spec my-feature` | Interactive spec creation — decisions, wireframes, API contracts, per-phase plans |
| **Review** | `/spec my-feature` + "review" | 4 expert agents evaluate the spec in parallel, synthesize findings, write immutable `reviews/<date>.md`, and extract actionable items into the ledger |
| **Update** | `/spec my-feature` + "update" | Checks off sub-items inside phase entries, captures durable learnings as ledger entries, updates the code map |
| **Status** | `/spec my-feature status` | Print a 4-column phase snapshot — Phase, Status (active / WIP / done ✅), Delivers, Work — without the resume briefing. `Work` falls back to `N/A` if the phase has no implementation guidance. |
| **Handoff** | `/spec my-feature` + "handoff" | Reflects on the session and redirects findings: durable learnings → ledger, pending state → `in-flight.md`. Commits and signals. |
| **Resume** | `/spec my-feature` | Loads the spec, infers the active phase, pulls only the ledger entries relevant to that phase, and presents a bounded briefing |

No arguments required for the feature name — the `/spec` skill infers it from conversation context. **Sub-commands** (`create`, `resume`, `review`, `update`, `handoff`, `status`) can lead or trail the feature name: `/spec resume my-feature`, `/spec my-feature resume`, or `/spec resume` (alone, with the feature inferred from context) all work.

## The review panel

When you trigger a review, 4 agents launch in parallel:

| Agent | Central question | What it catches |
|-------|-----------------|----------------|
| **principal-engineer** | Is this fundamentally right? | Wrong-layer fixes, premature abstractions, tech debt traps |
| **integration-architect** | How does this fit? | Boundary violations, data flow breaks, blast radius |
| **adversarial-tester** | What will break? | Edge cases, lifecycle state leaks, concurrency, null guards |
| **code-quality-reviewer** | How does this affect code quality? | God objects, duplicated logic, testability gaps |

After all 4 return, the **review-synthesizer** combines findings: deduplicates, classifies signal (consensus / unique-insight / contradiction), and assigns enforcement mechanisms.

## Standalone agents

| Agent | Role | When to use |
|-------|------|-------------|
| **deep-research-analyst** | Comprehensive research | Before creating a spec — gathers info from multiple sources |
| **debugger** | Root-cause diagnosis | During implementation — traces to the originating defect, never modifies code |

## Included skills

| Skill | Used by | Purpose |
|-------|---------|---------|
| **spec** | You (via `/spec`) | The core spec lifecycle — create, review, update, resume |
| **code-quality-review** | code-quality-reviewer agent | Deep quality review framework |
| **structural-principles** | code-quality-reviewer agent | Mechanism vs business logic classification, size gates |

## Install

```bash
/plugin marketplace add anton-haskevych/spec-driven
/plugin install spec-driven
```

## Spec file structure

Each spec lives in `docs/specs/<feature-name>/`. The layout separates **stable reference** (design, technical), **thin index** (progress), **per-phase detail** (phases folder), **forward-propagating learnings** (ledger), and **ephemeral state** (in-flight):

```
docs/specs/<feature-name>/
├── CLAUDE.md               # metadata + relationship to code
├── design.md               # stable reference — problem, decisions, UX
├── technical.md            # stable reference — contracts, architecture
├── progress.md             # thin index: phase list + checkboxes + pointers
├── code-map.md             # load-bearing files inventory
├── in-flight.md            # ephemeral pending work (on-demand)
├── phases/                 # per-phase detail (see below)
│   ├── phase-1-<slug>.md   #   flat file — small phase
│   └── phase-8-<slug>/     #   folder — complex phase with supplementary files
│       ├── plan.md
│       └── ...
├── reviews/                # on-demand — dated YYYY-MM-DD-<slug>.md, immutable
├── research/               # on-demand — dated YYYY-MM-DD-<slug>.md, immutable
└── ledger/                 # forward-propagating learnings
    ├── INDEX.md            # warm cache — one row per entry with [applies-to] tag
    └── <kind>-<slug>.md    # kinds: gotcha, principle, domain, decision, workaround, …
```

### The ledger model

The ledger holds small files, each one a durable learning that forward-propagates across phases. Entries are tagged with `applies-to:` scopes (`[general]`, `[phase 5+]`, `[phase 6, 7]`, `[general, load-bearing]`) and indexed in `ledger/INDEX.md` as the warm cache. When resuming work, the skill filters the index by the active phase's scope and opens only the relevant entries — so a new session never has to scan the whole ledger or read a bloated progress file.

### Per-phase shape

Every phase lives in its own entry inside `phases/`. Small phases are flat `.md` files. Complex phases are folders containing `plan.md` plus supplementary files (tier breakdowns, sub-plans, wireframes, fixture notes). A phase can start as a flat file and be promoted to a folder later, when it outgrows single-file scale. `progress.md` points at each phase with a direct path, so resume always knows where to go.

### Handoff redirects the brain dump

The handoff "brain dump" that reflects on a session — business decisions, problems encountered, reasoning behind approach changes — is not appended to `progress.md`. Instead it's **redirected**: durable learnings become ledger entries (`decision-*`, `gotcha-*`, `principle-*`, `domain-*`), and ephemeral "pick up from here" state goes to `in-flight.md`. Nothing gets lost; nothing bloats.

### Legacy specs

Specs created before this layout are auto-detected (by the absence of `ledger/INDEX.md`) and read via a legacy fallback path. Update mode never appends new session logs to a legacy `progress.md`, and can opportunistically create a `ledger/` folder on request so old specs can incrementally adopt the new model.

## Customization

### Project-specific overrides

Create `.claude/agents/<agent-name>.md` or `.claude/skills/spec/` in your project to override any agent or skill with a project-specific version. Project-level definitions (priority 3) automatically override plugin definitions (priority 5).

Example: your project's `.claude/agents/adversarial-tester.md` can include domain-specific entity states, lifecycle patterns, and common bug references.

### Taxonomy

The plugin ships with a generic taxonomy (status, scope, area, domain). To customize for your project, create `.claude/taxonomy.md` with your own controlled vocabulary — the spec skill will pick it up automatically.

### Priority order

```
Project (3) > User (4) > Plugin (5)
```

## License

Apache 2.0
