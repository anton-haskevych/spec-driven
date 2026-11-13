# Update Mode

Apply the entry's [workflow capabilities](capabilities.md). In `local-pilot`, use the entry's explicit phase instead of claim lookup; keep progress/ledger/code-map updates and local commits, with publication and launches unavailable.

Capture implementation progress and route new knowledge into the right artifacts. Unlike the old model, update.md does **not** append session logs to `progress.md`. Instead, it routes content into focused files: sub-checkboxes go into the phase entry, durable learnings become ledger entries, load-bearing files are recorded in code-map.md, and ephemeral state is staged for handoff (which writes the phase's `in-flight/phase-<id>.md`).

See `SKILL.md` for the layout rules this mode relies on.

## 1. Preconditions

Run SKILL.md → *Preconditions*. A legacy spec follows `legacy-layout.md` → `update` instead of the sections below that target files the spec doesn't have.

## 2. Load current state

Read in parallel:

- The phase state: `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts context status <name>`, and for the current phase `context execute <name> <phase>` (its tasks with their ids). They read the spec wherever it lives (SKILL.md → *Plan changes*). Without Bun, `progress.md`.
- `CLAUDE.md` — frontmatter (status, area, domain, scope)
- `technical.md` — skim for planned approach (needed for divergence detection)
- `code-map.md`
- `ledger/INDEX.md`
- The current phase's entry for its prose — the flat file or the folder's `plan.md`

The "current phase" is the active phase from SKILL.md → *Next-chunk rule*. If several phases are in progress, take the one this tree's claim names (`bun ${CLAUDE_SKILL_DIR}/tools/spec.ts claim list`) and list it under `Say if wrong:`; with no claim here, the one the conversation worked on.

## 3. Cross-reference with git

Run: `git log --oneline -20` and `git diff --stat HEAD~5`

Also check: `git status` — are there uncommitted changes?

Compare recent commits against unchecked sub-items in the current phase entry. For each item, classify:

- **Done as specified** — implementation matches what the phase entry described
- **Done differently** — implemented, but approach diverged from the phase plan (note *why*)
- **Partially done** — touched but not fully complete
- **New work not in spec** — discovered dependencies, prerequisite refactors, etc.

## 4. Apply progress changes

Every change below is one `spec.ts phase …` command (SKILL.md → *Plan changes*). Run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts join <spec>` before the first one and pass on its line when it joins the spec. Report each command's own line.

### Check off sub-checkboxes inside the phase entry

- Tick each completed sub-item with `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase tick <spec> <phase> <task>`, naming the task as the pack shows it (its id on the board, its text or `#N` in files). Without Bun, change `- [ ]` to `- [x]` in the phase's flat file or folder `plan.md`.
- **Task phase (`code: false`)?** Git can't prove these items, so each tick carries its evidence: `phase tick … --evidence "2026-09-24, Drive/Recordings/ballroom.mp4"` writes `- [x] Record the interview — 2026-09-24, Drive/Recordings/ballroom.mp4`. A link to the published page works too. No evidence from the user or the session, no tick.
- **A deliverable that changed** (reworded, no longer needed, newly found inside this phase): `phase task <spec> <phase> --edit <task> "<text>"`, `--drop <task>` or `--add "<text>"`. A done task stays as it is.
- **Do NOT check off or modify anything in `progress.md`** except in the narrow case below.

### Update the top-level phase checkbox in progress.md

- `phase tick` flips the top-level box itself when it ticks the last open sub-item. Without Bun: flip it to `[x]` only when **all** sub-checkboxes in that phase's entry are checked.
- Do not partially mark a phase as done at the top level.
- When the user confirms a ticked phase has been deployed, run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase deployed <spec> <phase> [--date YYYY-MM-DD]` (SKILL.md → *Phase edges*). This is what releases phases that declare `needs-deployed` on it. Never infer a deploy from a merge. The one exception is babysit's infra deploy gate: its last check proves the deploy, and it marks the phases with `phase deployed --land` ([babysit.md](babysit.md)). Without Bun, insert ` · deployed <YYYY-MM-DD>` directly after the pointer (after its closing backtick), before any trailing note; the reader doesn't see it anywhere else.

### New work → add or split a phase

Phase ids never change or disappear: `spec#7` refs, `[phase 7]` ledger scopes and `research/phase-7/` all depend on them.

- **Work that deserves its own phase:** `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts phase add <spec> "<title>" [--after <id>] [--needs a,b] [--pr X] [--code false] [--task "<deliverable>"]…`. It takes the next integer, or with `--after 7` the next free letter (`7a`), writes the phase file from the template and the phase line. Give its deliverables as `--task`; then fill in its Goal, Outcome and files in the phase file.
- **Work that is its own spec** (a dependency with its own phases, a system other specs will use, another owner): spin it off (prep.md → *Spin-off*) and give the waiting phase the edge with `phase set <spec> <phase> --needs <its needs>,<new spec>`.
- **An edge, PR group or gate that changed:** `phase set <spec> <phase> --needs … | --needs-deployed … | --same-files-as … | --pr X | --gate …` (`none` clears).
- **A phase that grew two jobs:** `phase split <spec> <id> "<title>"… [--items "b:1,2 c:3"]`. The original keeps its id, file and ticked items; each title becomes a lettered part (`b` = first title) and takes the open items listed by `#N`. The output lists every ref that still points at the original: keep each one or retarget it to a part.
- **Without Bun:** do the same by hand, following the same id rules. Copy the flat template from `create.md`, and put the `progress.md` line after the last line of that id's family. Never write a nested `- [ ] Phase …` line: the tools can't see it, and the doctor warns.

### Add supplementary files to a folder-shape phase if warranted

- If the current phase is folder-shape and the work has produced content that needs its own file (tier sub-plan, scratch analysis, wireframe, fixture notes), create a new supplementary file inside the phase folder with a descriptive name.
- Link to it from the phase's `plan.md` so resume picks it up when relevant.
- No ceremony required — this is a normal file write during update.

### Explicit prohibitions

- **Do NOT append a session log to `progress.md`.** Session content is routed: durable → ledger, phase-local → phase entry, ephemeral → `in-flight/phase-<id>.md` (at handoff).
- **Do NOT write implementation notes or prose guidance to `progress.md`.** Those belong in the phase entry's prose section.
- **Do NOT create a "Implementation Notes" or "TODO Later" section in `progress.md`.** Legacy specs may still have these; leave them alone (see `legacy-layout.md`).

## 5. Capture learnings into the ledger

Reflect on the session. For each item that emerged, classify it as **durable**, **phase-local**, or **ephemeral**:

### Durable (cross-phase) → new ledger entry

Learnings that will matter after this phase is done, or apply across multiple phases:

- **Approach changes / pivots** — decisions about how to implement something that should inform future work. Kind: `decision`.
- **Gotchas** — traps that bit you and would bite a future agent too. Kind: `gotcha`.
- **Standing principles** — rules of thumb that emerged ("always X before Y"). Kind: `principle`.
- **Domain facts** — how entities/features relate, how the data model really works, relationships you had to discover. Kind: `domain`.
- **Workarounds** — temporary fixes that will need revisiting. Kind: `workaround`.
- **Dead ends** — approaches that were tried and failed, with the reason (prevents future agents from re-trying them). Kind: `gotcha` (typically) or free-form.

For each, write `ledger/<kind>-<slug>.md` per SKILL.md → *Ledger entry format* (frontmatter, `applies-to` grammar — pick the narrowest correct scope; a `[phase N]`-only learning usually belongs in the phase entry instead) and *Write discipline* (update a near-duplicate in place; add the INDEX row). Body: 5–30 lines, the rule/fact + why it matters.

### Phase-local → write into the phase entry

Learnings that only matter for the current phase and won't forward-propagate:

- Add them to the phase entry's **"Phase-local notes"** section (or a free-form prose section inside the phase entry / the folder's `plan.md`).
- If the note is substantial enough to deserve its own file **and** the current phase is folder-shape, create a new supplementary file inside the phase folder instead.

### Ephemeral → stage for handoff

Half-built state, session-specific notes, "pick up from here" instructions, environment state that matters until the pending work is resumed:

- **Don't write these during update.** Stage them mentally for when `handoff.md` runs — that's where the phase's in-flight file gets written.
- If you're running update but the session isn't ending, ephemeral notes can be held in conversation context and written when handoff fires.

## 6. Update code-map.md

If this session introduced a new **load-bearing** file — one a future agent would need to know about to navigate the code — add a row to `code-map.md`:

### For files introduced by this spec

Append to the "Introduced by this spec" table:

```
| File | Role | Phase |
|------|------|-------|
| path/to/new-file.ts | <short role description> | phase <N> |
```

### For existing files the spec touched meaningfully

Append to the "Existing files touched" table:

```
| File | Why we care | Ledger |
|------|-------------|--------|
| path/to/existing.ts | <why it matters for this spec> | `ledger/<entry>.md` if relevant |
```

**Discipline: load-bearing only.** If the file is trivial CRUD, generated code, or follows an obvious pattern, skip it. The goal is a short list a new agent can scan in one screen.

## 7. Update frontmatter

Don't bump `updated:` for an ordinary session: parallel sessions on one spec each bumped it and collided on that line. It moves only with a status change (below) or a review or prep rewrite.

Transition status if applicable, with `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts spec-status <spec> <status>`: it writes `status:` in `CLAUDE.md` on main, or the record for a spec on the board (SKILL.md → *Tools* → Spec fields on the board). Report its line. A spec not yet on the default branch is refused (`land the spec first`): edit `status:` by hand in this tree instead. Without Bun, edit it by hand.

- Only ever write a value the project allows (SKILL.md → *Stage vs. status*). The spec-file hook blocks any other value.
- `draft` → `active`: first items checked off across any phase
- `active` → `done`: every phase is done (`spec.ts ready <name>` says no phase is left)
- A legacy `in-progress` status counts as `active` — rewrite it to `active` on the next transition
- Print a notice when status transitions: "Status: draft → active"
- After a transition, run `bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh <spec-name>` (it bumps `updated:`, which stays in `CLAUDE.md`)

## 8. Report and nudge

After writing changes, print what was done. A standalone update opens with SKILL.md → *Reports*; when handoff runs this flow, skip it (handoff prints it once):

```
Updated: docs/specs/<name>/

Phase <N> — <Name>:
  ✓ Checked off <count> sub-items (now <done>/<total>)
  ✓ Added <count> ledger entries: <kind>-<slug>, <kind>-<slug>, ...
  ✓ Added <count> rows to code-map.md

Remaining in phase <N>:
- [ ] <next unchecked sub-item>
- [ ] <next unchecked sub-item>

Next phase: <N+1> — <Name> (not started)
```

If there are uncommitted changes, add:

```
You have uncommitted changes — consider committing the implementation + spec update together.
```

## 9. Close the phase

If `phase tick` just said `Phase <N> complete` (all its tasks are done), **do not just report it** — close the phase so the spec is resumable at the boundary and phase N's durable learnings reach the ledger:

1. Read [handoff.md](handoff.md) and run its *Reflect and redirect* and *Commit* sections; *Commit* also pushes, and in `docs: main` projects publishes the spec docs. Skip *Signal completion* — the session is **not** ending.
2. Print the `Remote:` line, then one line: `Phase <N> complete — Phase <N+1> ready.` (or `All phases complete — see pr-opening.md for the PR gate.`), then continue with whatever the session was doing.

Ending the session is a separate decision — `/spec handoff`, or execute mode's stopping rule.

## 10. Flat-to-folder promotion (opt-in)

If the current phase is a **flat file** and it has outgrown its scale — multiple tiers have emerged, supplementary diagrams are needed that don't fit inline, the file is getting uncomfortably long (rough heuristic: past ~200 lines or sub-structure is clearly forming) — offer to promote it to a folder.

### Promotion procedure (after user confirmation)

1. Create the folder: `phases/phase-<N>-<slug>/`
2. Create `phases/phase-<N>-<slug>/plan.md` with the flat file's entire content
3. Delete the old flat file `phases/phase-<N>-<slug>.md`
4. Update the pointer in `progress.md` from `phases/phase-<N>-<slug>.md` to `phases/phase-<N>-<slug>/plan.md`
5. The next resume/update session automatically uses the new folder path because `progress.md` is authoritative

A spec on the board keeps its flat phase files: its record names each file, and no command moves that path yet.

Reverse demotion (folder → flat file) is not automated. If it's ever needed, the user does it manually.

`phase split` refuses folder-shape phases: split those by hand, keeping the original id.
