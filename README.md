# spec-driven

A spec-driven development toolkit for [Claude Code](https://claude.ai/code). Write specifications first, review them with an expert panel, then implement with confidence.

## The workflow

```
Requirements → Create Spec → Review Spec → Update Spec → Implement → Resume → ...
```

This plugin gives you the complete lifecycle:

| Step | What you do | What the plugin provides |
|------|------------|------------------------|
| **Create** | `/spec my-feature` | Interactive spec creation — decisions, wireframes, API contracts, phases |
| **Review** | `/spec my-feature` + "review" | 4 expert agents evaluate the spec in parallel, then synthesize findings |
| **Update** | `/spec my-feature` + "update" | Captures progress, session logs, approach changes for handoff |
| **Resume** | `/spec my-feature` | Loads the spec, orients a new session, shows what's next |

No arguments required — the `/spec` skill infers the feature from conversation context.

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

Each spec lives in `docs/specs/<feature-name>/` with 4 files:

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Frontmatter (status, area, domain, scope) + relationship to code |
| `design.md` | Product & UX spec — wireframes, copy, decisions |
| `technical.md` | API contracts, architecture, data models |
| `progress.md` | Implementation phases, checklists, session logs |

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
