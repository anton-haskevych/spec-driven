---
kind: gotcha
applies-to: [phase 1+]
created: 2026-11-13T15:46:11-08:00
---

# A "fast" test can run real git without importing anything: production code defaults to `systemRunner`

Some functions default their runner to `systemRunner`: `deployedOnMain(…, runner = systemRunner)`, called with no
runner from `commands/phase/deployed.ts:15`, plus `doctor`, `ready`, `push`, `focus`, `ship` and `owner`. Others
hard-wire it (`context/claims-here.ts:16`). A migrated test that misses one seam runs git in a temp dir that isn't a
repo. Git fails, the command takes its fallback branch, and the test passes while proving nothing.

The import scan can't see this. The `test:fast` git tripwire (a shim first on `PATH`) is what catches it. When it
fires, pass the deps through; don't widen `gitStub`.
