# Preflight: canonical pilot occupancy

Grounded serially after `2026-11-09-pilot-cwd-recon.md`, per controller restriction. House rules: installed `skills/spec/principles.md`, authored-plugin parent guide, owning spec and full `workflow-parity.md`. No repo-local or global `.claude/rules/` directory exists in this checkout/session. Installed Bun 1.4.4 and existing filesystem/path APIs suffice; no repeated platform or library research.

## Findings that change the plan

1. `runtime/codex/entry.ts:60` compares raw cwd strings against a canonical workspace. Canonicalize other cwd values before containment; do not replace qualified self-exclusion or loosen initiating cwd verification at lines 56-58.
2. `commands/doctor-file.ts:10-24` already supplies the path/error idiom. Reuse standard primitives in the native adapter; adding a reusable ownership/scanner abstraction would exceed this chunk.
3. Existing `tests/codex-entry.test.ts:113-127` tests direct occupation only. Real symlinks and prefix-neighbor positive controls must run through the entry; a text comparison unit test would miss the filesystem contract.

Paths above are under `skills/spec/tools/`.

## Clean Code against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Intention-revealing names, distinctions, one concept, domain names | Bites | Name a small exclusive-pilot occupancy check in entry.ts. |
| Small functions, one thing/level, few args, no flags | Bites | entry.ts:38 stays under 50 lines; helper takes workspace/sessions/own. |
| Side effects; command/query separation | Bites | Occupancy helper reads filesystem only; returns Result, never changes sessions. |
| Comments explain why only | Bites | entry.ts requires no explanatory algorithm comments. |
| Objects/data, Demeter, anti-symmetry | Inert | Plain session values already cross the boundary. |
| Exceptions/codes/null/Special Case | Bites | Match pilot-workspace.ts:29-31 Result refusal on unreadable evidence. |
| Third-party boundary/learning tests | Bites | Real fs aliases in codex-entry.test.ts exercise the platform primitive. |
| TDD laws, one concept, F.I.R.S.T | Bites | Run alias regression red before production edit; use isolated Git fixtures. |
| Classes, SRP/cohesion | Inert | No class introduced. |
| Beck simple design | Bites | Existing path idiom and entry seam; no framework/extraction without second use. |

## Clean Architecture against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule/four circles | Bites | Filesystem detail stays in runtime/codex/entry.ts. |
| Plain-data boundary | Bites | Preserve RuntimeSession/SessionRef; no native DTO escapes. |
| Humble Object | Bites | Existing injected observe and real disposable fs test the edge. |
| Policy vs detail | Bites | No changes to claims, context or shared ownership policy. |
| REP/CCP/CRP cohesion | Inert | No component/package introduced. |
| ADP/SDP/SAP coupling | Bites | Standard fs/path imports add no dependency cycle. |
| Screaming architecture | Inert | Existing native adapter location remains. |
| Tests outermost | Bites | Test entry through its public injected dependencies. |

## SOLID against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP by actor | Bites | Native pilot exclusivity belongs to entry; shared ownership remains Phase 2b. |
| OCP | Inert | No new runtime/source variant in this chunk. |
| LSP | Inert | No subtype or caller type checks introduced. |
| ISP | Bites | Reuse CodexEntryDeps; no enlarged framework port. |
| DIP | Bites | Keep observe/runner injected; filesystem mechanics remain at the native edge. |

## DDD against this chunk

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Ubiquitous language/domain vs customer word | Bites | Report exclusive pilot occupancy, never acquired ownership. |
| Entity/value object; invariant ownership | Bites | sameSession in identity.ts remains authoritative for qualified identity. |
| Aggregate root/boundary; cross-aggregate consistency | Inert | No managed mutation/aggregate added. |
| Repository per aggregate; factories | Inert | Existing typed fixtures suffice. |
| Services/policies; events | Inert | No domain service/event added. |
| Bounded context/shared kernel; anti-corruption | Bites | Native canonicalization stays outside Claude/scanner policy. |
| Published wire language/specification | Inert | No wire/schema change. |
| Side-effect-free functions/assertions | Bites | No writes or inferred liveness in occupancy decision. |

## Guard blindness and testability delta

No new architecture/lint guard is claimed. The entry tests call the real exported boundary; assertions require explicit occupancy/unavailable errors, not just any failure. Existing real-source discovery/coverage tests remain. The recon's 118/147-line counts leave room below caps. Deterministic missing/dangling/cyclic paths test failed filesystem evidence without permission assumptions. No extraction or external service is required.

## Amendments

1. One testable unit: canonicalize every non-self session cwd, use relative containment with segment boundaries, and refuse unavailable/non-absolute path evidence.
2. Test direct/nested/symlink root/symlink child, unrelated and prefix-neighbor acceptance, failed-path refusal, and qualified identity collisions through runCodexEntry.
3. Retain the initial failed parallel attempt separately. Record serial-only recon as a pilot workaround, not future managed parity acceptance.

## Defaults applied

Use existing node:fs/node:path primitives and sameSession; conservatively refuse unresolved cwd evidence even if its raw spelling appears outside the pilot. Preserve initiating identity checks and all Claude behavior.

## Forks for you

None. Scope and serial workaround are explicitly authorized by the controller.
