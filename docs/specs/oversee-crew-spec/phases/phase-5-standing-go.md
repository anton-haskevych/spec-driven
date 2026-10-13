---
needs: [3]
pr: E
---

# Phase 5 — Standing go in settings

**Goal:** A project's `settings.md` carries a default ship mode (`pr.ship`, read by every PR moment) and a `crew:` section (workers, babysitters, self-approvable gate kinds). The overseer starts from them, and every worker checks them itself.

**Outcome:** You set the crew rules once per project and every worker reads the same rules from the repo; the overseer stops asking at every start · small · risk: settings are shared, so a teammate's crew follows them too.

**Files to touch:**
- `skills/spec/tools/playbook/settings.ts`, `skills/spec/tools/doctor/settings.ts`, `skills/spec/tools/commands/context.ts`
- `skills/spec/execute.md`, `skills/spec/oversee-crew.md`, `skills/spec/crew-brief.md`
- settings tests, context tests

## Implementation guidance

technical.md → *Phase 5*. A `pr.ship` key next to `pr.draft` and `pr.merge`, with no default. Each
spec's `ship:` wins over it. Plus one `crew` `SECTION_KEYS` row, a typed `crew` block, defaults
(3 workers, 2 babysitters, empty self-approve list), and the pack's `Settings:` line.
The doctor errors on a self-approve kind that isn't a known gate kind.

A worker at a gate whose kind is in `crew.self-approve` passes it itself: ticks the `Gate:`
item with `--evidence "self-approved per docs/specs/_playbook/settings.md crew.self-approve, <date>"`
(`phase tick` needs a path, link or date as evidence) and lists it under
"Say if wrong". Any other gate parks (phase 3). This is the only path by which a gate is
passed without Anton, and it is written in the repo where the worker reads it, not relayed.

The overseer reads `crew:` at start and asks only for what settings leave open.

## Deliverables

- [x] 5.1 `pr.ship` and the `crew:` settings section: parser, defaults, doctor checks, `Settings:` line; execute §10 / handoff §4 read `pr.ship` after the spec's `ship:`; tests
- [x] 5.2 execute.md: self-approvable gates passed by the worker with evidence and "Say if wrong"; all others park
- [x] 5.3 `oversee-crew.md` and `crew-brief.md` start from settings and ask only what they leave open

## Phase-local notes

- Version picked at merge, ROADMAP row.
