# Owned lifecycle observations — session 2

Agent-invoked controlled native writes, approved Phase 1 only. Bun 1.4.4, CLI/app-server 0.167.0, configured default local Unix daemon. No live install, hook, setting, credential or shared claim changed. Production composition remains Claude-only.

## Ownership and reproduction

Before creation, temporary `/tmp/codex-runtime-phase1-session2/ownership.json` recorded launch key `8499e782-fd4d-46b0-851b-df3e62057a56`, source, cwd, intent, bounds and cleanup. Exactly one native durable thread was created: `01a1be62-c39d-70f2-8613-35757e58e354`, cwd this assigned worktree. Native defaults were gpt-6.1-sol, high effort, approval never, dangerFullAccess; no model/permission override was used for creation or process turns.

Temporary controller drivers used `runtime/codex/probe-rpc.ts`, explicit initialize/initialized, a three-second connection/request deadline, bounded polling and a fresh exact newest-owned-turn check before interruption/archive. A missed creation response would have stopped rather than retried. The returned ID was saved before name/turn operations, and every returned turn ID was saved before control. No native thread was deleted.

To reproduce agentically: create a unique owned scratch directory/journal; use the preserved finite `tests/fixtures/codex-lifecycle/process-tree.ts` with its marker directory changed explicitly and hash the exact executed version; request the model to invoke it through normal exec_command; observe markers and `ps -p <exact PIDs> -o pid=,ppid=,lstart=,stat=,command=`. The fixture spawns a child and grandchild normally (no detach), uses a unique generation argument and exits after 120 seconds. Poll readiness at 250ms, bounded to 90 seconds. Record process start/argv/parentage before control. Never target processes found only by a global name search.

## Process variants

| Variant | Owned turn | Actual result |
|---|---|---|
| Initial disconnected launch | `01a1be62-d447-7832-a0ff-e7211cea3f9b` | Creating client disconnected at 03:38:30Z; rejoined exact inProgress turn and observed PIDs 18899/18900/18901. Interrupt acknowledged at 03:38:41Z, turn became interrupted while processes survived. |
| Foreground, continuous client | `01a1be64-dc24-7491-a693-8588bd45b801` | PIDs 20365/20369/20370 ready at 03:40:49Z. Interrupt reached terminal status and all three disappeared immediately, before TTL. Terminal list empty. |
| Yielded, disconnect/reconnect | `01a1be65-d4dd-7111-b2fb-0d947d39df7f` | PIDs 21009/21010/21011 ready at 03:41:51Z. One-second exec tool yield produced terminal processId `53098`; 500ms disconnected interval, fresh initialize and native resume preserved the exact inProgress turn and all three processes. Interrupt reached interrupted with processes still alive. Exact native terminal termination returned terminated:true at 03:41:52Z; all three disappeared before TTL, terminal list empty. |

The executable fixture contains the authoritative native processId/itemId and timestamps; terminal process IDs are not OS PIDs. Native `osPid` was null. Do not fabricate a PID or infer ownership solely from a command string; these probes independently observed a uniquely generated command's process lineage and fenced the native thread/turn.

## Intermediate errors and their meaning

- The first terminal-list attempt lacked `capabilities.experimentalApi:true` and returned -32600. The experimental opt-in was then explicitly added to the probe client, with a red/green handshake test. The read-only facade still omits it and refuses writes.
- An idle unsubscribed thread became unloaded. `thread/read(includeTurns:true)` then returned -32600 until native resume. Initial processes were absent by 03:39:49Z, earlier than their TTL, after the idle connection cycle. That confounded the first attempted termination; it is **not** successful terminal-control evidence. Retain its observation separately.
- The foreground controller expected a remaining terminal and reported `no exact owned terminal`, but its recorded after-interrupt `ps` was empty and native terminal list empty. That was an experimental expectation error, corrected for the yielded variant. It does not establish a native failure.
- No critical guarantee failed after using the supported exact terminal-control route. No fallback process runner, PID kill or design park was introduced. A client must not equate interrupt acknowledgement, idle or interrupted status with subprocess cleanup.

## Real attention

Owned turn `01a1be66-aacf-7473-b81a-a18535ba718c`: selected native plan mode using the already observed model/effort and built-in plan instructions, with unchanged permissions. Requested the actual request_user_input tool, not a textual question. At 03:42:44Z the server emitted blocking `item/tool/requestUserInput`, request ID `0`, the exact turn ID, and active flag `waitingOnUserInput`. The controller independently read that active/inProgress state. Exact interruption produced interrupted/idle and `serverRequest/resolved {requestId:0}`. No answer or human approval was fabricated.

Approval attention remains unverified because native configured policy is never. Approval-enabled environments, alternate homes/daemons, remote hosts, daemon restart, detached/self-daemonizing children and real crew completion are not established. Native request-ID zero and notifications are covered by the reusable transport tests; wire request frames never resolve an unrelated same-ID outgoing request.

## Cleanup and retained evidence

At 03:43:15Z independent `ps` found all nine recorded PIDs absent. The controller resumed the owned thread, verified its newest turn was the recorded interrupted attention turn, checked all turns were inactive and then called thread/archive. Native archived-list discovery filtered to this cwd and unique title key independently found exactly this archived thread at 03:45:42Z. History retained; no delete. Temporary fixture scripts/journal are not a production state store.

`tests/fixtures/codex-lifecycle/observed.json` retains sanitized observations, lineage, acknowledgements and terminal results. Contract tests assert the distinction between foreground/yielded cleanup, real attention decoding and unchanged managed-feature refusals. The finite fixture source is frozen with a hash. Ordinary tests neither access native home/daemon nor launch a worker.

## Scope conclusion

The controlled lifecycle proof has operational evidence for this configured source/version and never-approval profile. General background enablement remains unverified and disabled pending writer cutover, native bootstrap/loaded-release/trust and later-phase integration. Method discovery alone still enables nothing. Official reference: [OpenAI app-server](https://learn.chatgpt.com/docs/app-server).
