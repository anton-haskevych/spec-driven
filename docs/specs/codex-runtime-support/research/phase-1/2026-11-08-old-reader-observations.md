# 2.51.0 reader observations

Actual frozen 22e7ec7 modules execute in `runtime-legacy-readers.test.ts`. SHA-256 provenance checks reverse import-only relocation and compare all seven reader modules with their recorded originals. The fixture README declares shared utility dependencies; this is not a complete native 2.51.0 installation.

Observed in disposable fixture directories/local Git repositories, no native/shared state:

1. Extra `runtime`, `source` and schema fields are ignored by old `claimFromRecord`. An otherwise readable claim for a Codex thread absent from Claude evidence is `closed` and stale. Actual old `takeClaim` takes it over.
2. Equal native IDs from different sources are considered already-yours. Actual old `releaseClaims` removes the other-source claim. This independently demonstrates why an additive runtime property cannot supply safe identity.
3. Actual old `findPrunable` nominates a clean merged/pushed tree with no recognized claim and no Claude session. A readable closed/pending claim **does protect** it. A new-shaped claim unreadable to the old codec is dropped and the tree is nominated again. No tree was removed by this test.

No supported native CLI/desktop resume or installer fence was established in this chunk. These passing hazard characterizations are evidence against activation, not a successful cutover. The combined cutover deliverable remains unchecked. No critical native capability failure is asserted and no design fork is parked merely because proof is still pending.

After three completed chunks, execute.md §8 requires a clean handoff. Next Phase 1 session starts with owned scratch lifecycle proof, then native cutover/installation evidence. Preserve outward gates and the current isolated-worktree/claim limitation.
