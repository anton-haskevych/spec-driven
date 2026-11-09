# Read-only context bridge — scope refinement

Applies the command-inputs recon/preflight to its third unit; the canon findings/defaults remain unchanged, no new fork.

`claims/store.ts:105–112` drops unknown fields and cannot attest qualified identity. Therefore the opt-in context entry will accept **already source-qualified claim inputs** from an injected reader, rather than call that legacy decoder or guess a source. Persisted claim codecs and the legacy-Claude binding remain pending together. This narrows amendment 3 of the preceding preflight.

Reuse `runtime/resolve-identity.ts:12`, `runtime/read-sessions.ts:10` and `runtime/identity.ts:11–16`. Resolve identity once from explicitly configured readers/binding; compose one snapshot; project to HeldPhases through pure exact-source policy; pass it to the shared contextPack. Configuration failures return Result errors. Unknown/missing/duplicate coverage retains claims; healthy rows still hold their own claims during partial source failure. No projection to LiveSession or naked-ID comparisons.

Tests: pure collision/coverage/self-exclusion cases, real shared context rendering with injected Claude/Codex adapters and read counters, and identity refusal before any I/O. All fixture-only; no host discovery, writes, install or mixed activation. Source-qualified in-memory inputs are not storage migration or execute→handoff acceptance evidence.
