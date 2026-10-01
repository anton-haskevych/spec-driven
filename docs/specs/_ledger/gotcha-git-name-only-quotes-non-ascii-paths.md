---
kind: gotcha
paths: [skills/spec/tools/**]
created: 2026-10-01T14:55:17-07:00
seen-in: [spec-board]
---

# Read git path lists with `-z`: without it git quotes non-ASCII paths

`git diff --name-only`, `git log --name-only` and `git status --porcelain` print a path with a non-ASCII
character as a C-quoted string (`"docs/specs/caf\303\251/CLAUDE.md"`) because `core.quotePath` defaults
to true. Pass `-z` and split on `\0`; then paths come out raw.

Why it bites: a quoted path starts with `"`, so `isSpecDocPath` and `locateSpecFile` silently miss it
and the spec drops out of the result. ASCII fixtures never show it. Probed 2026-10-01 (git 2.54). Still
present in `context/infer-spec.ts` `branchCommitPaths` (`log --name-only` without `-z`).
