---
kind: gotcha
applies-to: [phase 1, phase 3, phase 6]
created: 2026-11-08T19:46:00-08:00
---

# Native interruption and subprocess cleanup are separate acknowledgements

On configured Codex CLI/app-server 0.167.0, a controlled foreground model exec lost all three marked processes on turn interruption. A yielded exec retained all three after the same owned turn reached interrupted. The supported `thread/backgroundTerminals/terminate` route, matched to the probe-owned thread/turn/unique command, returned terminated:true and removed the parent, child and grandchild. Both checks finished before the finite fixture TTL; no fallback PID kill was needed.

Worker shutdown must retain ownership/capacity until independently verified terminal/descendant cleanup, not merely interrupt acknowledgement or idle/interrupted thread status. Native terminal processId is a control handle, not OS PID; osPid was null. Experimental API opt-in is required for the probed terminal methods. Never apply a global terminal clean operation to a thread with unowned continuation.

An idle unsubscribed thread can unload; thread/read with includeTurns then failed until native resume. Rejoin the recorded owned thread before status/control and check the exact newest turn. Do not treat that read failure as completion or absence. A later unowned turn still forbids automatic control.

Real blocking user-input attention was observed with request ID zero and waitingOnUserInput; exact interruption resolved that request. Approval attention was not observed under configured policy never. These are dated single-source observations, not guarantees for all hosts or detached processes. Reproduce from the immutable owned-lifecycle research and executable fixtures before broadening support.
