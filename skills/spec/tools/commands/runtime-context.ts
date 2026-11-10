import type { Env } from "../core/env";
import type { Result } from "../core/result";
import { heldPhasesFromSnapshot, type SessionPhaseClaim } from "../claims/snapshot-held";
import type { ContextRequest } from "../context/request";
import type { ClaimHere } from "../context/claims-here";
import { readSessionSnapshot, type SessionReader } from "../runtime/read-sessions";
import { resolveIdentity } from "../runtime/resolve-identity";
import type { SessionRef } from "../runtime/sessions";
import { contextPack, type ContextDeps } from "./context";

export interface RuntimeContextClaims {
  claims: readonly SessionPhaseClaim[];
  here: ClaimHere[];
}

export interface RuntimeContextDeps extends Pick<ContextDeps, "runner" | "workflow"> {
  env: Env;
  binding?: SessionRef;
  readers: readonly SessionReader[];
  readClaims(projectDir: string): Result<RuntimeContextClaims> | Promise<Result<RuntimeContextClaims>>;
  now(): string;
}

export async function runtimeContextPack(projectDir: string, request: ContextRequest, deps: RuntimeContextDeps): Promise<Result<string>> {
  const own = resolveIdentity({ env: deps.env, sources: deps.readers.map((reader) => reader.source), ...(deps.binding ? { binding: deps.binding } : {}) });
  if (!own.ok) return own;
  const claims = await deps.readClaims(projectDir);
  if (!claims.ok) return claims;
  const snapshot = await readSessionSnapshot(deps.readers, deps.now());
  if (!snapshot.ok) return snapshot;
  const held = heldPhasesFromSnapshot(claims.value.claims, { own: own.value, snapshot: snapshot.value });
  const pack = await contextPack(projectDir, request, {
    runner: deps.runner, workflow: deps.workflow, readClaimsHere: () => claims.value.here, readHeld: () => held,
  });
  return { ok: true, value: pack };
}
