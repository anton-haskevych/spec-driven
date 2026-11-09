import { isAbsolute } from "node:path";
import { isRecord } from "../../core/frontmatter";
import type { AsyncRunner } from "../../core/run";
import { systemAsyncRunner } from "../../core/run";
import { parseJson } from "../../pr/gh-records";
import { type CapabilityOutcome, unverifiedManagedCapabilities } from "../capabilities";
import type { SessionSnapshot, SourceRef } from "../sessions";
import { scanLoaded } from "./scan";
import { connectReadOnly } from "./transport";

export interface ProbeRequest {
  source: SourceRef & { runtime: "codex" };
  mode: "local-daemon" | "no-daemon" | "remote" | "cloud" | "alternate-home";
  threadId?: string;
  cwd: string;
}

interface ProbeDeps {
  runner: AsyncRunner;
  connect: typeof connectReadOnly;
  observedAt: string;
}

export interface ProbeReport {
  discovery: CapabilityOutcome;
  managed: CapabilityOutcome[];
  snapshot: SessionSnapshot;
  pages: number;
}

export async function probeCodex(request: ProbeRequest, deps: ProbeDeps): Promise<ProbeReport> {
  const refusal = requestRefusal(request);
  if (refusal) return unavailable(request, refusal.state, refusal.reason);
  const version = await deps.runner.run(["codex", "app-server", "daemon", "version"], { timeoutMs: 3000 });
  const daemon = version.code === 0 ? parseJson(version.stdout) : undefined;
  if (!isRecord(daemon) || daemon.status !== "running" || typeof daemon.socketPath !== "string" || !isAbsolute(daemon.socketPath)) {
    return unavailable(request, "unavailable", "configured Codex daemon endpoint unavailable");
  }
  if (daemon.cliVersion !== "0.167.0" || daemon.appServerVersion !== "0.167.0") {
    return unavailable(request, "unsupported", "read-only probe validated only with CLI and app-server 0.167.0");
  }
  const connected = await deps.connect({ url: `ws+unix://${daemon.socketPath}`, timeoutMs: 3000 });
  if (!connected.ok) return unavailable(request, "unavailable", connected.reason);
  try {
    const scan = await scanLoaded(connected.value, request.source, deps.observedAt);
    if (scan.reason) return { ...unavailable(request, "unavailable", scan.reason), snapshot: scan.snapshot, pages: scan.pages };
    const own = scan.snapshot.sessions.find((s) => s.ref.id === request.threadId);
    if (!own || own.cwd !== request.cwd) {
      return { ...unavailable(request, "unverified", "current native thread ID/cwd not correlated"), snapshot: scan.snapshot, pages: scan.pages };
    }
    return {
      discovery: { source: request.source, capability: "session-discovery", state: "observed", reason: "0.167.0 configured-source enumeration and current thread ID/cwd observed; other environments unproved" },
      managed: unverifiedManagedCapabilities(request.source), snapshot: scan.snapshot, pages: scan.pages,
    };
  } finally { connected.value.close(); }
}

function requestRefusal(request: ProbeRequest): Pick<CapabilityOutcome, "state" | "reason"> | undefined {
  if (request.mode !== "local-daemon") return { state: "unsupported", reason: `${request.mode} coverage not proved` };
  if (!request.threadId || !request.source.key || !isAbsolute(request.cwd)) return { state: "unverified", reason: "native thread identity, source key and absolute cwd required" };
  return undefined;
}

function unavailable(request: ProbeRequest, state: CapabilityOutcome["state"], reason: string): ProbeReport {
  return {
    discovery: { source: request.source, capability: "session-discovery", state, reason },
    managed: unverifiedManagedCapabilities(request.source), pages: 0,
    snapshot: { sessions: [], coverage: [{ source: request.source, state: "unavailable", reason }] },
  };
}

if (import.meta.main) {
  const report = await probeCodex({
    source: { runtime: "codex", key: "configured-local-daemon" },
    mode: process.env.CODEX_HOME ? "alternate-home" : "local-daemon",
    threadId: process.env.CODEX_THREAD_ID,
    cwd: process.cwd(),
  }, { runner: systemAsyncRunner, connect: connectReadOnly, observedAt: new Date().toISOString() });
  console.log(JSON.stringify({ discovery: report.discovery, managed: report.managed, pages: report.pages, sessions: report.snapshot.sessions.length, coverage: report.snapshot.coverage }, null, 2));
  process.exitCode = report.discovery.state === "observed" ? 0 : 1;
}
