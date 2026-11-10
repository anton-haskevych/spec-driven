# Local-cycle preflight

Inputs: phase-2-session-ownership.md, adjacent local-cycle recon and branch principles.md. All referenced seams were read. No new runtime/library API is needed: installed Bun 1.4.4, existing parseArgs, isolated runners, Git fixtures and checker APIs suffice.

## Findings that change the plan

1. Per-file validation is an API, not an agent-operated entry command (`hooks/spec-file-check.ts:34`). Add `doctor <spec> --file <path-relative-to-spec>` backed by that API, with missing/outside-file refusal. Do not add another validator or bypass entry.
2. Generated advice violates declared limits (`commands/phase.ts:75`, `context/packs.ts:152-161`). Carry optional declared workflow through existing shared composition; pilot parks say local commit and lesson advice says explicit entry recall. Default Claude behavior/text remains covered.
3. The historical prune suite proves the hazard but not clone exclusion (`tests/runtime-legacy-readers.test.ts:50`). Add a linked positive control and separate clone in the same disposable origin; assert actual candidate enumeration and no removals. Frozen source remains untouched.
4. Source socket execution is not native acceptance (`tests/codex-packaged-entry.test.ts:73`, `tests/runtime-codex-resource-execution.test.ts:43-60`). Keep deterministic cycle tests and an agent-operated installed acceptance procedure distinct. No fabricated native pass.

## Clean Code

| Rule | Verdict | Consequence |
|---|---|---|
| Names, meaningful distinctions, common vocabulary | Bites | `doctor --file` validates; acceptance procedure labels fixture versus native evidence. |
| Small functions, one level, few arguments | Bites | Keep doctor wrapper at the command edge; packaged test below cap. |
| Flag arguments, side effects, command/query separation | Bites | Declared workflow is existing optional data; checker/discovery read, tests alone edit fixtures. |
| Comments | Inert | |
| Encapsulation, Demeter, data boundaries | Bites | Reuse `issuesForWrittenFile` and public entry; no exposed fixture internals. |
| Errors, null, Special Case | Bites | Missing/outside files refuse explicitly; retain house error strings. |
| Third-party boundaries and learning tests | Inert | No new library/API. |
| TDD, one concept, F.I.R.S.T. | Bites | Focused doctor/advice contracts and one full copied-candidate cycle. |
| Classes/cohesion | Inert | |
| Beck simple design | Bites | Existing doctor and Markdown binding suffice; no acceptance framework. |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule, circles, plain boundary data | Bites | Shared context/phase accept runtime-neutral workflow value, never native client. |
| Humble object, policy versus detail | Bites | CLI doctor calls existing checker; candidate procedure uses existing entry. |
| REP, CCP, CRP | Bites | Native procedure beside native-entry; integration fixtures beside existing test. |
| ADP, SDP, SAP | Bites | No inverse native imports or new provider abstraction. |
| Screaming architecture | Bites | Keep doctor/context/phase concerns in their current homes. |
| Tests outermost | Bites | Historical fixture imported only by tests, not production entry. |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP by actor | Bites | Doctor owns agent feedback; native entry owns mechanics; tests own simulated source. |
| OCP | Bites | Profile is optional; default Claude registry stays intact. No speculative host variants. |
| LSP | Inert | |
| ISP | Bites | Only context and phase consume optional workflow data. |
| DIP | Bites | No native API named by shared context/phase rendering. |

## DDD

| Rule | Verdict | Consequence |
|---|---|---|
| Ubiquitous language, published language | Bites | Local restricted handoff never means managed or native acceptance. |
| Entities/value objects, factories | Inert | |
| Invariant ownership | Bites | Existing entry owns isolation/identity; existing checker owns validation. |
| Aggregates, repositories, cross-aggregate consistency | Inert | |
| Services/policies, events, contexts/shared kernel, ACL | Inert | |
| Specification, pure assertions | Bites | Historical nomination assertions prove positive control and clone exclusion. |

## Guard blindness and testability delta

`issuesForWrittenFile` returns no issues for absent files (`hooks/spec-file-check.ts:38`); doctor wrapper must refuse them before claiming clean. Socket fixture IDs are synthetic even if process IDs differ. Native acceptance requires distinct real IDs and model work, not a green test. No new size or extraction obstacle beyond recon.

## Amendments

1. Add narrow shared doctor file invocation and refusal tests.
2. Propagate declared profile only to existing feedback consumers and preserve Claude regressions.
3. Prove actual historical clone isolation with existing Git primitives; add deterministic local cycle and source-contained native procedure.
4. Record approved later thin `spec` command, same-host default and automatic discovery in Phase 3 launch scope only; no implementation/framework here.

## Defaults applied

Use Markdown as the agent-operated native acceptance driver and existing CLI as its execution surface. No live install, launch or native acceptance in the assigned implementation worktree. Full parity and Group A native acceptance remain required.

## Forks for you

None.
