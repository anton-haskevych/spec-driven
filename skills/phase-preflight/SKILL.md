---
name: phase-preflight
description: Pre-implementation review of a planned unit of work against named engineering canon (Clean Code, Clean Architecture, SOLID, DDD) plus the project's own rules, grounded in the real code it will touch. Use before writing any code for a spec phase, a planned chunk, or a feature plan; when the user asks to sanity-check a plan, review a phase before building, or check a design against principles; and as the gate between spec-driven Stage B context load and decomposition. Produces findings that change the plan, not a grade.
argument-hint: <spec name + phase id, a plan description, or "current phase">
allowed-tools: Read, Glob, Grep, Bash, Write, Edit
---

# /phase-preflight

Review a unit of work **before** it is built, against named canon and the house rules, grounded in the code it will actually touch. The deliverable is a short list of things that change the plan. A review that changes nothing was not grounded enough.

## The one rule

**No finding without a `file:line`.** A principle stated against a plan's prose is a lecture. A principle stated against `CommunicationMessage.java:196-203` is a finding. If you cannot anchor it, you have not read enough code yet. Go read more.

Corollary: do not review from the phase file alone. The phase file is a claim about the code. Half the value of this skill is discovering where that claim is already wrong.

## Scope

Reviews a **planned** unit of work: a spec phase entry, a chunk about to be decomposed, or an informal plan in conversation. Not existing code (that is `/code-review`), not the spec's overall shape (that is `/spec review`, the collegium).

If there is no plan in scope, ask what is about to be built. One question, then proceed.

---

## When invoked from `/spec execute`

Execute mode (`execute.md` → *Preflight the plan — the gate before decomposition*) calls this after phase-seam recon and before decomposition, and hands you three inputs: the phase entry, the recon note under `docs/specs/<name>/research/phase-<N>/`, and `principles.md`. Use them; do not rediscover them.

- **Stage 0, item 2** reads the files the *recon seam* names, not only the ones the phase file names. Where the two disagree, that disagreement is your first finding.
- **Stage 0, item 3** skips directories the recon already outlined — read its note instead of re-running `ast-grep outline`.
- **Stage 1** treats `principles.md` as the house rules, ranked above the canon.
- **Stage 4** starts from the recon's testing-issue estimate and reports only deltas: obstacles recon missed, or estimates it got wrong. Do not restate its list.
- **Stage 5** output goes back to execute mode, which applies the amendments before decomposing. Persist the note and ledger entries yourself as usual.

Self-scale honestly. A one-file chunk whose seam recon already read in full yields a short Stage 0 and mostly `Inert` rows — produce that quickly rather than inventing findings to justify the pass.

## Stage 0 — Ground

Read, in this order. Do not skip to the canon.

1. **The plan.** A spec phase file (`docs/specs/<name>/phases/...`), or the plan in conversation.
2. **Every file the plan names.** All of them. The plan's own `file:line` references are the highest-value reads in the session, and they are the ones most likely to be stale.
3. **The surrounding package,** structurally. Use `ast-grep outline <dir> --items exports --view digest` before reading any full file. That is what surfaces sibling patterns cheaply.
4. **The tests that guard the code in scope.** Specifically the architecture or lint rules the plan claims it will satisfy. See Stage 4.

Record anything the plan asserts that turned out to be false. Those are findings before you have opened a single principle.

## Stage 1 — House idioms outrank the canon

Before any named principle, answer: **how does this codebase already solve the concerns in scope?**

Look for the dominant pattern among siblings. If six classes in the package are named `*Policy` and hold static pure methods, that is the idiom, and a plan that introduces a `@Service` for the same job is wrong even though no canon rule forbids it.

Then read the project's own rules, nearest first:

1. The closest `CLAUDE.md`, then parent ones
2. `.claude/rules/*` (or the project's equivalent)
3. Any principles file the workflow loads (for spec-driven work, `principles.md`)

**Where the canon and a house rule conflict, the house rule wins, and you state the conflict explicitly.** Do not silently apply the canon over a documented local decision. Do not silently apply a local decision you think is wrong without naming why.

## Stage 2 — The canon passes

Four passes, each its own table. Walk every rule in the pass. Do not batch, do not skip to a summary.

**Verdicts:**

| Verdict | Meaning |
|---|---|
| **Violated, fix here** | The plan breaks it, and fixing it is inside this unit's blast radius |
| **Violated, out of scope** | The code already breaks it, the plan does not make it worse. Record as a ledger or backlog candidate, do not expand scope |
| **Bites** | Not violated, but it constrains *how* this must be built. The most useful verdict; most rows land here |
| **Inert** | Genuinely does not apply. Say so in one word and move on |

Every non-inert row names a file, function, or type in its consequence. "Consider separation of concerns" is not a consequence. "`validate()` at `:196-203` answers to two actors; extract `MessageSenderPolicy` beside the existing `MessageStatusTransitionPolicy`" is.

Being honest about `Inert` is what makes the other rows credible. A review where everything bites is a review nobody trusts.

### Pass A — Clean Code

Names (intention-revealing, meaningful distinctions, one word per concept, solution-then-problem-domain). Functions (small, one thing, one level of abstraction, few arguments, no flag arguments, no side effects, command/query separation). Comments (none by default; WHY only). Objects vs data structures (hide structure, Law of Demeter, object/data anti-symmetry). Errors (exceptions over codes, never return or pass null, Special Case pattern). Boundaries (wrap third-party, learning tests). Tests (TDD three laws, one concept per test, F.I.R.S.T). Classes (small, SRP, cohesion). Beck's four rules of simple design.

### Pass B — Clean Architecture

The Dependency Rule (source dependencies point inward only). The four circles and which one each planned artifact lands in. Crossing boundaries with plain data, never entities or ORM rows. Humble Object at untestable edges. Policy versus detail (the DB is a detail, the web is a detail, frameworks are details). Component cohesion (REP, CCP, CRP) and coupling (ADP no cycles, SDP, SAP). Screaming architecture. Tests as the outermost circle.

### Pass C — SOLID

- **SRP** by *actor*, not by "does one thing". Name the actors.
- **OCP**: can a new variant arrive without editing working code? Name the variant that will arrive next.
- **LSP**: would any caller need a type test for correctness?
- **ISP**: does any consumer depend on fields or methods it does not use?
- **DIP**: does high-level policy name a volatile concrete class? This is the row that most often turns up a real defect. Check whether the port the plan needs already exists.

### Pass D — DDD

Ubiquitous language (and the separation between the domain word and the customer-facing word). Entity versus value object. **Which layer owns each invariant**: a value object enforces its own in its constructor; the entity enforces only what is genuinely entity-scoped. Aggregate root and boundary. Cross-aggregate invariants must be eventually consistent, never enforced inline. One repository per aggregate root. Factories. Domain services versus policies (follow the local idiom). Domain events. Bounded context and shared kernel. Anti-corruption layer. Published language at the wire. Specification. Side-effect-free functions and assertions.

Skip a whole pass only when the work is genuinely outside it (Pass D on a CSS change), and say that you skipped it.

## Stage 3 — Guard blindness

For every rule the plan claims a test, linter, or ArchUnit check will enforce: **verify that guard can actually observe the violation.**

Read the guard. Check its predicate, its allowlist, and its exclusions. A guard that structurally cannot fail is worse than no guard, because the plan will cite it as evidence.

Typical blindness: the predicate excludes the exact shape in scope; the class is already allowlisted; the rule inspects a package the new code will not live in; the assertion runs against a parent that does not descend into the thing being asserted.

When a guard is blind, that is a finding, and the fix is its **own** change, separate from the feature. Tightening enforcement belongs in a dedicated commit or PR with an allowlist migration for grandfathered violations, never bundled into feature work.

## Stage 4 — Seam and testability

- **Size caps.** Which files does this push over the project's limit? Name them with current line counts. A file already at the cap needs its split committed *before* the new logic, as its own green commit.
- **TDD obstacles.** Which planned units cannot be tested without a database, network, or UI tree? Each one needs an extract-first refactor named now, not discovered mid-flight.
- **Missing fixtures.** What test data or harness does not exist yet?

## Stage 5 — Output

In this order. Findings first, always.

```
## Findings that change the plan

1-5 numbered items. Each: what is wrong, the file:line, and the consequence.
Anything the plan asserted that is false goes here first.

## <Canon> against <unit>

One table per pass: | Rule | Verdict | Concrete consequence |

## Amendments

Numbered, concrete edits to the plan. "Staff(null) throws from Staff's own
compact constructor, not from validate()." Not "consider stronger validation."

## Decisions for you

Only genuine forks where the answer changes the work. Give a recommendation
for each. If there are none, say so and stop.
```

Then, when the work belongs to a spec, persist the review as an immutable dated note at `docs/specs/<name>/research/phase-<N>/YYYY-MM-DD-<chunk>-preflight.md` (next to the chunk's recon note; no chunk → use a short slug for the plan), and write any durable learning (a guard blindness, a house idiom, an aggregate ambiguity) as a ledger entry with the narrowest correct scope. Do not batch the ledger writes for later.

## What not to do

- **No ungrounded findings.** Repeated because it is the failure mode. Read the code.
- **Do not pad.** Inert is a legitimate verdict and using it honestly is what makes the review trustworthy.
- **Do not expand scope.** A real violation outside the blast radius is a ledger or backlog candidate, not a task for this unit. Say which.
- **Do not rewrite the plan.** Propose numbered amendments the human can accept or reject one at a time.
- **Do not grade.** "14 PASS / 3 WARN" tells nobody what to do next. The amendments are the deliverable.
- **Do not ask taste questions.** Naming, layout, and formatting are yours to decide. Escalate only forks where the answer changes the work.
- **Do not review code that already exists.** That is `/code-review`. This runs before anything is written.
- **Do not treat anything as throwaway** unless the user says it is.
- **Do not skip Stage 1.** A canon-correct design that ignores the local idiom is still wrong, and it is the most common way this review fails.
