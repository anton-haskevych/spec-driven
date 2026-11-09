# Connect the native entry — reconnaissance

Scope: Phase 2's three “connect the entry” items. Two read-only explorers mapped entry/composition and packaging/workflow respectively; one wave sufficed. No live native/installation/ownership actions were run.

## Seam and reuse

- `skills/spec/tools/spec.ts:31-32,66-70` has a context override but otherwise falls through to Claude command factories. Guard the dispatcher before the override or registry lookup.
- `commands/stored-runtime-context.ts:16-41` already composes qualified disk claims, workspace inference and `runtimeContextPack`; reuse it unchanged. `commands/runtime-context.ts:20-34` already resolves identity and consumes one snapshot.
- `runtime/codex/probe.ts:31-60` already bounds CLI/daemon version, endpoint, paginated read-only enumeration, initiating ID/cwd and cleanup. Bind that existing probe and reuse its single snapshot; no second source enumeration.
- `runtime/resolve-identity.ts:12-42` and `runtime/identity.ts:3-16` own qualified identity/conflict semantics. Never translate native IDs into Claude environment variables.
- `core/git.ts:59-72` and `workspaces/list.ts` supply common-directory and workspace primitives. Entry must refuse a known shared common directory even before the remaining local-cycle acceptance is built.
- `skills/spec/SKILL.md:23-30,97`, `execute.md:38-61`, `handoff.md:138-165` contain automatic Claude bootstrap/ownership/publication/cleanup. One shared capability contract must precede those steps; aliases already route to canonical policy.
- `commands/phase.ts:92-107` can publish with `deployed --land`; a command-family-only allowlist is insufficient. `phase park` also tells the agent to push, so mode instructions must qualify tool-generated follow-up advice.
- `.codex-plugin/plugin.json` is metadata-only. `scripts/version.py:28-61` already checks the three versions; retain it. Native explicit `skills: ./skills/` is supported by official packaging documentation: https://developers.openai.com/plugins/build/plugins (read 2026-11-09).
- Runtime imports are relative or Bun/Node built-ins; the source package needs no runtime node_modules. Content SHA256 over actual packaged code/workflow assets can identify a candidate without installed `.git`, an updater or a release record.

## Testing-issue estimate

- Reuse disposable repositories/context fixtures (`tests/git-repo.ts:80-103`, `context-fixture.ts:11-26`), typed RPC/runner fixtures (`runtime-codex-probe.test.ts:17-33`) and current configured dispatcher tests (`context-stored-runtime.test.ts:19-104`). Default tests must never query the developer's daemon/home.
- Missing: pre-dispatch guard coverage, current native bootstrap fixture, candidate content/path attestation and package-without-git/dependencies execution.
- `commands-table.test.ts:4-19` only observes registry/usage and cannot catch side-effect fallthrough. Use refusing injected context/runner ports and observable disposable mutations, plus raw CLI refusal.
- Empty context is possible for prep/legacy/unsupported modes (`commands/context.ts:56-58,77-81`); it cannot certify entry. Explicit spec/phase validation must prevent hint fallback (`context/select-phase.ts:12-19`).
- Code seams are below 250 lines (`spec.ts` 84, context 117, stored context 42, probe 81). `execute.md` is 238 lines and canonical SKILL already exceeds the cap; keep the shared capability reference separate and add only short call-site directives.
- Actual separate-clone legacy prune enumeration, invalid-edit correction, installed model-driven local cycle and fresh pickup remain later Phase 2 acceptance. Fixture success does not establish those results.

No applicable `.claude/rules` directories or repository AGENTS/root CLAUDE were present. Canonical personal and authored parent guidance were read. No recon design fork requires user input.
