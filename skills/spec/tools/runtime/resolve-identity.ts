import type { Env } from "../core/env";
import type { Result } from "../core/result";
import { sameSource, sourceKey } from "./identity";
import type { SessionRef, SourceRef } from "./sessions";

interface IdentityRequest {
  env: Env;
  sources: readonly SourceRef[];
  binding?: SessionRef;
}

export function resolveIdentity(request: IdentityRequest): Result<SessionRef> {
  const { sources, binding } = request;
  if (sources.some((source) => !validSource(source)) || new Set(sources.map(sourceKey)).size !== sources.length) {
    return { ok: false, reason: "invalid or duplicate execution source configuration" };
  }
  const evidence = environmentIdentity(request.env);
  if (!evidence.ok) return evidence;
  if (binding) {
    if (!validSource(binding.source) || !validId(binding.id) || !sources.some((source) => sameSource(source, binding.source))) {
      return { ok: false, reason: "host identity requires a configured source and native ID" };
    }
    if (evidence.value && (evidence.value.runtime !== binding.source.runtime || evidence.value.id !== binding.id)) {
      return { ok: false, reason: "host identity conflicts with runtime environment" };
    }
    return { ok: true, value: binding };
  }
  if (!evidence.value) return { ok: false, reason: "initiating runtime identity unavailable" };
  const matching = sources.filter((source) => source.runtime === evidence.value?.runtime);
  const source = matching.length === 1 ? matching[0] : undefined;
  return source
    ? { ok: true, value: { source, id: evidence.value.id } }
    : { ok: false, reason: "runtime identity requires one configured source or an explicit host binding" };
}

function environmentIdentity(env: Env): Result<{ runtime: SourceRef["runtime"]; id: string } | undefined> {
  const claude = env.CLAUDE_CODE_SESSION_ID || undefined;
  const codex = env.CODEX_THREAD_ID || undefined;
  if (claude && codex) return { ok: false, reason: "conflicting Claude and Codex runtime identity evidence" };
  const id = claude || codex;
  if (id && !validId(id)) return { ok: false, reason: "invalid native runtime identity" };
  return { ok: true, value: id ? { runtime: claude ? "claude" : "codex", id } : undefined };
}

function validSource(source: SourceRef): boolean {
  return (source.runtime === "claude" || source.runtime === "codex") && validId(source.key);
}

function validId(value: string): boolean {
  return value.length > 0 && value.trim() === value;
}
