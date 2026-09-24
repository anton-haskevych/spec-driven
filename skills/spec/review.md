# Review Mode

Launch a collegium review panel to evaluate the spec from five independent lenses, **synthesize the findings yourself in this thread**, write the full synthesis to `reviews/`, apply the findings to the spec and ledger, and record everything as a single review commit.

**Synthesis is your job, not an agent's.** There is no synthesizer agent. You read every report, verify the load-bearing claims against real code, deduplicate, weigh, and write the verdict as your own reading — not a merge of theirs. A hand-off loses findings to output-budget compression and loses the reasoning to a context you can't see.

**The flow is autonomous except at forks.** No "which findings should I address?", no slug confirmation, no "shall I apply this?". Mechanism-level choices you resolve yourself and state. But when reviewers genuinely contradict each other on a design decision, or a finding would reorder scope across specs, or the panel says the approach itself is wrong — **pause and put the fork to the user with your recommendation before applying.** Those are their calls, and they'd rather answer three questions than unwind a spec rewritten on a reviewer's authority.

See `SKILL.md` for layout rules and the extraction-step discipline.

## 0. Preconditions

Run SKILL.md → *Preconditions*. A legacy spec without `ledger/` follows `legacy-layout.md` → `create`, `prep`, `review`, `handoff` (offer to create the ledger before writing entries).

## 1. Identify the spec

Determine which spec to review from conversation context. If ambiguous, ask the user to confirm. Read in parallel:

- `design.md` — problem, decisions, UX flows
- `technical.md` — API contracts, data models, architecture
- `progress.md` — phase index, what's done vs. planned
- `ledger/INDEX.md` (if it exists) — existing learnings already captured
- `code-map.md` (if it exists) — load-bearing files this spec touches
- The current phase entry (follow the pointer in `progress.md` to the first unchecked phase — either `phases/phase-<N>-<slug>.md` or `phases/phase-<N>-<slug>/plan.md`)

Then run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts graph <name>` (skip without Bun). Pass its output to every reviewer, together with the `ledger/INDEX.md` paths of the `part-of` parent and every `needs` target. Decisions already made in a parent or dependency are settled context, not findings; flag a spec that contradicts one. Undeclared overlaps in the output are integration-architect material.

Also run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts playbooks <name>`. If it prints playbooks, pass them to every reviewer as house rules for this kind of work: a spec that breaks its playbook is a finding.

Note the spec path — you'll pass it to each reviewer along with the list of files they should read.

## 2. Launch 5 review agents in parallel

Send a **single message with 5 Agent tool calls** — all must launch simultaneously, not sequentially. Each agent gets the spec path and reads the files itself.

The read set for each agent now includes the ledger and the active phase entry so they have full context, not just design/technical/progress.

Pass `run_in_background: false`. **Each agent's tool result IS its report** — it arrives inline, in this message's results. There is nothing to retrieve, poll, or collect afterward.

**These reviewers are one-shot and throwaway. Do not put them in a team.** Specifically, in this flow:

- Do **not** use `TeamCreate`, `team_name`, or the `name` parameter — naming an agent makes it an addressable teammate on the mailbox channel, which is the wrong channel for a report.
- Do **not** use `SendMessage` to nudge, ping, or ask a reviewer for its report. `SendMessage` starts a *new inference turn* on that agent; when that turn ends it emits another idle notification, which looks like another stall, which invites another nudge. That loop is self-sustaining and produces no report.
- Do **not** treat `{"type":"idle_notification","idleReason":"available"}` as a failure. It is a mailbox event with **no payload** and it is not the completion signal. Reports arrive as tool results (foreground) or `<task-notification>` (background) — never as idle notifications.
- Do **not** read an agent's `.output` file. For local agents it symlinks the full JSONL conversation transcript and will overflow context.

If a reviewer genuinely returns nothing, proceed with the reviewers that did return and note the gap in the final report. Never block the flow polling for a missing one.

### Reviewer output contract

Append this block **verbatim** to every one of the five prompts below. It is the single definition of what a reviewer returns — the persona files add their own per-finding requirements on top, never a different shape.

```
## Output contract

Return markdown only, under 6000 tokens, front-loading the most severe findings.

For each finding:

### F<n> — <title>
- severity: critical | high | medium | low
- claim: <what is wrong, one or two sentences>
- evidence: <file:line in the codebase or spec that proves it>
- failure scenario: <concrete inputs/state → what goes wrong>
- recommendation: <the change to make to the spec>
- confidence: read-in-code | inferred

Then, once:

## Overall assessment
- verdict: sound | fix-then-proceed | rethink
- <at most 3 sentences>

No findings? Say so and give the overall assessment. Never pad.
```

### Agent 1: principal-engineer

```
Review the spec at [spec-path]. Read:
- design.md — problem, decisions, UX
- technical.md — contracts, architecture
- progress.md — phase index
- The current phase entry (follow the pointer in progress.md to the first unchecked phase)
- ledger/INDEX.md if it exists; open any ledger entries relevant to the active phase
- code-map.md if it exists

Your central question: "Is this the fundamentally right solution?"

Evaluate: dependency inversion, swappability, layer boundaries, single responsibility,
open/closed principle, reversibility, YAGNI. Use Read/Grep/Glob to verify claims
against the actual codebase.

Return findings in the reviewer output contract appended below.
```

### Agent 2: integration-architect

```
Review the spec at [spec-path]. Read:
- design.md, technical.md, progress.md
- The current phase entry
- ledger/INDEX.md and relevant ledger entries
- code-map.md

Your central question: "How does this fit with everything else?"

Read the project's CLAUDE.md files for architecture context. Trace data flows.
Check blast radius — Grep for all callers of methods the spec modifies.
Verify integration accuracy — do the endpoints, handlers, and tables referenced
in the spec actually exist?

Return findings in the reviewer output contract appended below.
```

### Agent 3: adversarial-tester

```
Review the spec at [spec-path]. Read:
- design.md, technical.md, progress.md
- The current phase entry
- ledger/INDEX.md and relevant ledger entries (especially gotchas and workarounds)
- code-map.md

Your central question: "What will break?"

Enumerate entity lifecycle states from the codebase. For every query the spec proposes,
ask: does it filter by lifecycle state? Check for null guards, concurrency issues,
untested assumptions, incomplete error handling, and test gaps.

Return findings in the reviewer output contract appended below.
```

### Agent 4: code-quality-reviewer

```
Review the spec at [spec-path] and the existing code it proposes to modify.
Read:
- technical.md — proposed changes
- The current phase entry — implementation guidance
- code-map.md — load-bearing files already tracked
- ledger/INDEX.md — existing principles/decisions
- The actual files listed in the spec

Your central question: "How does this affect code quality?"

Evaluate: will the proposed changes improve or degrade cohesion, understandability,
editability, testability? Are new files/modules properly sized? Does the proposed
structure follow existing patterns?

Return findings in the reviewer output contract appended below.
```

### Agent 5: prior-art-reviewer

```
Review the spec at [spec-path]. Read:
- design.md, technical.md, progress.md
- The current phase entry
- ledger/INDEX.md and relevant ledger entries
- code-map.md
- docs/specs/_ledger/INDEX.md (project-wide lessons), if it exists: open entries whose paths touch this spec's files

Your central question: "Does this system already know how to do this?"

Inventory every mechanism-level choice in the spec (data access, scheduling,
notification, metrics, serialization, retry, caching, config, class placement) —
including choices inherited from code the spec extends or extracts. For each,
Grep/Glob broadly for how the codebase solves that concern elsewhere; find 2-3
exemplars. Construct the simplest version that reuses those mechanisms and diff
the spec against it. "Extraction" / "behavior-preserving" framing is provenance,
not justification — inherited choices must re-justify themselves. Flag mechanism
choices with no rejected alternative recorded in the decisions table or ledger.

Return findings in the reviewer output contract appended below (each citing prior-art file:line).
```

## 3. Synthesize — in this thread, yourself

Do **not** spawn a synthesizer agent. You do the synthesis.

### Don't go silent

Synthesis over five reports plus code verification takes a while. Post a short note before you start verifying ("all five in — verifying the three claims that assert live bugs before I write anything up") and again when the verdict is ready. If the reports arrive one at a time, note each landing: what came in, what's still out, anything severe or new, and any seam between reviewers the moment you see it forming ("both reject X but propose different replacements — that's a mechanism choice, not a conflict, I'll decide it"). Hold the consolidated write-up until the last reviewer lands.

### Verify before you believe

Reviewers assert; you check. Before a finding enters the verdict:

- **Claims about existing code** ("`Foo.java:36` issues tokens without a `scope` claim", "`get-slugs.mts:15` reads the view counts the phase deletes") — open the file and confirm. Mark each finding `verified` or `unverified` in the review file.
- **Claims of live bugs in shipped code** — always verify end to end before reporting; a false "prod bug" headline costs more than a missed one.
- **Prior-art claims** ("the codebase already does this at `X`") — confirm the exemplar actually covers the same concern.
- **A reviewer's fixture-dependent test claim** ("the tenant-token → 403 test passes") — check whether it passes for the right reason.

Findings you cannot verify stay in the review file marked as such; they don't drive spec edits.

### Deduplicate, classify, weigh

Merge findings that describe the same defect from different lenses; keep the sharpest framing and credit every persona that raised it. Classify each by signal:

- **consensus** — ≥2 personas independently
- **unique-insight** — one persona, verified, load-bearing
- **contradiction** — personas disagree on the same design decision
- **superseded** — a mitigation for a component another accepted finding replaces or deletes

Assign severity on *your* judgment of consequence, not on the reviewer's label. A `medium` from one reviewer is a `critical` if you verified it takes down a nightly job for every tenant.

Where a reviewer's recommendation conflicts with the project's own rules (CLAUDE.md, ledger principles), the project's rules win — note the reviewer's position in the review file and apply the rule-compliant fix.

### Sort forks: yours vs. the user's

**Resolve yourself, and say so:** mechanism-level choices where either option satisfies every reviewer's actual concern (SSM parameter vs. context value; ship the shared-file change ahead of the phase vs. inside it). Pick, state the reason in one sentence, move on. The final report lists these as "resolved by me".

**Put to the user — pause here, before §4:**

- Reviewers genuinely contradict on a design decision and each is right about something
- A finding moves scope between specs or reorders another spec's phases
- A finding cuts or adds a deliverable that changes what the feature *is* (not how it's built)
- The panel's verdict is that the approach itself is wrong
- A **graduation candidate** touches this spec (run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts lessons candidates <name>`): a project lesson that has hit 3+ specs and has no guard. Ask whether this spec should carry a guardrail phase that makes it impossible (CI job, hook, lint or ArchUnit rule, test helper). Recommend yes when the guard is small and this spec touches the lesson's paths. A yes adds the phase and, once it lands, sets the lesson's `enforced-by:`.

For each fork: the question in one line, both positions in plain language, your recommendation, and what it changes downstream. Two to four forks is normal; ten means you're not deciding enough yourself. Ask them all in one message, then wait. Fold the answers into the synthesis before writing the review file. If the user says "your call", decide and record it as a decision ledger entry with your reasoning.

Only after the forks are answered do you proceed to §4.

## 4. Write the review to `reviews/`

Persist the full synthesis as an immutable review file **before applying anything** — if application is interrupted, the review file preserves every finding.

### Create the folder if missing

```bash
mkdir -p docs/specs/<spec-name>/reviews
```

### Derive a slug

Derive the slug from the dominant theme of this review — never ask the user. Examples:

- `phase-5-readiness` — a pre-phase review
- `integration-boundaries` — a focused architecture review
- `concurrency-audit` — a specific concern-driven review
- `post-pivot` — a review after a major approach change

If no theme dominates, fall back to `phase-<N>-collegium` for the active phase.

### Write the file

Create `docs/specs/<spec-name>/reviews/YYYY-MM-DD-<slug>.md` with your full synthesis — every finding, including the ones you rejected or couldn't verify, with the reason. Include frontmatter:

```markdown
---
date: <YYYY-MM-DD>
spec-phase-at-review: <phase number and name at review time>
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: <slug>
---

# Review — <slug>

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

<your verdict in your own words — the spine of the spec, what's wrong, where it clusters>

## Forks put to the user

<each fork, both positions, the user's answer (or "your call" → your decision)>

## Resolved by the synthesizer

<mechanism choices you made yourself, one line of reasoning each>

## Findings

<full list, deduplicated, classified by signal (consensus / unique-insight /
contradiction / superseded), with severity, verified/unverified, personas that
raised it, and recommendation per finding>

## Rejected or unverified

<findings that did not enter the verdict and why>
```

**Never edit this file after writing.** If a later review contradicts it, the new review lives in its own dated file; both stay on disk.

## 5. Apply the findings — autonomously

The forks were answered in §3; nothing else waits for confirmation. No per-finding prompts. Process every finding that entered the verdict by its shape:

### Spec corrections → edit the spec files directly

Concrete changes to `design.md`, `technical.md`, a phase entry, or `code-map.md`: apply them. Wrong endpoint shapes, missing files in a phase's touch list, incorrect claims about existing code, decisions-table rows the review invalidated, deliverables that changed — edit the file.

A task phase (`code: false`) that only checks our own work — QA, verification, opening a PR — is a spec correction too: move its content into `pr-opening.md` and delete the phase.

Respect supersession annotations: when a substitution finding replaces or deletes a component, apply the substitution and skip the mitigation findings marked `superseded-if-accepted` for that component (they stay preserved in the review file).

### Ledger-shaped findings → create/update ledger entries

Promote the actionable cross-phase findings (typically 3–7; skip purely informational ones):

- Decisions the team should lock in ("we're decoupling X from Y") → `decision` kind
- Traps future agents will hit without warning ("Z silently drops data at >10k records") → `gotcha` kind
- Standing rules that emerged ("all new handlers must use the audit port") → `principle` kind
- Domain facts that weren't previously documented ("the `user_id` on invoices actually refers to the studio, not the customer") → `domain` kind

Write each per SKILL.md → *Ledger entry format* and *Write discipline* (narrowest correct `applies-to`, `created:` from `spec-bump.sh --now`, update a near-duplicate in place, add the INDEX row).

### Answered forks → apply the user's answer, ledger the decision

Every fork from §3 has an answer by now. Apply it to the spec and write a `decision` ledger entry recording both positions, the answer, and the reasoning — so the next session doesn't re-open it.

If the user explicitly deferred a fork ("leave it open for now"), create `ledger/decision-<slug>.md` with `**Status: open — needs a human call.**` as the first body line, add its INDEX row, and leave the spec's current shape untouched on that point.

### Fundamental-rethink verdicts → the user already answered

A "the approach is wrong" verdict is a fork and was put to the user in §3. If they accepted the rethink, apply it — including rewriting the spec — and record the decision. If they rejected it, apply only the findings that stand regardless, and record the rejection with their reasoning so future reviewers don't re-raise it.

### Bump the timestamp

After all edits: `bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh <spec-name>`.

## 6. Commit

One commit containing everything the review produced — review file, ledger entries, INDEX rows, spec edits:

```bash
git add docs/specs/<spec-name>/
git status  # verify ONLY the spec folder is staged
git commit -m "[review] <spec-name>: <slug> — <N> findings (<X> spec edits, <Y> ledger entries)"
```

Never sweep unrelated working-tree changes into the review commit — stage only the spec folder. Commit; do not push unless the project's conventions say otherwise.

## 7. Report and stop

Print a compact summary — this replaces every interactive step:

```
Review: reviews/YYYY-MM-DD-<slug>.md (immutable)
Committed: <hash> — [review] <spec-name>: <slug> — …
Findings: <N> total — <X> applied to spec, <Y> ledgered, <Z> review-file only, <W> unverified
Forks: <K> answered by you (ledger slugs), <J> resolved by me, <L> left open
```

Follow with 2–5 bullet highlights of the most consequential changes applied. Then stop — do not ask whether to address findings, do not propose next steps beyond the summary.
