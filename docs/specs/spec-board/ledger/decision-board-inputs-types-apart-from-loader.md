---
kind: decision
applies-to: [phase 2+]
created: 2026-10-01T14:41:14-07:00
---

# `board/inputs.ts` is types only; `board/load.ts` composes the sources

`technical.md` put `BoardInputs` and `loadBoardInputs` in one file. Source adapters (`mainline/load.ts`
now, `workspaces/`, `sessions/`, `claims/`, `pr/` later) import the contract types (`BaseRef`,
`SpecStage`, `BoardInputs`) from `board/inputs.ts`, while the composer imports the adapters. One file
would make an import cycle. So:

- `board/inputs.ts`: types only. Pure files (`lanes`, `rank`, `attention`, later `activity`, `joins`)
  import from here and never from an adapter.
- `board/load.ts`: `loadBoardInputs` (one call per source) and `loadBoard` (inputs → `buildBoard`).
  Phases 2–4 add their source calls here.
- `Mainline` returns `commonDir`; the repo name and phase 5's claims dir both come from it.
- `BoardDeps { runner, now }` and `systemBoardDeps()` live in `commands/board.ts`, the only place
  defaults are wired; `list` reuses them.
