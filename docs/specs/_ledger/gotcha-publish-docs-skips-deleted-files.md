---
kind: gotcha
paths: [skills/spec/tools/publish/**]
created: 2026-10-07T19:16:23-07:00
seen-in: [active-work-view]
---

# `publish-docs` never publishes a deleted spec doc: a deletion needs another path to main

`specDocChanges` publishes only `A`/`M` paths; `D` paths are reported as "not published (deleted on the branch)" and stay on main. Any flow that removes a spec-doc file to change shared state (a registry entry, a marker file) won't land through `publish-docs`; edit a line instead, or commit straight onto the default branch.

Evidence: `publish/snapshot.ts` `specDocChanges` (`status === "D"` → `deleted`), `publish/render.ts` (`not published (deleted on the branch)`). It also runs only when settings say `docs: main` (`commands/publish-docs.ts`); the plugin default is `docs: branch`. Found reviewing active-work-view, whose `focus drop` would have deleted `_focus/<spec>.md`.
