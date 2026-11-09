---
kind: decision
applies-to: [phase 1, phase 4, phase 5, phase 6]
created: 2026-11-08T20:20:14-08:00
---

# Keep existing sessions on their loaded version; new sessions use the updated install

## User decision

On 2026-11-08 Anton clarified the desired update behavior: “if old sessions are running and we spawn a new one will it pick up the new version of the plugin automatically from the start?” After the installed-versus-fetched distinction was explained, he confirmed: “okay, well, then this is perfect. All good. This is how claude code works, doesn't it?” He then requested this spec update and handoff.

The requirement is Claude-style version coexistence:

- Existing sessions keep the plugin version they loaded; no forced mid-session reload or rerun.
- Once a newer release is installed, subsequent fresh sessions use that newer installed release even while older sessions remain open, subject to native trust and compatibility requirements.
- Checking/fetching/installing a release and creating a session are separate operations. A fresh session does not itself establish that the newest published release was fetched.
- Do not require every older session to finish as the normal update policy. The previously recommended universal staged/quiescent cutover was not adopted.

## Evidence and remaining proof

[Claude Code's official update documentation](https://code.claude.com/docs/en/discover-plugins#keep-plugins-updated) describes automatic marketplace/plugin refresh when enabled, existing sessions retaining their loaded versions, explicit reload, and subsequent sessions selecting the updated version. [Codex's official plugin documentation](https://learn.chatgpt.com/docs/plugins) says installed bundled skills become available in fresh chats/CLI sessions.

Session 2 observed fresh candidate catalog/hooks and old loaded hook metadata, plus eviction of the old cache in an isolated 0.167.0 install. It did **not** execute an active model turn across that update. These facts do not prove either harmless coexistence or failure of running old-session scripts.

The next proof must distinguish: installed version, fresh-session loaded version, old-session loaded instructions/hooks, and continued old-session execution/resource access after the update. Preserve the cache-eviction observation and test the actual old-session dependency before selecting retention machinery. Do not tick remaining Phase 1 proofs or change live installs on the strength of this product decision.

## Alternatives and boundaries

Rejected default: wait until all old managed sessions end before installing every update. It blocks the requested behavior and was a conservative proposal, not a native requirement.

Also rejected: treat cache eviction as automatically safe, force a reload into existing sessions, fake loaded-version attestation, patch caches, introduce a second activation authority, or bypass hook trust. If a controlled real proof shows old-session resources actually break, report that concrete remaining design fork with a minimal proposed solution; do not silently return to the blanket wait policy.

Plugin release versions and writer-contract versions are different. Compatible plugin releases may coexist. The initial 2.51.0 Claude-only reader versus Codex ownership transition can still require its separate, proved writer-contract fence. This decision does not waive that safety requirement, authorize Phase 2, or approve live installation/publication.
