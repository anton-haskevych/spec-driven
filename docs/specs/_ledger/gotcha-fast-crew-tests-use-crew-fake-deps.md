---
kind: gotcha
paths: [skills/spec/tools/tests/crew-*.ts, skills/spec/tools/commands/crew/**, skills/spec/tools/crew/**]
created: 2026-11-17T17:06:46-08:00
seen-in: [oversee-one-spec]
---

# A fast crew test builds its deps with `fastCrewDeps`, never `tests/crew-deps.ts`

Import `fastCrewDeps(root)` from `tests/crew-fake-deps.ts`: a `CrewDeps` on `gitStub` whose common dir is
`<root>/.git` (a `createTree` temp dir), answering `claude …` by argv prefix. `tests/crew-deps.ts` (`crewDeps`,
`claudeAnd`) reaches `tests/git-repo.ts`, so any test importing it must be a listed `*.git.test.ts`; the real-git
allowlist test fails a plain `*.test.ts` that does. `crew-deps.ts` stays a `HELPER_EXCEPTIONS` entry until
fast-tests phase 8 moves the four `crew-*.git.test.ts` files onto the fake.
