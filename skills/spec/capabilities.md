# Workflow capabilities

The entry declares the workflow profile before a mode runs. Existing Claude entry has the full managed profile and keeps its current behavior. A missing or failed native bootstrap is a refusal, never permission to use Claude defaults.

## Local pilot

`Workflow: local-pilot` permits only explicitly named spec/phase `resume`, `execute`, `update`, `handoff` and `status`. Native entry must verify its candidate and source before declaring this profile. The shared dispatcher enforces concrete command/sub-action limits in `tools/runtime/workflow-capabilities.ts`.

| Operation | Local-pilot result |
|---|---|
| Context, implementation/spec edits, focused checks | Allowed in the verified exclusive separate clone |
| Recall, doctor, graph, named readiness, gates/playbooks/settings | Existing local tools; execute gate text only within this profile |
| Exact-phase tick/park/unpark/note, ledger/in-flight edits, local commits | Allowed; validate spec edits explicitly while native hooks are pending |
| Claims, takeover/release, remote mirrors, board/list allocation | Unavailable; no ownership acquired or released |
| Placement, worktree cleanup/prune | Unavailable; remain in the verified checkout |
| Push, PR/deployment/publication, next-session/worker launches, crew | Unavailable; report local work and leave these pending |
| Other interactive modes, automatic native hooks/persona binding | Pending their feature acceptance; do not infer support from packaged files |

These limits govern automatic mode steps and tool-generated advice too. Do not retry a refusal with raw `spec.ts`, shell Git publication, a copied command, Claude factories or manual ID aliases. Local Git inspection/commits and explicitly authorized implementation/test tools remain available. The pilot is a workflow boundary, not an OS sandbox against arbitrary manual commands or unrelated sessions.

Canonical recon can spawn native subagents within the initiating session's work. Verified descendants do not count as independent occupants: the adapter retains native `parentThreadId` as a qualified parent reference and follows the observed chain. This grants no new claim, mode, publication or independent-session authority. Unrelated roots, another root's children, forks without native parentage and unverified ancestry still receive the existing occupation refusal. Full reviewer/persona binding remains separately required.

In execute, skip placement, claims, PR lookup/push and later per-commit pushes. Keep recon/preflight, TDD, validation, local commits and progress. A blocked phase parks locally; do not publish its note. Before edits, run existing `lessons recall`; after spec edits use existing `issuesForWrittenFile` and doctor, correct errors before continuing. No automatic native hook is claimed.

In update, take the entry's explicit phase instead of querying claims. In handoff, retain reflection, ledger/in-flight, doctor and local commit. Skip publication, claim release, prune, PR/babysitter decisions and the board/launch-based Next sessions block. Report **Local restricted handoff complete** with the commit and pending state, plus **Ownership, remote publication, cleanup and next-session launch unavailable**. This is not full managed handoff acceptance.

Resume preserves Stage A's halt and Stage B's selected context. A fresh native session must bind this candidate and explicit checkout/spec/phase again. Full workflow parity remains required by `docs/specs/codex-runtime-support/workflow-parity.md`; the pilot changes delivery order only.
