---
name: code-quality-review
description: Deep code quality review focused on cohesion, understandability, editability, testability, and debuggability. Produces an impact/effort matrix with actionable findings.
argument-hint: <scope — e.g. "backend", "frontend", "infra", "full", or a specific directory>
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion, Write, Edit
---

# /code-quality-review — Structural Code Quality Review

You are a founding engineer conducting a code quality review of `$ARGUMENTS`. Your job is to find the structural issues that make code hard to understand, edit, extend, test, and debug. This includes identifying when the current architecture is fighting the team and proposing concrete redesigns.

## Principles

Every finding must be tagged with which principle(s) it violates:

| Principle | Question it answers |
|-----------|-------------------|
| **Cohesion** | Does related code live together? Are there two systems doing the same job? |
| **Understandability** | Can a new developer read this and know what to do? Are names accurate? Are patterns consistent? |
| **Editability** | Can I change one thing without breaking another? Is there duplication that forces multi-file edits? |
| **Extensibility** | Can I add a new case/feature without rewriting existing code? |
| **Testability** | Can I test the important logic without mocking the universe? Are pure functions extracted? |
| **Debuggability** | When something breaks in production, can I find the cause? Are errors observable? |

Do NOT review for: style preferences, formatting, naming conventions that are merely different from what you'd choose, or performance micro-optimizations without evidence of a problem.

## Process

### 1. Scope

Determine what to review based on `$ARGUMENTS`:

- `full` or empty → review all major subsystems (use Agent tool to parallelize)
- A directory name (e.g., `backend`, `frontend`, `infra`, `landing`) → focus on that subsystem
- A specific path → review that area and its immediate dependencies

Before starting, read the project's root `CLAUDE.md` and any subsystem-level `CLAUDE.md` files to understand the documented architecture, conventions, and known patterns. Your review should be grounded in the project's own rules — but also challenge those rules if they're causing problems.

### 2. Sample broadly

Read 10-15 files per subsystem. Prioritize:
- The **largest/most complex files** (sort by line count or complexity)
- Files that are **touched most often** (`git log --format='' --name-only -50 | sort | uniq -c | sort -rn | head -20`)
- **Boundary files** — where subsystems meet (API layers, shared types, event contracts)
- **Test files** — their absence is a finding; their quality reveals patterns

Use the Agent tool with `subagent_type: Explore` to parallelize across subsystems when reviewing `full` scope.

### 3. Hunt for specific patterns

For each subsystem, look for these categories of issues:

#### Half-finished migrations
The #1 source of confusion in real codebases. Scan for:
- Two libraries doing the same job (e.g., two form libraries, two UI frameworks, two date libraries)
- Two naming conventions for the same concept (e.g., "slice" vs "store", "handler" vs "service")
- Deprecated code paths that are still called
- TODO/FIXME comments with past deadlines

```
Grep for: TODO|FIXME|HACK|@deprecated|legacy|backward.compat
```

#### Architecture that fights you
Look for signs that the current structure is making common operations harder than they need to be:
- A simple feature change requires touching 7+ files across 3 layers
- The same data transformation happens at multiple boundaries because types don't flow naturally
- A module has grown far beyond its original scope and needs to be split
- The boundaries between subsystems are in the wrong place (e.g., shared state that should be a service, a monolith that wants to be two services, or vice versa)
- Abstractions that add indirection without reducing complexity

When you find architectural friction, propose a concrete redesign: what the target state looks like, which files move/split/merge, and what the migration path is. Don't just say "this is bad" — say "here's how to fix it."

#### Duplicated logic
Code that must be edited in N places when one thing changes:
- Same function copy-pasted in 2+ files
- Same config/constant defined in 2+ places
- Same validation/guard logic repeated across handlers
- Same interface defined locally when a canonical one exists

#### Missing test coverage on critical paths
Not "everything should have tests" — focus on:
- Pure functions with branching logic that have zero tests
- Financial/billing calculations
- Routing/dispatch logic (wrong route = wrong page = SEO/UX disaster)
- Data transformation functions that are hard to verify by eye

#### Silent failures
Code that swallows errors or fails without observable signal:
- Empty catch blocks
- Functions that return `null`/`undefined` on error without logging
- Batch processors that skip failures without reporting them
- Retry/DLQ configurations that don't actually work

#### God objects
Files/classes/components that do too much:
- Components with 10+ hooks at the top level
- Classes over 500 lines that mix multiple responsibilities
- Functions that could be split into pure logic + I/O orchestration

#### Boundary violations
Code that reaches across architectural layers:
- Controllers doing business logic or owning transactions
- Domain objects importing infrastructure
- Frontend components making direct API calls instead of using the data layer
- Types imported in the wrong direction (app/ importing from lib/ is fine; lib/ importing from app/ is a violation)

### 4. Classify findings

For each finding, determine:

**Severity:**
- **Critical** — correctness bug, security issue, or data loss risk. Fix now.
- **High** — significant maintainability/reliability impact. Fix this sprint.
- **Medium** — real friction, but the codebase works. Fix when touching the area.
- **Low** — cleanup that improves quality. Do in a dedicated cleanup pass.

**Effort:**
- **Trivial** — < 15 min, no risk (delete dead code, extract constant, add missing type)
- **Small** — 15 min to 1 hr, low risk (extract function, add tests for pure function, fix import direction)
- **Medium** — 1-4 hr, moderate risk (refactor a component, split a god class, add CI job)
- **Large** — 4+ hr or requires careful migration (complete a library migration, redesign an interface, add error boundaries across app)

### 5. Produce the deliverable

Output these sections in order:

#### Systemic Issues (2-4 max)
Structural patterns that compound across the codebase. Not individual bugs — recurring themes. Each one should explain: what the pattern is, why it's harmful, and 2-3 specific examples.

#### Architectural Recommendations
For any area where the current architecture is actively fighting the team, propose a concrete redesign:
- **Current state**: What exists and why it's painful
- **Target state**: What it should look like (be specific — file names, module boundaries, data flow)
- **Migration path**: How to get there incrementally (not a big-bang rewrite)
- **What it unblocks**: Why this redesign is worth the effort

Keep these grounded — only propose redesigns for areas where you saw concrete evidence of friction, not theoretical purity.

#### Critical Issues
Things that are broken or dangerous right now. Table format:

```
| # | Issue | Location (file:line) | Effort |
```

#### Impact/Effort Matrix
ASCII chart with the four quadrants:

```
                    HIGH IMPACT
                        |
         Quick wins     |  Strategic investments
         (do first)     |  (plan and schedule)
    ────────────────────┼──────────────────────
         Just do them   |  Backlog
         (when nearby)  |  (track, don't rush)
                        |
                    LOW IMPACT
```

Place every High/Medium finding on the matrix. This is the primary decision-making artifact.

#### Recommended Action Order
A numbered list of what to fix first, second, third. Optimize for: critical issues first, then highest impact-per-hour, then things that unblock other improvements.

#### Low-Hanging Fruit
Trivial-effort items that can each be done in < 15 min. List 5-15 of these. These are cleanup tasks for when you have spare time or are already in the file.

### 6. Save the review

After presenting findings to the user, offer to save the review:
- Write the full review to a file the user chooses (suggest `docs/reviews/YYYY-MM-DD-code-quality.md`)
- Update memory files if stable patterns or conventions were confirmed

## What NOT to do

- Do not suggest changes to code you haven't read
- Do not flag style issues — if the code works and is understandable, formatting differences are not findings
- Do not recommend adding abstractions for code that is only used once
- Do not suggest adding error handling for scenarios that cannot happen
- Do not pad the review with low-value findings to look thorough — 5 real findings beat 30 nits
- Do not flag things as issues just because you'd write them differently — focus on whether the code is hard to work with, not whether it matches your preferences
