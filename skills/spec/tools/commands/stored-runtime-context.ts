import { readClaimDocuments } from "../claims/read-documents";
import { claimsDir } from "../claims/store";
import { parseContextRequest } from "../context/request";
import { gitAt } from "../core/git";
import type { Result } from "../core/result";
import { findSpecs } from "../core/spec-folders";
import type { ClaudeSource } from "../runtime/sessions";
import { canonicalPath, loadWorkspaces } from "../workspaces/list";
import { ownerOf } from "../workspaces/owner";
import { runtimeContextPack, type RuntimeContextClaims, type RuntimeContextDeps } from "./runtime-context";

export interface StoredRuntimeContextDeps extends Omit<RuntimeContextDeps, "readClaims"> {
  legacySource?: ClaudeSource;
  checkClaims?(claims: RuntimeContextClaims): Result<true>;
}

export function createStoredRuntimeContextCommand(deps: StoredRuntimeContextDeps) {
  return {
    async run(projectDir: string, args: readonly string[]): Promise<string> {
      const request = parseContextRequest(args, (name) => findSpecs(projectDir, name).length > 0);
      const result = await runtimeContextPack(projectDir, request, {
        ...deps, readClaims: (dir) => readContextClaims(dir, deps),
      });
      return result.ok ? result.value : `context: ${result.reason}`;
    },
  };
}

function readContextClaims(projectDir: string, deps: StoredRuntimeContextDeps): Result<RuntimeContextClaims> {
  const git = gitAt(projectDir, deps.runner);
  const dir = claimsDir(git);
  if (!dir.ok) return dir;
  const documents = readClaimDocuments(dir.value, deps.legacySource);
  if (!documents.ok) return documents;
  const workspaces = loadWorkspaces(git);
  if (!workspaces.ok) return workspaces;
  const here = ownerOf(canonicalPath(projectDir), workspaces.value.map(({ path }) => path));
  if (!here) return { ok: false, reason: "context workspace is not registered with this repository" };
  const claims = documents.value.map(({ claim }) => claim);
  const value: RuntimeContextClaims = {
    claims, here: claims.filter((claim) => claim.workspace === here).map(({ spec, phase }) => ({ spec, phase })),
  };
  const checked = deps.checkClaims?.(value);
  return checked && !checked.ok ? checked : { ok: true, value };
}
