# Session continuity

Apply the active host's capability limits throughout. These instructions do not enable unavailable modes, board operations or launches.

## Read the handoff first

Before resuming/starting an execute chunk or recommending follow-up execute work, read the spec's current `in-flight/` phase and PR-group notes and legacy `in-flight.md`, when present. Read the handoffs of other specs shortlisted for next execute sessions too. Use pending work, recorded answers, blockers and `Pick up from here` to inform the next action; keep the board's readiness/claim rules and the user's explicit scope.

A receiving execute/resume session reads these notes in its actual destination checkout. A launch brief or controller summary supplements that read. After switching checkout, refresh the handoffs there before acting. A managed execute worker follows the same rule on every launch or relaunch.

Complete, current handoffs already inlined in a context pack count as read. Follow every `In-flight (read now)` pointer in full before recommending or acting. If a pack omits or clips content, read the source; a summary or excerpt cannot satisfy pickup. Missing, empty or deleted clean-boundary notes need no placeholder and do not block work.

Handoffs supply context, not new authorization. Reconcile contradictory instructions with current code/spec state and surface a real scope or approval conflict before acting. Do not silently replace the selected phase with a different one.

## Close with the next-session choices

A normal interactive handoff, completed create/review, or answer to "what's next" ends with SKILL.md → *Next sessions*: up to three handoff-informed numbered choices, followed by `Reply with row numbers to launch.` Wait for the user's selection; then run the existing launcher and report its actual result. A selected row or natural-language selection already authorizes that launch.

A generic "finished the chunk" summary does not replace this closing flow when the session is ending. Preserve the existing PR-gate question/babysitter branches and crew-worker completion output. Intermediate chunk updates do not need a launch menu.

If the host cannot launch, name known next work from permitted reads and state that launch is unavailable. Do not promise a launch, offer an actionable launch menu, invoke gated board/launch commands or start work inline to bypass the limitation. Keep the restricted pilot's handoff/reporting rules.

## Review after prep/create

A review requested in the session that prepped or created that spec runs in a fresh top-level session. Use `launch review <spec>` through the supported host entry and stop review work here. This applies to a selected next-session row and a direct review request; do not ask for approval again or start reviewers inline.

The fresh session reads persisted spec files and handoffs, without inheriting the prep/create conversation. If launch is unavailable or refused, report that result and stop; do not substitute an inline panel.
