# Review Mode

Launch a collegium review panel to evaluate the spec from four independent lenses, then synthesize findings into a unified verdict.

## 1. Identify the spec

Determine which spec to review from conversation context. If ambiguous, ask the user to confirm. Read in parallel:
- `design.md` — problem, decisions, UX flows
- `technical.md` — API contracts, data models, architecture
- `progress.md` — phases, what's done (reviewers need to know what's already shipped vs. planned)

Note the spec path — you'll pass it to each reviewer.

## 2. Launch 4 review agents in parallel

Send a **single message with 4 Agent tool calls** — all must launch simultaneously, not sequentially. Each agent gets the spec path and reads the files itself.

### Agent 1: principal-engineer

```
Review the spec at [spec-path]. Read design.md, technical.md, and progress.md.

Your central question: "Is this the fundamentally right solution?"

Evaluate: dependency inversion, swappability, layer boundaries, single responsibility,
open/closed principle, reversibility, YAGNI. Use Read/Grep/Glob to verify claims
against the actual codebase.

Produce structured PersonaOutput with findings (title, description, recommendation, severity)
and an overallAssessment.
```

### Agent 2: integration-architect

```
Review the spec at [spec-path]. Read design.md, technical.md, and progress.md.

Your central question: "How does this fit with everything else?"

Read the project's CLAUDE.md files for architecture context. Trace data flows.
Check blast radius — Grep for all callers of methods the spec modifies.
Verify integration accuracy — do the endpoints, handlers, and tables referenced
in the spec actually exist?

Produce structured PersonaOutput with findings and an overallAssessment.
```

### Agent 3: adversarial-tester

```
Review the spec at [spec-path]. Read design.md, technical.md, and progress.md.

Your central question: "What will break?"

Enumerate entity lifecycle states from the codebase. For every query the spec proposes,
ask: does it filter by lifecycle state? Check for null guards, concurrency issues,
untested assumptions, incomplete error handling, and test gaps.

Produce structured PersonaOutput with findings and an overallAssessment.
```

### Agent 4: code-quality-reviewer

```
Review the spec at [spec-path] and the existing code it proposes to modify.

Your central question: "How does this affect code quality?"

Read technical.md to understand the proposed changes. Then read the actual files
listed in the spec. Evaluate: will the proposed changes improve or degrade
cohesion, understandability, editability, testability? Are new files/modules
properly sized? Does the proposed structure follow existing patterns?

Produce structured PersonaOutput with findings and an overallAssessment.
```

## 3. Collect and synthesize

Once all 4 agents return, launch the **review-synthesizer** agent:

```
Synthesize the following 4 review outputs into a unified verdict.

[Include the full output from each of the 4 agents]

Deduplicate findings, classify signal (consensus / unique-insight / contradiction),
assign enforcement mechanisms, and produce a SynthesisOutput with findings[] and summary.
```

## 4. Present the synthesis

Display the synthesizer's output to the user. Then:

- If there are **critical findings**: highlight them and ask which ones to address before implementation
- If there are **contradictions**: present both sides and ask the user to resolve
- If the spec is **clean**: say so and suggest moving to implementation
- Offer to update the spec files based on the review findings
