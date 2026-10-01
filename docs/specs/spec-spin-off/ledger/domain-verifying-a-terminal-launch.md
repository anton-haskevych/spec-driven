---
kind: domain
applies-to: [general]
created: 2026-10-01T13:08:36-07:00
---

# Verify a new terminal launch with osacompile, then one read-only live launch

`launch` can't open a terminal in CI, so `tests/launch.test.ts` only asserts argv. Before shipping a new
terminal case: compile any AppleScript it generates with `osacompile -o <scratch>.scpt -e <script>` (checks
syntax and escaping without running it; try a project path holding quotes and an apostrophe), then run
`spec.ts launch status <spec>` once from that terminal. `status` is read-only, so the tab it opens is a
safe smoke test; close it after. A launch refused by macOS automation permissions exits non-zero with
"Not authorized to send Apple events", and the report falls back to printing the line.
