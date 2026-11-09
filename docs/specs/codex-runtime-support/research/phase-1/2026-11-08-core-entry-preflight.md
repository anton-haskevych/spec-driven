# Core entry proof preflight

Inputs: Phase 1 plan, core-entry recon, existing bounded RPC/install/historical-reader fixtures and `skills/spec/principles.md`. Scope is controlled native proof and recorded observations; no ownership or hook implementation is being enabled.

## Findings that change the plan

1. `runtime-legacy-readers.test.ts:29-68` already proves the hazard. A new floor marker at `spec.ts:62-65` cannot prove an older native resume is fenced. Investigate a supported route only; do not add production guard code on that assumption.
2. `runtime-codex-install.test.ts:25-32` records enabled but untrusted hooks. Only native review plus actual fresh-session execution can complete the trust part; generated hooks/list has no trust mutation route.
3. Actual scratch CLI startup stopped at sign-in before `/hooks`. Complete only the native isolated login if Anton does so; never copy credentials or bypass trust to keep the experiment moving.

## Clean Code

| Rule | Verdict | Consequence |
|---|---|---|
| Boundary learning tests and one concept per test | Bites | Observe native trust separately from metadata and preserve offline fixtures only after real outcomes. |
| Names/functions/classes/comments/object structure | Inert | No production code change or new abstraction is planned. |
| Errors and assertions | Bites | Existing Result RPC failures and incomplete native/UI coverage remain explicit, never empty success. |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency direction/plain data/humble edge | Bites | Existing probe RPC stays the experimental outer edge; no native details enter claims/board/trees. |
| Component cohesion/coupling and architecture shape | Inert | No component or production dependency changes. |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP/ISP/DIP | Bites | Native host owns trust/install; controller owns scratch evidence. Use request/observe/close only. |
| OCP/LSP | Inert | No provider replacement or new production variant. |

## DDD

| Rule | Verdict | Consequence |
|---|---|---|
| Published language/invariant ownership | Bites | Installed version, loaded hook metadata, trusted definition and actual execution are separate facts. |
| Entity/aggregate/repository/service/event structure | Inert | No production domain model changes. |

## Guard blindness and amendments

Existing fixtures characterize historical native observations; they do not run the host or approve hooks. Keep both remaining deliverables unchecked unless every stated part is actually covered. First obtain native core-hook review/execution evidence. In parallel, determine whether the current native installation/entry surfaces can fence historical ownership helpers; evidence of no supported fence is a design limitation, not permission to invent one. No file-size or production extraction delta from recon.

## Defaults applied

Use one owned scratch profile and the existing harmless SessionStart fixture. Native login/review only, no model/permission overrides, live installs, credential copies, trust-store edits, retention probes, publication or pushes.

## Forks for you

None for the authorized bounded proof. If the actual native ownership route cannot enforce the initial cutover, preserve that limitation and return the specific mixed-runtime activation choice before enabling it.
