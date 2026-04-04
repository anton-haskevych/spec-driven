---
name: structural-principles
description: Universal structural quality principles for code and plans. Evaluates mechanism vs business logic separation, file/function size, composability, and reusability. Works before writing code (on plans) or after (on implementations). Trigger on "review structure", "check structure", "structural review", or when code/plans need decomposition review.
argument-hint: <scope — plan, file path, directory, or "current changes">
allowed-tools: Read, Glob, Grep, Bash, AskUserQuestion
---

# /structural-principles — Structural Quality Review

Review code or a plan for structural quality. Single question: **"Are the pieces right?"** — right size, right boundaries, right separation between what's generic and what's specific to this business case.

## The Core Split: Mechanism vs Business Logic

Every system has two kinds of code:

**Mechanism** — generic capabilities that know nothing about the business domain:
- PDF rendering, HTML formatting, email sending
- API client wrappers, DTO transformers, validators
- Date formatting, file I/O, retry logic, caching

**Business Logic** — the specific rules and workflows of THIS product:
- "Generate teacher earnings report for Q1"
- "Send onboarding sequence when trial starts"
- "Calculate commission based on tier + region"

The business logic file is the ONLY file that should know about the specific use case. Everything it calls should be a reusable mechanism.

### The Independence Test

For every file that is NOT the business logic orchestrator, ask:
> "If I deleted the business logic file that calls this, would this file still make sense on its own?"

If yes — correctly extracted mechanism.
If no — business logic leaked into a mechanism file. Extract it.

### The Reusability Test

For every mechanism file, ask:
> "Could a different feature in this codebase — or a completely different product — use this file as-is?"

If yes — good abstraction boundary.
If no — the mechanism is contaminated with business-specific assumptions. Generalize the interface.

## Hard Gates

These are not suggestions. If any gate fails, the review FAILS.

| Gate | Threshold | Why |
|------|-----------|-----|
| File length | ≤ 150 lines | Beyond this, the file is doing too much. Split by responsibility. |
| Function/method length | ≤ 50 lines | Beyond this, extract sub-functions. Each function does one thing. |
| Function parameters | ≤ 4 params | Beyond this, group into a typed object/struct. |
| Import depth | No file imports from more than 2 layers away | Deep imports = hidden coupling. |

**Exception:** Data files (JSON, config, migrations, generated code) are exempt from line limits.

## Composability Principles

### 1. One file, one concept
A file represents exactly one concept: a transformer, a validator, a renderer, a repository. If you need "and" to describe what a file does ("formats AND sends"), split it.

### 2. Depend on interfaces at boundaries
When a mechanism calls another mechanism, it depends on the interface (type signature, protocol) not the implementation. This makes pieces swappable.

### 3. Business logic is thin orchestration
The business logic file should be short — it imports mechanisms, wires them together, handles the specific workflow. If it's doing heavy computation or data transformation inline, extract that into a mechanism.

### 4. Group by capability, not by layer
```
# Bad — grouped by layer
controllers/
  teacher_report_controller.py
  student_report_controller.py
services/
  teacher_report_service.py
  student_report_service.py

# Good — grouped by capability
reports/
  pdf_renderer.py          ← mechanism (reusable)
  html_formatter.py        ← mechanism (reusable)
  teacher_earnings.py      ← business logic (specific)
  student_progress.py      ← business logic (specific)
```

### 5. No god files
If a file imports 10+ things and orchestrates a complex flow, it's a god file. Break the flow into named sub-workflows, each in its own file.

## Review Process

### For plans:
1. Read the plan
2. Identify each proposed file/module
3. Classify each as **mechanism** or **business logic**
4. Check: does any mechanism file contain business-specific knowledge?
5. Check: is the business logic thin orchestration or a monolith?
6. Check: could each mechanism be reused independently?
7. Estimate file sizes — will any exceed 150 lines?
8. Report findings

### For existing code:
1. Identify files exceeding hard gates (`wc -l`, `grep -c "def \|function "`)
2. Read the largest and most-changed files
3. Classify each as mechanism or business logic
4. Apply Independence Test and Reusability Test
5. Check composability principles
6. Report findings

## Finding Format

For each finding:

```
[FAIL|WARN] (file:line or proposed-file)
What: One sentence — the structural problem
Why it hurts: One sentence — the concrete consequence
Fix: The specific split or extraction — name the files, describe what moves where
```

Be direct. No hedging. If you see a problem, say so clearly.
If a finding borrows from coupling-analysis thinking: state the coupling type (functional, model, contract) and whether the distance is appropriate.

## Summary Format

```
## Structural Review: [scope]

Mechanism files: X (Y reusable, Z contaminated)
Business logic files: X (Y thin, Z overloaded)

Hard gate violations:
- [file] — [X] lines (limit: 150)
- [function] — [X] lines (limit: 50)

Findings: X FAIL / Y WARN / Z PASS

[findings list]

Verdict: SHIP IT | NEEDS WORK | RESTRUCTURE
```

## What this is NOT

- Not a style review (formatting, naming conventions)
- Not a correctness review (bugs, logic errors)
- Not a security review (vulnerabilities, auth)
- Not a performance review (N+1 queries, memory)
- Not a test coverage review

Those belong to `/code-quality-review` and `/design-review`. This skill ONLY evaluates structure: are the pieces the right size, in the right place, with the right boundaries.
