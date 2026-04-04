# collegium

A panel of 7 expert AI agents for [Claude Code](https://claude.ai/code). Install once, use in every project.

## Agents

### Review Panel (Collegium)

Four agents that review specs before implementation, then synthesize findings:

| Agent | Role | When to use |
|-------|------|-------------|
| **principal-engineer** | Is this the right solution? | Before implementation — catches wrong-layer fixes, premature abstractions, tech debt traps |
| **integration-architect** | How does this fit? | Before implementation — catches boundary violations, data flow breaks, blast radius |
| **adversarial-tester** | What will break? | Before implementation — finds failure scenarios, edge cases, lifecycle state leaks |
| **review-synthesizer** | Unified verdict | After the 3 reviewers run — deduplicates, classifies, adds enforcement annotations |

### Standalone Agents

| Agent | Role | When to use |
|-------|------|-------------|
| **code-quality-reviewer** | Structural code quality | After writing code — finds god objects, boundary violations, duplicated logic |
| **deep-research-analyst** | Comprehensive research | Before making decisions — gathers info from multiple sources |
| **debugger** | Root-cause diagnosis | When something is broken — traces to the originating defect, never modifies code |

## Included Skills

- **code-quality-review** — Deep code quality review framework (cohesion, understandability, editability, testability, debuggability)
- **structural-principles** — Mechanism vs business logic classification, independence/reusability tests, hard size gates

Both skills are used by the `code-quality-reviewer` agent.

## Install

```bash
/plugin marketplace add anton-haskevych/collegium
/plugin install collegium
```

Or install directly:

```bash
claude plugin install collegium@collegium-marketplace
```

## Customization

### Project-specific overrides

Create `.claude/agents/<agent-name>.md` in your project to override any agent with a project-specific version. Project-level agents (priority 3) automatically override plugin agents (priority 5).

Example: your project's `.claude/agents/adversarial-tester.md` can include domain-specific entity states and common bug patterns — the plugin's generic version is silently replaced.

### Personal overrides

Create `~/.claude/agents/<agent-name>.md` to override any agent with your personal version. User-level agents (priority 4) override plugin agents (priority 5).

### Priority order

```
Project .claude/agents/ (3) > User ~/.claude/agents/ (4) > Plugin (5)
```

## How the Collegium Review Works

1. Spawn all 3 reviewers in parallel on a spec (design.md + technical.md)
2. Each reviewer evaluates from their perspective independently
3. Feed all 3 outputs to the review-synthesizer
4. The synthesizer deduplicates, classifies (consensus / unique-insight / contradiction), and assigns enforcement mechanisms

The review panel is designed so each reviewer stays in their lane — no overlap, no redundant findings.

## Constraints

Plugin agents cannot use `hooks`, `mcpServers`, or `permissionMode` frontmatter fields (Claude Code security restriction). These agents are designed to work without them. If you need those features, copy the agent `.md` file into your `.claude/agents/` directory.

## License

Apache 2.0
