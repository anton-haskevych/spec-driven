---
kind: gotcha
applies-to: [phase 5, 6, 7, 8]
created: 2026-10-10T16:07:14-07:00
---

# `pr` commands read settings from the tree they run in, not from main

`loadSettings(projectDir)` reads `docs/specs/_playbook/settings.md` in the working tree. In a `docs: main`
project a settings change lands on main, so a PR tree (or a main checkout that is behind) keeps the old
rules until it merges main. Seen 2026-10-10: `checks.external: ["Vercel*"]` pushed to CRM main
(`d59712d`); `pr wait 923` run from the 8-behind main checkout would still have waited on Vercel.

Babysit runs in the PR's tree: the procedure merges main at babysit start only if it needs to anyway;
otherwise the setting arrives with the next merge of main. If this bites in phase 8, read settings from
`origin/<default>` (the board's `git archive` base cache) for `docs: main` projects.
