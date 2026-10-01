---
needs: []
pr: A
---

# Phase 1 — Spec readers

**Goal:** Spec nodes and states load from any reader — a disk folder, a worktree folder, or blobs of a git commit — and `gitTreeReader` reads `origin/<default>`'s spec docs in one `ls-tree` + one `cat-file --batch`.

**Outcome:** Groundwork: nothing visible changes yet, but the tools can now see a spec as it is on main without trusting the current checkout · low risk, all additive.

**Files to touch:**
- `skills/spec/tools/graph/nodes.ts` (`loadNodeFrom`, `loadNodesFrom`)
- `skills/spec/tools/core/spec-folders.ts` (`specsFromPaths`)
- `skills/spec/tools/core/git-tree-reader.ts` (new)
- `skills/spec/tools/core/git-status.ts` (new, `parsePorcelainZ`), `context/infer-spec.ts` (uses it)
- `skills/spec/tools/core/schedule.ts` (`compareSchedule`, `ago`), `portfolio/order.ts`
- `skills/spec/tools/graph/overlap.ts` (export `HUB_LIMIT`, `pathUsage`; `overlapsWith`)
- tests: `graph.test.ts`, `core.test.ts`, `schedule.test.ts`, `portfolio.test.ts`, new `core-git-tree-reader.test.ts`, `core-git-status.test.ts`, `graph-overlap.test.ts`

## Implementation guidance

All extractions are additive (`research/2026-10-01-craft-layers-names-fixtures.md` → *Extraction*): the
disk versions delegate to the new `…From` functions, so the ~25 existing call sites don't change.
`gitTreeReader` follows `technical.md` → *mainline*; model the plumbing on `publish/snapshot.ts:59-75`
(`Git` + `ls-tree`). `ls-tree` rejects `:(glob)`, so filter its output in TypeScript. Prefetch the read
set, then batch the pointer targets that fall outside it (`../ci-optimization/…`) in a second
`cat-file --batch`. Fetching and picking the ref belong to Phase 3's `loadBoardInputs`; this reader
takes a sha.

## Deliverables

- [ ] `loadNodeFrom(spec, read)` + `loadNodesFrom(specs, readerFor)` (no first-wins); `loadNode` delegates — Map-reader tests
- [ ] `specsFromPaths(paths, base)` from `listSpecs`' match logic; both spec roots, `_`-prefixed names skipped
- [ ] `parsePorcelainZ` moved to `core/git-status.ts` with pure tests (rename/copy pairs, untracked, empty); `specsInPlay` uses it
- [ ] `compareSchedule` shared by `orderSpecs` / `orderBacklog` (existing portfolio tests pass); `ago(then, now)` with cases for s/m/h/d
- [ ] `overlapsWith(nodes, name, others)` honoring `HUB_LIMIT`, skipping finished specs and self — 3 pure tests
- [ ] `gitTreeReader(git, sha, roots)`: cat-file frame parser (pure tests) + one `repoWithOrigin` test reading both spec roots at a commit, a pointer outside `phases/`, and a `../../..` path refused

## Phase-local notes

- `SpecFolder.dir` for blob-loaded specs is a repo-relative virtual path; never pass those nodes to
  `phases/review-refs.ts` or `context/packs.ts executePack` (both read disk).
- `cat-file --batch` output can contain `missing` lines for paths deleted between `ls-tree` and read; treat as absent.
