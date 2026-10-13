---
created: 2026-10-12T14:06:26-07:00
updated: 2026-10-12T20:45:25-07:00
status: active
area: [tools, sub-commands]
domain: [spec-workflow]
scope: [feature]
priority: p1
related:
  - self-driving-loop: its phase 1 (defaults vs forks, start without "go") is what phase 3 parks on; this spec takes over what its brief left out (launching with no pick, how many run at once)
  - pr-babysit: owns the PR question and the babysit procedure; this spec adds hold-for-review, the after-merge gate and a standing ship mode, reversing its "no babysit without asking" rule on purpose
  - spec-board: the overseer schedules from the board's ready lane, claims and needs-you lane; phases 2 and 3 add needs-you kinds
  - active-work-view: the board stays read-only; every overseer action lives outside it
  - spec-loop-automation: built the settings, push and publish-docs tools this spec extends; only its CRM-adoption phase is open
---

# Oversee Crew Spec

`/spec oversee-crew` turns one session into an overseer that writes no code. It keeps a set
number of background Claude workers busy on the board's ready work, checks every handoff
before it counts, sends each finished PR group to a babysitter in its spec's ship mode
(`auto` or `hold-for-review`) and comes to Anton only for reviews, approvals and decisions.
Every session also pushes its branch from the first commit. Deploys are babysat only for infra
PRs. Phase 1 is a fast path: written steps plus four small tools on `claude --bg` /
`claude agents --json`; the crew then builds phases 2–5 itself and phase 6 adopts it in CRM.

The spec folder is `oversee-crew-spec` so that a bare `/spec oversee-crew` dispatches the
mode, not this spec (`T/context/request.ts:21-22`).

## Files

| File | Purpose |
|------|---------|
| `product-brief.md` | Business intent from prep |
| `design.md` | The overseer's flows, worker states, ship modes, copy, edge cases, decisions |
| `technical.md` | State homes, run file, launch brief, launch and roster-wait commands, close-out check, mode-file changes, later tools |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail — one entry per phase, flat file or folder |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `in-flight.md` | Ephemeral pending state (on-demand) |
| `reviews/` | Collegium review snapshots (on-demand) |
| `research/` | Prep recon: waves 0–2c (Oct 11 run, seams, live `--bg` probes) and the craft wave |

Proposal page Anton approved (2026-10-12): https://claude.ai/artifact/95tQfF7VHL6YsfeK37Wh4d

## Relationship to code

This spec is a *design document*, not a live mirror. For ground truth see:
- `skills/spec/SKILL.md` — sub-commands, *Session lifecycle*, *Next sessions*, *Tools*
- `skills/spec/execute.md` §1 (tree + claim), §6 (per-unit cycle), §10 (PR gate)
- `skills/spec/babysit.md`, `skills/spec/handoff.md` §3–§4
- `skills/spec/tools/` — `launch/`, `sessions/`, `claims/`, `board/`, `pr/`, `playbook/settings.ts`
