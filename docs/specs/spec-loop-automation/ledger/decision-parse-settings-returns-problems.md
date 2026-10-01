---
kind: decision
applies-to: [phase 5+]
created: 2026-09-30T17:34:55-07:00
---

# `parseSettings` returns `{settings, problems}`, so the readers and the doctor share one schema walk

technical.md specified `parseSettings(text): ProjectSettings` and a separate `doctor/settings.ts` validating types and unknown keys. That would put the schema in two places. Instead, `playbook/settings.ts` walks one key table, applies the defaults and collects problem strings. `doctor/settings.ts` turns them into warnings and adds only the gate-name errors (needs `gates.md`), plus an error for broken YAML.

`loadSettings(projectDir)` returns `ProjectSettings` with `file` set only when `settings.md` exists. Callers branch on `settings.file` (pack line, doctor repo lines, gitattributes check). `describeSettings` is the one rendering, used by `spec.ts settings` and the packs. A new key is one table row plus one field in `ProjectSettings`.
