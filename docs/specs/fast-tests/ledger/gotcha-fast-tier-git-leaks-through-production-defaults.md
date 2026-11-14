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

**Phase 1 (2026-11-13):** the tripwire found 16 such files, all through one path: `readPlans` → `gitRecordReadPort` →
`git remote get-url origin`. They now pass `notARepoRunner` (`tests/stub-runner.ts`: every git call answers as outside
a repo, anything else throws) or `phaseDeps()` (`tests/command-deps.ts`, defaults the runner to it). A test that goes
through `spec.ts run()` can't pass a runner yet (`doctor-file.git.test.ts`, phase 3's task); a CLI child gets a `PATH`
with no git (`spec-folders.test.ts`).
