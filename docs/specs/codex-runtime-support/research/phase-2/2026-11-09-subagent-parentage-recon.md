# Subagent parentage recon

One wave of two read-only explorers confirmed the same narrow seam. Native read-only inspection of the two actual failed recon children returned parentThreadId 01a1c001-6425-7cb2-9a00-66afcc6dbaa9; retained at ~/Downloads/codex-runtime-support-subagent-fix/native-parentage.json. Generated 0.167.0 ThreadReadResponse defines this field as present only for subagents. forkedFromId is separate and is not delegation authority. Official protocol: https://learn.chatgpt.com/docs/app-server.

- runtime/codex/entry.ts:60 introduced the blanket refusal in 61a7cb5. It excludes only exact self.
- runtime/codex/decode.ts:21-34 currently discards top-level parentThreadId. Preserve an optional parent SessionRef qualified by the decoder's existing source.
- runtime/sessions.ts:22 adds that optional plain value; existing Claude adapters remain unchanged.
- runtime/codex/scan.ts:30-34 already reads all loaded metadata in one complete snapshot. No new RPC or discovery pass is required.
- Add a pure same-source descendant predicate beside runtime/identity.ts. Follow observed parent chains to the initiating session; terminate cycles; missing, foreign-source or unrelated ancestry grants no exemption. Do not authorize ancestors/siblings or infer from names/forks.
- Keep exhaustive graph tests separate from codex-entry.test.ts (147 lines) and one connected raw-parent decode/entry regression in that existing fixture. Decoder tests and existing probe fixture cover dropped/malformed metadata.

Scope: fix parent coordinator's normal recon while its children remain loaded. No shared claim activation, new ownership framework, code relocation or weakening of unrelated-occupant/stored-claim/coverage checks. Pilot-only cwd fix remains separately retained; do not silently cherry-pick it. After source checks, native acceptance must run canonical recon with real children still loaded and the installed entry's recall/doctor; retain independent-session refusal.
