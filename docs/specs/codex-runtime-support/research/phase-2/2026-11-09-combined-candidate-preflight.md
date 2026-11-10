# Combined candidate integration preflight

Inputs: retained d5e17cd pilot patch and its original cwd recon/preflight; assigned-source fc10395 parentage fix and its recon/preflight/native results; current phase and principles. The two mechanisms overlap only in entry.ts's occupation check and adjacent entry tests. Existing preflights cover each invariant; this note records their composition.

## Findings

1. entry.ts:61's descendant exemption must survive inside the pilot patch's verifyExclusivePilot loop. Skip exact self and verified descendants before resolving competitors' cwd. Taking either conflict side wholesale loses a required behavior.
2. codex-entry.test.ts:59 has different adjacent additions. Preserve raw-metadata descendant/independent-root integration and all four real-filesystem/qualified-ID regressions; do not replace either fixture. Existing nativeThread map and withOtherSession wrapper compose without new infrastructure.
3. Installed candidate and pilot source are different checkouts. Freeze one combined package from assigned source. The first real installed session's useful chunk is reconciling retained pilot code with the reviewed parentage changes; compare runtime files with frozen candidate, then test/commit and hand off. Do not invent another feature solely for acceptance.

## Canon and house rules

| Pass | Constraint |
|---|---|
| Clean Code | entry.ts keeps one named verification wrapper, under 50-line functions/250-line files; typed test fixtures and existing error values remain. Comments/classes/flag arguments are inert. |
| Clean Architecture | Native fs/path work stays at entry; parent-chain policy stays pure. Reuse existing Result/SessionRef/identity boundaries; no new RPC, controller or ownership abstraction. |
| SOLID | Preserve each actor's existing concern: native decoder supplies parentage, pure helper proves descent, entry checks competing paths. Optional values preserve Claude producers; LSP is inert. |
| DDD | Native parent and filesystem cwd are separate value evidence. Qualified identity owns equality; no copied-history or path alias grants delegation. No persisted aggregate/claim change. |

No new library/API or new extraction is needed. Existing tests expose loss of either conflict side. Full combined suite/typecheck precede freezing; real installed execute with simultaneous children, actual update/handoff and independent fresh resume are required before the local-cycle gate closes. Scoped native install/removal and integration were authorized by Anton's current instruction. No fork needs a user decision.
