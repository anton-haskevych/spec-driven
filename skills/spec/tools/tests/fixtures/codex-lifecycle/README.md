# Native lifecycle observations

`observed.json` contains sanitized actual configured-source observations on CLI/app-server 0.167.0 and Bun 1.4.4. It is not a simulated worker or a promise for other sources/versions.

`process-tree.ts` is the exact finite fixture the model invoked, preserved with SHA-256. It writes only into the explicitly owned scratch directory and exits in 120 seconds. Ordinary tests **never execute it**. The temporary controller drivers used the shared `connectProbeRpc`, recorded ownership before native writes and checked the newest exact owned turn before interruption/archive. The drivers are experiments, not production launch/control implementations.

- `foreground`: interrupt while the model's command was awaiting its first 30-second tool response; all three processes disappeared independently of the TTL.
- `yielded`: 1-second tool yield, then client disconnect/reconnect and native resume; turn and processes survived. Interrupt acknowledged the turn while all three processes remained. Native `thread/backgroundTerminals/terminate` on the exact recorded terminal returned `terminated: true`; all three then disappeared and the terminal list was empty.
- `attention`: actual blocking `item/tool/requestUserInput` (request ID zero), `waitingOnUserInput`, exact turn interruption and matching `serverRequest/resolved`. The adapter test adds fixed synthetic metadata around that actual status; it does not claim that fixed timestamp/cwd came from the live thread.
- All nine PIDs from three finite invocations were absent before archive. The first exploratory invocation is represented in cleanup only: it exposed the idle-unload/read limitation and did not establish terminal termination. The two controlled variants above establish the distinct cleanup behavior.

Model, effort and permissions came from native defaults. Plan-mode attention explicitly reused the observed model/effort without changing global configuration. Approval attention was not induced: configured approval policy is `never`. Managed capabilities remain unverified; no production adapter is enabled by these fixtures.

Full procedure, limits, IDs and intermediate experiment errors: `docs/specs/codex-runtime-support/research/phase-1/2026-11-08-owned-lifecycle-observations.md`.
