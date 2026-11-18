---
kind: gotcha
paths: [skills/spec/tools/**/*.ts, package.json, tsconfig.json]
created: 2026-11-17T18:27:28-08:00
seen-in: [oversee-one-spec]
---

# A plugin worktree without node_modules fails typecheck and test:fast: run bun install first

A worktree of this repo starts with no `node_modules`: `bun run typecheck` stops on "Cannot find type definition
file for 'bun'" and `bun run test:fast` fails on "Cannot find module '@ast-grep/napi'" from
`tests/real-git/repo-builds.ts`. Run `bun install` once in the tree (8 packages, under a second); neither error
says anything about the code under test.

Seen 2026-11-17 in `oversee-one-spec-pr-d`, a tree reused across phases: 2 "failures" that were only the missing install.
