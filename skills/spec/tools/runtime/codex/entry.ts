import { existsSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";
import { createStoredRuntimeContextCommand } from "../../commands/stored-runtime-context";
import { isPhaseId, normalizePhaseHint, type ContextRequest } from "../../context/request";
import type { Env } from "../../core/env";
import { readTextIfExists } from "../../core/files";
import type { Result } from "../../core/result";
import type { Runner } from "../../core/run";
import { findSpecs } from "../../core/spec-folders";
import { readPlansAt } from "../../plan/read-plans";
import { run } from "../../spec";
import { sameSession } from "../identity";
import { isSessionDescendant } from "../is-session-descendant";
import { verifyPilotWorkspace } from "../pilot-workspace";
import { resolveIdentity } from "../resolve-identity";
import type { CodexSource, RuntimeSession, SessionRef } from "../sessions";
import { pilotCommandRefusal, pilotModeRefusal, type LocalPilot } from "../workflow-capabilities";
import type { CandidateAssets } from "./candidate";
import type { ProbeReport, ProbeRequest } from "./probe";

const SOURCE: CodexSource = { runtime: "codex", key: "configured-local-daemon" };

export interface CodexEntryRequest {
  request: ContextRequest;
  cwd: string;
  legacyProjectDir: string;
  revision: string;
  command?: readonly string[];
}

export interface CodexEntryDeps {
  env: Env;
  assets: CandidateAssets;
  runner: Runner;
  observe(request: ProbeRequest): Promise<ProbeReport>;
  now(): string;
}

export async function runCodexEntry(request: CodexEntryRequest, deps: CodexEntryDeps): Promise<Result<string>> {
  const target = pilotTarget(request.request);
  if (!target.ok) return target;
  const packMode = ["handoff", "update"].includes(request.request.mode) ? "resume" : request.request.mode;
  const argv = request.command ?? ["context", packMode, target.value.spec, target.value.phase];
  const refusal = pilotCommandRefusal(argv, target.value);
  if (refusal) return { ok: false, reason: refusal };
  if (request.revision !== deps.assets.revision) return { ok: false, reason: "candidate revision differs from the expected asset content; stop and identify the executed candidate" };
  const own = resolveIdentity({ env: deps.env, sources: [SOURCE] });
  if (!own.ok) return own;
  if (own.value.source.runtime !== "codex") return { ok: false, reason: "native entry requires initiating Codex identity" };
  if (deps.env.CODEX_HOME) return { ok: false, reason: "alternate-home native entry is unsupported" };
  const workspace = verifyPilotWorkspace(request.cwd, request.legacyProjectDir, deps.runner);
  if (!workspace.ok) return workspace;
  const valid = existingTarget(workspace.value, target.value, deps);
  if (!valid.ok) return valid;
  const native = await deps.observe({ source: SOURCE, mode: "local-daemon", threadId: own.value.id, cwd: workspace.value });
  if (native.discovery.state !== "observed") return { ok: false, reason: native.discovery.reason };
  const observed = native.snapshot.sessions.find((session) => sameSession(session.ref, own.value));
  if (observed?.cwd !== workspace.value || native.snapshot.coverage.length !== 1 || native.snapshot.coverage[0]?.state !== "complete") {
    return { ok: false, reason: "initiating native ID/cwd and complete source coverage required" };
  }
  const exclusive = verifyExclusivePilot(workspace.value, native.snapshot.sessions, own.value);
  if (!exclusive.ok) return exclusive;
  return dispatchPilot({ request, argv, target: target.value, own: own.value, native }, deps);
}

function verifyExclusivePilot(workspace: string, sessions: readonly RuntimeSession[], own: SessionRef): Result<true> {
  const unavailable = { ok: false, reason: "native session cwd evidence unavailable; exclusive pilot use cannot be verified" } as const;
  try {
    for (const session of sessions) {
      if (sameSession(session.ref, own) || isSessionDescendant(session, own, sessions)) continue;
      if (!isAbsolute(session.cwd)) return unavailable;
      const local = relative(workspace, realpathSync(session.cwd));
      if (local !== ".." && !local.startsWith(`..${sep}`) && !isAbsolute(local)) {
        return { ok: false, reason: "another native session occupies the exclusive pilot checkout" };
      }
    }
    return { ok: true, value: true };
  } catch {
    return unavailable;
  }
}

function pilotTarget(request: ContextRequest): Result<LocalPilot> {
  const mode = pilotModeRefusal(request.mode);
  if (mode) return { ok: false, reason: mode };
  if (!request.name || !request.hint || !isPhaseId(request.hint)) return { ok: false, reason: "local-pilot requires its explicit spec and exact phase; inference is disabled" };
  return { ok: true, value: { kind: "local-pilot", spec: request.name, phase: normalizePhaseHint(request.hint) } };
}

function existingTarget(cwd: string, target: LocalPilot, deps: CodexEntryDeps): Result<true> {
  const specs = findSpecs(cwd, target.spec);
  const spec = specs.length === 1 ? specs[0] : undefined;
  if (!spec) return { ok: false, reason: "local-pilot requires one existing named spec" };
  const state = readPlansAt(cwd, deps, new Date(deps.now())).state(spec);
  if (!state.hasProgress || !existsSync(join(spec.dir, "ledger/INDEX.md")) || !state.phases.some((phase) => phase.id === target.phase)) {
    return { ok: false, reason: "local-pilot requires current spec layout and an existing exact phase; no fallback phase was selected" };
  }
  return { ok: true, value: true };
}

interface BoundPilot {
  request: CodexEntryRequest;
  argv: readonly string[];
  target: LocalPilot;
  own: SessionRef;
  native: ProbeReport;
}

async function dispatchPilot(bound: BoundPilot, deps: CodexEntryDeps): Promise<Result<string>> {
  const { request, target, own } = bound;
  const context = createStoredRuntimeContextCommand({
    env: deps.env, binding: own, runner: deps.runner, now: deps.now, workflow: target,
    readers: [{ source: SOURCE, read: async () => bound.native.snapshot }],
    checkClaims: ({ claims }) => claims.length
      ? { ok: false, reason: "local-pilot requires no stored claims; shared ownership is unavailable, leave existing state untouched" }
      : { ok: true, value: true },
  });
  if (bound.argv[0] !== "context") {
    const checked = await context.run(request.cwd, ["resume", target.spec, target.phase]);
    if (!checked.startsWith("<spec-pack ")) return { ok: false, reason: checked || "native context unavailable; entry did not complete" };
  }
  const output = await run(bound.argv, request.cwd, { workflow: target, context });
  if (bound.argv[0] === "context" && !output.startsWith("<spec-pack ")) return { ok: false, reason: output || "native context unavailable; entry did not complete" };
  const taxonomy = bound.argv[0] === "context" ? [
    "## Taxonomy", readTextIfExists(join(deps.assets.root, "skills/spec/taxonomy.md")) ?? "",
    readTextIfExists(join(request.cwd, ".claude/taxonomy.md")) ?? "No project taxonomy found — use free-form area/domain values.",
  ].join("\n") : "";
  return { ok: true, value: [
    "Workflow: local-pilot", `Candidate: ${deps.assets.root} · version ${deps.assets.version} · ${deps.assets.revision}`,
    `Initiating: ${own.source.runtime}/${own.source.key}/${own.id} · cwd ${request.cwd}`,
    `Request: ${request.request.mode} ${target.spec} ${target.phase}`,
    "Ownership: not acquired; remote publication, cleanup and launches unavailable. Follow skills/spec/capabilities.md.",
    taxonomy, output,
  ].filter(Boolean).join("\n\n") };
}
