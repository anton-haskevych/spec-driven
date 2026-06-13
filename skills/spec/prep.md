# Prep Mode

Prep is the reconnaissance stage that runs **before** a spec is written. It turns a customer ask into the two things a correct spec is built on:

1. a frozen **product brief** — business truth, no code, ≤30 lines, the contract the recon agents work against;
2. **locked recon findings** — verified, file-referenced codebase ground truth, written to `research/`.

Recon locks the spec along **two lenses**, in order:

- **Lens A — implementation lock:** where the change lives, what to reuse vs build, blast radius, existing tests, safety. *Is this contained and correct?*
- **Lens B — craft lock:** naming and file placement, which test fixtures to reuse vs create, and extraction-for-reuse opportunities. *Will this read like the codebase wrote it, not just work?*

`create.md` then writes the spec from all of it instead of guessing. The point of prep is that no assumption — about correctness *or* craft — ever reaches `technical.md` or a phase plan.

The whole mode has **exactly one hard stop** — right after the product brief is written. Everything before it is conversation; everything after it is reconnaissance that runs to the lock and hands off, no per-wave permission asked.

See `SKILL.md` for layout rules, `product-brief.md` / `research/` semantics, and timestamp discipline.

## The shape

| Stage | You do | Output | Stop? |
|---|---|---|---|
| 0 · Frame | Light, proportional exploration of what's *actually* being asked | — | no — conversational |
| 1 · Align | Agree with the user on the *real* change vs the surface ask | — | no — conversational |
| 2 · Folder + Brief | Create the spec folder + write `product-brief.md` | folder, stub `CLAUDE.md`, `product-brief.md` | **YES — the one hard stop** |
| 3 · Impl recon | Restate the mission, fan out Wave 1 (Lens A) | `research/<date>-wave-1-<slug>.md` | no — fan out immediately |
| 4 · Impl lock | Aim each new wave at the gaps until implementation is locked | one `research/` file per wave | no |
| 5 · Craft lock | One craft-lens wave — naming/placement, fixtures, extraction | `research/<date>-craft-<slug>.md` | no |
| 6 · Lock → hand off | Confirm both lenses locked; hand to `create` | — | ends here |

## 0. Precondition check

Resolve the target folder `docs/specs/<name>/`:

- **Does not exist** → fresh prep. Start at Stage 0 (Frame).
- **Exists, prep-stage only** (has `product-brief.md` and/or `research/`, but no `progress.md`) → prep was already started. Read the brief and any `research/` snapshots, print one line (`prep in progress — brief ✓, N research snapshot(s)`), and resume at the right point: no research yet → Stage 3; implementation waves done but no craft snapshot → Stage 5; both lenses covered → Stage 6 lock check / handoff.
- **Exists as a full spec** (has `progress.md` or `phases/`) → not a prep target. Print `Spec '<name>' already exists at docs/specs/<name>/. Use /spec <name> to resume or /spec <name> review.` and stop.

## Stage 0 — Frame the ask

Goal: learn what's *actually* being asked before naming anything. Cheap and **proportional** — a one-line ask needs a paragraph of framing; a vague "make X better" may need real exploration.

- Read the relevant project `CLAUDE.md` files for stack, conventions, and vocabulary.
- If the ask is unclear or likely already partly solved, run a *light* exploration to find out. Prefer the project's own tooling if present (e.g. an `explore-waves` skill); otherwise fire 1–2 `Agent` calls with `subagent_type: "Explore"` to map the territory. Keep it small — deep recon is Stage 3's job, after the brief exists.
- Surface what you found and the **candidate real change** in a few bullets.

This is conversation, not a gate. Do not create any files in this stage.

## Stage 1 — Align on the real change

Through conversation, converge with the user on the change the spec actually encodes — which is often **not** the surface ask. (Worked example: "show teachers the Passes tab" was really "decouple a read-only pass view from the edit-permission gate.")

- State the real change in one sentence and check it back with the user.
- If they correct it, restate until you agree.
- This is the understanding the brief will freeze — get it right here, cheaply, before any folder exists.

No files yet.

## Stage 2 — Folder + product brief  ⛔ the one hard stop

### 2.1 Create the folder

Propose a **kebab-case name for the customer-facing intent**, not the mechanism — name it for what a future person would search (`teacher-pass-visibility`, not `decouple-pass-read-from-write`). On confirmation:

```bash
mkdir -p docs/specs/<name>
```

Get the current timestamp (same format `spec-bump.sh` writes — don't hand-type it):

```bash
date +"%Y-%m-%dT%H:%M:%S%z" | sed 's/\([+-][0-9][0-9]\)\([0-9][0-9]\)$/\1:\2/'
```

Write a minimal stub `docs/specs/<name>/CLAUDE.md` so `/spec list` can see the spec and `/spec <name>` can resume prep:

```markdown
---
created: <timestamp from the command above>
updated: <same timestamp>
status: prep
area: [<best guess from taxonomy>]
domain: [<best guess from taxonomy>]
scope: [<best guess from taxonomy>]
---

# <Feature Name> Spec — prep stage

Reconnaissance in progress. See `product-brief.md` for the business intent and
`research/` for verified codebase findings. `/spec create <name>` writes the spec
body once recon is locked, and finalizes this metadata.
```

`area`/`domain`/`scope` are best-guess at this stage; `create.md` finalizes them. Run `bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh <name>` any time you re-touch the stub to refresh `updated`.

### 2.2 Write the product brief

Create `docs/specs/<name>/product-brief.md`. **Hard rules:**

- **≤ 30 lines of text.** If it runs longer, it's saying too much.
- **No code. No file paths. No engineering vocabulary.** A non-engineer must be able to read it. The recon agents turn it into a technical *how* — they can't do that honestly if the brief already prescribes the how.
- **It is the contract.** Everything the Stage 3 agents verify traces back to a line in here.

Template:

```markdown
# <Feature> — Product Brief

## Who & what
<who asked / who feels the pain> wants <the capability, in plain product terms>.

## Why
<why it matters — the cost of the status quo, the moment it bites>

## What we'll build
<the user-visible outcome, in product language>

## The real change
<one line: the actual shift this requires, stated conceptually — not in code>

## Where it touches (product level)
- <surface / screen / role affected>
- <surface / screen / role affected>

## Out of scope
- <what we are explicitly NOT doing>
```

### 2.3 Stop

Print the brief path and one line: `Folder created (v0.0) and product-brief.md written — review it before I start recon.` **Then stop and wait.**

This is the correctness gate — the only one. The user must confirm the brief is right (naming *and* business content) before any recon spends a token. **Read intent, not magic words:** any natural confirmation ("looks good", "yes", "go", "ship it") proceeds; any correction means edit the brief and re-confirm. Do not fan out agents until the human agrees.

## Stage 3 — Implementation recon: mission + Wave 1

Once the brief is confirmed, **do not pause again** — restate, then fan out in the same turn. This is **Lens A**: locating the change and its risks.

### 3.1 Restate the mission (transparency, not a gate)

In your own words, in 3–5 bullets, state what the recon must answer — the engineering unknowns the brief deliberately leaves open. Typically:

- **The seam** — where exactly the change lives (precise files/lines).
- **Reuse vs build** — does a pattern for this already exist? Don't reinvent it.
- **Blast radius** — what else touches the change point; what breaks if it moves.
- **Tests & safety** — what's covered today, what new coverage the change demands.
- Anything the specific brief makes load-bearing (permission plumbing, migrations, data flow, …).

Surface this, then proceed straight into Wave 1 — no confirmation needed.

### 3.2 Fire Wave 1

A **wave** is 2–4 `Agent` calls with `subagent_type: "Explore"`, fired **concurrently in a single message**. Each agent owns **one distinct focus**, matched by logic and complexity — never two agents on the same surface.

Default Wave 1 focuses (adapt to the brief):
- the primary change surface(s),
- a reuse / prior-art audit,
- the blast radius / integration surface.

Each agent's prompt must include the brief as its contract and an output contract:

```
You are read-only reconnaissance for a spec. This product brief is your contract:

<paste the full product-brief.md>

Your focus: <the one thing this agent investigates, and why it matters>.
Search breadth: thorough.

Return file:line-referenced findings only:
- what exists today and where (exact paths + line numbers),
- what is reusable vs what must be built,
- risks, gotchas, and blast radius for this focus.

Do NOT propose a design. Do NOT write or edit code. Findings, not prose — keep it tight.
```

## Stage 4 — Implementation lock: synthesize, lock-check, iterate

### 4.1 Synthesize the wave

When the wave returns, synthesize across its agents: what's now *known*, what reuse exists, what's still *unknown or risky*. Write the synthesis to an immutable research snapshot.

```bash
mkdir -p docs/specs/<name>/research
date +%F   # the YYYY-MM-DD for the filename and frontmatter
```

Write `docs/specs/<name>/research/<YYYY-MM-DD>-wave-<N>-<slug>.md`:

```markdown
---
date: <YYYY-MM-DD>
wave: <N>
lens: implementation
slug: <slug>
brief: product-brief.md
---

# Recon Wave <N> — <slug>

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

## Verified
<file:line-referenced facts this wave nailed down>

## Reuse
<existing mechanisms/components to extend instead of building>

## Still open
<the critical unknowns that remain — these aim the next wave>
```

These snapshots are immutable (same discipline as `reviews/` — see `SKILL.md`). One file per wave; never edit after writing.

### 4.2 Implementation lock check

List the remaining **critical** unknowns — the ones that would force a guess in `technical.md` or a phase plan. Implementation is **locked** when all of these hold:

- the change seam is located to file:line,
- reuse-vs-build is decided for each mechanism the change needs,
- blast radius is bounded (callers / dependents known),
- the test surface is mapped,
- any brief-specific load-bearing concern (permissions, migrations, security gating) is understood.

Then:

- **Locked** → go to Stage 5 (craft lock).
- **Unknowns remain and wave count < 4** → plan the next wave aimed *only* at those gaps (≤4 agents, same fire-and-synthesize loop). Each wave is targeted by the last synthesis — adaptive, never a fixed plan.
- **Wave 4 done and still open** → stop iterating. Present what's unresolved and let the user decide: authorize a further wave, or proceed to the spec with the risks recorded.

## Stage 5 — Craft lock: make it read like the codebase

Implementation tells you *what* changes and *where*; craft tells you *how to write it* so it's indistinguishable from code the team already wrote. **Proportional** — skip for a trivial one-file change; run it for anything that introduces files, components, hooks, or tests.

### 5.1 Fire the craft wave

One wave, typically 3 `Agent` calls with `subagent_type: "Explore"`, one focus each:

- **Naming & placement** — how the project names files / functions / types and where this *kind* of code lives; the existing "family" the new code joins (export style, structure, idioms). So new files are named and placed to match, not invented.
- **Test conventions & fixtures** — the test patterns, and which fixtures / mocks / factories / helpers to **reuse as-is** vs **create** (and where a new fixture's home is). So the tests match the suite.
- **Extraction-for-reuse** — functions / classes / hooks / components worth **extracting + testing + reusing** on the code this change touches; the bounded-refactor wins — *and* what to explicitly **not** extract, to avoid boiling the ocean.

Each craft agent gets the brief **plus the Lens-A research snapshots** (so it knows the touch-set) + its focus + the same read-only, file-referenced output contract as Stage 3.

### 5.2 Synthesize the craft wave

Write `docs/specs/<name>/research/<YYYY-MM-DD>-craft-<slug>.md` (same immutable format, `lens: craft`). Capture:

- every new file's name + placement, matched to a **named existing exemplar**,
- the reuse-vs-create fixture map,
- extraction opportunities, each with its test cost — and the explicit **don't-extract** list,
- any **craft decisions** the spec should lock (e.g. a component name, dedup-vs-tolerate-duplication). **Record them for `create`'s Decide stage — do not resolve them here.**

### 5.3 Craft lock check

Craft is **locked** when: every new file is named + placed against an exemplar, the fixture reuse-vs-create map is complete, and extraction opportunities are identified (or explicitly none). One craft wave usually suffices; a second is warranted only if the first surfaced a large untouched-convention area.

## Stage 6 — Lock and hand off

Present the locked picture — both lenses:

```
Recon locked — <name>
Brief: product-brief.md ✓
Research: <N> implementation snapshot(s) + 1 craft snapshot in research/
Implementation: <3–6 bullets — seam, reuse, blast radius, security/migration notes>
Craft: <2–4 bullets — new files & placement, fixture reuse/create, extraction wins>
Decisions for the spec to lock: <craft decisions surfaced, or "none">
Open risks: <anything unresolved, or "none">
```

Then offer the handoff — a soft offer, not a gate: *"Ready to write the spec? `/spec create <name>` builds it from the brief + research."* If the user confirms, read [create.md](create.md) and follow it (its Discover stage loads the brief + research instead of cold-exploring). If they'd rather read the research first, stop.

## What this mode does not do

- **Does not write the spec.** Prep produces the brief and the recon; `create.md` writes `design.md` / `technical.md` / phases.
- **Does not plan phases or define pre-PR checks.** That's `create`'s Plan stage and `pr-opening.md`. Prep gathers ground truth; it does not decide the build order.
- **Does not gate the fan-out.** The only hard stop is after the brief. Once it's confirmed, recon runs to the lock without asking permission per wave.
- **Does not let recon agents design or write code.** They are read-only `Explore` agents returning file-referenced findings.
- **Does not resolve craft decisions.** Lens B *surfaces* decisions (component names, dedup-vs-duplicate); `create`'s Decide stage locks them.
- **Does not put code in the brief.** The brief is business truth; the moment it names a file or function, it has overstepped.
- **Does not exceed 4 implementation waves silently.** If the picture won't lock in 4, it surfaces the open risks and hands the decision to the user.
