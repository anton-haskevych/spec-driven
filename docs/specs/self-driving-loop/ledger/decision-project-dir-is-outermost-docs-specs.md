---
kind: decision
applies-to: [phase 4]
created: 2026-10-10T13:47:09-07:00
---

# The project dir is the outermost folder holding docs/specs

`findProjectDir(start)` walks up from the working folder, checks each folder for `docs/specs` before stopping at `.git` (directory, or a worktree's file) or `/`, and returns the outermost hit, else `start`. `spec.ts`, both hooks (`payload.cwd`) and `spec-bump.sh` use it.

Rejected:
- Nearest folder: re-roots CRM `landing/…` to `landing/`, which has no `_playbook` or `_ledger`, so `docs: main` silently becomes push-to-branch. The root listing already covers `*/docs/specs`.
- Git toplevel alone: breaks a repo whose specs sit in a subproject.
- `locateSpecFile`: covers only folders inside a spec. The live repro was `skills/spec/` (`claim list` → ENOENT on `.git/spec-board/base/<sha>/skills/spec/`).
