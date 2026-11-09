# Isolated installation preflight

Inputs: Phase 1 plan, isolated-install recon and principles; manifests, version helper, scoped plugin-publish flow and generated native schemas read. Scope is the third chunk and then handoff.

## Findings that change the plan

1. `.codex-plugin/plugin.json:1–39` has no native hook. Install the actual historical package first; use an explicitly labelled disposable candidate with a harmless hook only to measure native trust/retention. Never present fixture behavior as implemented spec bootstrap.
2. `technical.md:90–94` requires actual supported-route fencing. An installed version or force-reloaded skill catalog cannot prove old-session resume fencing; keep that item open without native execution evidence.
3. `scripts/version.py:25–32` checks declarations only. Independently hash/cache-path-check the actual materialization before/after reinstall and preserve running native-thread metadata separately.
4. `technical.md:154` makes native trust authoritative. No automatic trust acceptance, trust-store edits or bypass flag. An untrusted/modified native result is a useful refusal observation, not a positive trusted-hook proof.

## Canon passes

| Clean Code rule | Verdict | Concrete consequence |
|---|---|---|
| Names/distinctions/one concept | Bites | Distinguish installed localVersion, catalog path/hash and loaded-thread hook evidence. |
| Small functions/levels/arguments/flags | Bites | Existing probe RPC stays small; temporary drivers do no production orchestration. |
| Comments | Bites | Immutable notes explain fixture-only versions and scope. |
| Side effects/command-query | Bites | Explicit scratch CODEX_HOME/cwd on every installer/server child. |
| Data/Demeter | Bites | Sanitize native reports; never retain raw global configuration/auth. |
| Errors/null/Special Case | Bites | Auth absence/unsupported source stays unverified; no empty success. |
| Boundaries/learning tests | Bites | Native CLI/RPC observations, separate reproducible fixture assertions. |
| TDD/FIRST/one concept | Bites | No production code planned; observed contract fixture begins red. Native experiments are exempt. |
| Classes | Inert | No class. |
| Beck simple design | Bites | Existing native flow, no coordinator/activation pointer. |

| Clean Architecture rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency direction/four circles | Bites | No installation calls in shared workflow policy. |
| Plain boundary data | Bites | Retain versions/hashes/trust states, not native credentials. |
| Humble object/policy-detail | Bites | Temporary driver observes; no release policy inferred from CLI success. |
| REP/CCP/CRP | Bites | Phase-local evidence grouped with Phase 1. |
| ADP/SDP/SAP | Inert | No new production dependencies. |
| Screaming architecture/tests outermost | Bites | Fixture names explicitly say isolated probe; tests never invoke live installer. |

| SOLID rule | Verdict | Concrete consequence |
|---|---|---|
| SRP actor | Bites | Native host remains activation/trust authority. |
| OCP | Inert | No production variant. |
| LSP | Bites | Catalog discovery never substitutes for loaded release. |
| ISP | Bites | Reuse narrow probe RPC; no universal installer/provider. |
| DIP | Bites | Policy stays independent of native CLI/loopback Git details. |

| DDD rule | Verdict | Concrete consequence |
|---|---|---|
| Language/value identity/invariant owner | Bites | Native install identity and thread ownership are separate; probe journal owns cleanup. |
| Aggregate/cross-aggregate/repository/factory | Inert | No shared state implementation. |
| Services/policies/events | Inert | No domain service or event system. |
| Context/shared kernel/anti-corruption/published language | Bites | Native schema facts stay in experiment evidence. |
| Specification/assertions/purity | Bites | Tests assert reported scope; no fixture launches a server. |

## Guard blindness and testability delta

Version checks and current tests cannot observe native retention, loaded release or resumed execution. No positive hook-trust test is possible without actual native review. Standalone local metadata may work without auth; if model execution does not, leave the corresponding proof open. Desktop isolation is unproved, so do not launch it. No production extraction or guard widening is needed.

## Amendments and defaults applied

1. Export the complete historical tree into an owned temporary marketplace; install only into child-specific scratch CODEX_HOME.
2. Try an owned loopback Git source to exercise scoped upgrade. If native parsing refuses it, record the limitation; no remote publication or blanket refresh.
3. Compare actual cache paths/content and native catalog/hook reports across fixture revisions. Trust remains unaccepted and model-backed resume remains unproved without auth.
4. Stop exact owned servers/threads; persist sanitized evidence. Preserve both remaining deliverable checkboxes unless their complete obligations pass.

## Forks for you

None before bounded isolated evidence. A demonstrated relevant native retention/fencing failure becomes a parked design question; absent proof alone does not.
