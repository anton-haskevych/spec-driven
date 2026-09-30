# Phase 1 preflight — chunk: Runner → parse → inferSpec → contextPack inference

Inputs: `phases/phase-1-context-pack-loads.md` (deliverables 1–5), `research/phase-1/2026-09-30-runner-recon.md`, `principles.md`. Paths relative to `skills/spec/tools/`.

## Findings that change the plan

1. **Chunk-reference regex matches spec names.** `technical.md` → *Context parse* step 3 uses `/^phase[-\s]*\d/i` (prefix only): `/spec execute phase2-rollout` would lose its spec name. All chunk patterns must match the **whole token** (`/^phase[-\s]*\d+[a-z]*(\.\d+)?$/i`, `/^\d+[a-z]*(\.\d+)?$/i`, `next`, or `phase` followed by another token).
2. **A real spec can look like a chunk reference** (`2fa`, `next`, `3`). The pure parser can't know. Inject `isSpecName: (name) => boolean` as the last param (house idiom: callback-type-as-last-param, `doctor/phases.ts:4,9`), default `() => false`; `spec.ts:20` passes `(name) => findSpecs(projectDir, name).length > 0`. An existing spec name always stays the name.
3. **Parse logic lives in a `commands/` adapter.** `commands/context.ts:24-31` is pure parsing inside a command file; adding punctuation, chunk refs and hint normalisation grows it. Move `ContextRequest`, `SUB_COMMANDS`, `parseContextRequest`, `isChunkReference` and `normalizePhaseHint` to `context/request.ts` (pure, own tests); `commands/context.ts` keeps pack assembly. `skill-wiring.test.ts:5` and `context.test.ts` import from the new module.
4. **`Bun.spawnSync` throws on a missing binary** (recon). `systemRunner` catches and returns `{code: 127, stdout: "", stderr: <message>}`; env is merged over `process.env`, never replaced (`skill-wiring.test.ts:60` drops `HOME`/`PATH`).

## Clean Code against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Intention-revealing names | Bites | `isChunkReference`, `normalizePhaseHint`, `inferSpecTarget`, `defaultBranch` — no `parse2`/`helper` |
| Small functions, one level | Bites | `inferSpecTarget` = base → paths → names; git calls in their own small functions |
| No flag arguments | Bites | Don't add `infer: boolean` to `contextPack`; inference happens because `name` is absent |
| Errors as values | Bites | `RunResult.code` checked by callers; no throws cross `core/run.ts` |
| Tests F.I.R.S.T | Bites | Real-repo tests build their own repo in `beforeAll`; fixed identity env |
| Comments | Inert | — |

## Clean Architecture against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | `context/infer-spec.ts` depends on the `Runner` interface in `core/run.ts`, never on `Bun.spawnSync` |
| Humble object at edges | Bites | `systemRunner` is the only spawn; untested beyond one smoke test |
| Screaming architecture | Bites | `context/request.ts` + `context/infer-spec.ts` beside `context/packs.ts` |

## SOLID against the chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Violated, fix here | Finding 3 |
| OCP | Inert | — |
| LSP / ISP | Inert | — |
| DIP | Bites | `contextPack(projectDir, request, runner = systemRunner)`; tests pass stub/real runners |

## DDD

Skipped — CLI plumbing, no domain model in scope.

## Seam and testability (deltas from recon)

- `phaseForHint` (`commands/context.ts:70-74`) and the name-slot check share one predicate — `normalizePhaseHint` in `request.ts` strips `/^phase[-\s]*/i`.
- Unnamed modes other than resume/status/execute are untouched; `route` with no name still returns `""` (bare `/spec` keeps SKILL.md's conversation inference).

## Amendments

1. Chunk patterns anchored to the whole token (finding 1).
2. `parseContextRequest(argv, isSpecName = () => false)`; `spec.ts` passes a `findSpecs` check (finding 2).
3. New `context/request.ts` holding the pure parse; new `tests/request.test.ts` (finding 3).
4. `systemRunner` catches spawn errors → code 127; env merged (finding 4).
5. Inference tests in a new `tests/infer-spec.test.ts` (keeps `context.test.ts` at 174 lines).

## Decisions for you

None.
