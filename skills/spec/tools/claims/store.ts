import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isRecord, stringField } from "../core/frontmatter";
import type { Git } from "../core/git";
import type { Result } from "../core/result";
import { parseJson } from "../pr/gh-records";
import { createExclusive, displaceIfUnchanged, readIfPresent, sweepLeftovers } from "./atomic-file";

export interface Claim {
  spec: string;
  phase: string;
  sessionId: string;
  sessionName?: string;
  workspace: string;
  branch?: string;
  claimedAt: string;
}

export type TakeOutcome =
  | { kind: "taken" }
  | { kind: "already-yours" }
  | { kind: "took-over"; from: Claim }
  | { kind: "held"; by: Claim | "unreadable" };

export type IsStale = (existing: Claim) => boolean;

const CLAIM_FILE = /\.json$/;
const MAX_ATTEMPTS = 5;

// Under the common dir, so every worktree of a clone sees the same claims and none are committed.
export function claimsDir(git: Git): Result<string> {
  const commonDir = git.out(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  return commonDir.ok ? { ok: true, value: join(commonDir.value, "spec-board", "claims") } : commonDir;
}

export function claimFile(dir: string, spec: string, phase: string): string {
  return join(dir, `${spec}#${phase}.json`);
}

export function takeClaim(dir: string, claim: Claim, isStale: IsStale): TakeOutcome {
  mkdirSync(dir, { recursive: true });
  const file = claimFile(dir, claim.spec, claim.phase);
  const text = JSON.stringify(claim);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (createExclusive(file, text, claim.sessionId)) return { kind: "taken" };
    const existingText = readIfPresent(file);
    if (existingText === undefined) continue;
    const existing = parseClaim(existingText);
    if (!existing) return { kind: "held", by: "unreadable" };
    if (existing.sessionId === claim.sessionId) return { kind: "already-yours" };
    if (!isStale(existing)) return { kind: "held", by: existing };
    if (displaceIfUnchanged(file, existingText, claim.sessionId) && createExclusive(file, text, claim.sessionId)) {
      return { kind: "took-over", from: existing };
    }
  }
  const holder = parseClaim(readIfPresent(file) ?? "");
  return { kind: "held", by: holder ?? "unreadable" };
}

export function releaseClaims(dir: string, sessionId: string, spec: string, phase?: string): Claim[] {
  return removeClaims(dir, sessionId, (claim) => claim.sessionId === sessionId && claim.spec === spec && (phase === undefined || claim.phase === phase));
}

// `removable` must never be true for a live claim; the caller decides from claimStatus.
export function pruneClaims(dir: string, sessionId: string, removable: (claim: Claim) => boolean, now: Date): Claim[] {
  sweepLeftovers(dir, now);
  return removeClaims(dir, sessionId, removable);
}

function removeClaims(dir: string, sessionId: string, matches: (claim: Claim) => boolean): Claim[] {
  const removed: Claim[] = [];
  for (const { name, text, claim } of readClaimFiles(dir)) {
    if (claim && matches(claim) && displaceIfUnchanged(join(dir, name), text, sessionId)) removed.push(claim);
  }
  return removed;
}

export function loadClaims(dir: string): { claims: Claim[]; unreadable: string[] } {
  const files = readClaimFiles(dir);
  return {
    claims: files.flatMap((file) => (file.claim ? [file.claim] : [])),
    unreadable: files.filter((file) => !file.claim).map((file) => file.name),
  };
}

function readClaimFiles(dir: string): { name: string; text: string; claim?: Claim }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => CLAIM_FILE.test(name))
    .sort()
    .flatMap((name) => {
      const text = readIfPresent(join(dir, name));
      if (text === undefined) return [];
      const claim = parseClaim(text);
      return [claim ? { name, text, claim } : { name, text }];
    });
}

function parseClaim(text: string): Claim | undefined {
  return claimFromRecord(parseJson(text));
}

export function claimFromRecord(data: unknown): Claim | undefined {
  if (!isRecord(data)) return undefined;
  const [spec, phase, sessionId, workspace, claimedAt] = ["spec", "phase", "sessionId", "workspace", "claimedAt"].map((key) => stringField(data, key));
  if (!spec || !phase || !sessionId || !workspace || !claimedAt) return undefined;
  const sessionName = stringField(data, "sessionName");
  const branch = stringField(data, "branch");
  return { spec, phase, sessionId, ...(sessionName ? { sessionName } : {}), workspace, ...(branch ? { branch } : {}), claimedAt };
}
