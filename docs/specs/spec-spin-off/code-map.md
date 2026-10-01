# Code Map — Spec Spin-off

Load-bearing files this spec depends on or introduces.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/commands/launch.ts` | `spec.ts launch` report | 2 |
| `skills/spec/tools/launch/terminal.ts` | Terminal pick + argv | 2 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/ready/refs.ts` | Phase-level ref resolution (ready set, doctor, hook, validate) | |
| `skills/spec/tools/graph/nodes.ts` | `isFinished` — one rule for whole-spec needs | |
| `skills/spec/prep.md` | Spin-off section and seeded precondition | |
| `skills/spec/SKILL.md` | Session lifecycle, phase edges, relations, tools | |
