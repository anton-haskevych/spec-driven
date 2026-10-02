import type { Git } from "../core/git";
import type { Result } from "../core/result";
import type { RunOptions } from "../core/run";
import { CLAIM_REFS, claimRef, decodeRemotePayload, encodeRemotePayload, pushOutcome, type Holder, type PushOutcome, type RemotePayload } from "./remote-payload";

export interface RemoteClaim extends RemotePayload {
  sha: string;
}

export type Lease = { kind: "absent" } | { kind: "at"; sha: string };

export type PushedClaim = { kind: "pushed"; sha: string } | Exclude<PushOutcome, { kind: "pushed" }>;

export const REMOTE_TIMEOUT_MS = 10_000;
const FETCHED_REFS = "refs/spec-claims-remote";
const UNKNOWN_USER = "unknown";
const LS_REMOTE_NO_MATCH = 2;

const NETWORK: Omit<RunOptions, "cwd"> = { timeoutMs: REMOTE_TIMEOUT_MS, env: { GIT_TERMINAL_PROMPT: "0" } };

export function readHolder(git: Git, host: string): Holder {
  const ident = git.out(["var", "GIT_AUTHOR_IDENT"]);
  const user = ident.ok ? ident.value.split(" <")[0]?.trim() : undefined;
  return { user: user || UNKNOWN_USER, host };
}

export function pushClaim(git: Git, payload: RemotePayload, lease: Lease): PushedClaim {
  const commit = payloadCommit(git, encodeRemotePayload(payload.claim, payload.holder));
  if (!commit.ok) return { kind: "offline", reason: commit.reason };
  const ref = claimRef(payload.claim.spec, payload.claim.phase);
  const outcome = push(git, ref, lease.kind === "absent" ? "" : lease.sha, `${commit.value}:${ref}`);
  return outcome.kind === "pushed" ? { kind: "pushed", sha: commit.value } : outcome;
}

export function deleteClaim(git: Git, spec: string, phase: string, ownSha: string): PushOutcome {
  const ref = claimRef(spec, phase);
  return push(git, ref, ownSha, `:${ref}`);
}

export function fetchClaims(git: Git): Result<RemoteClaim[]> {
  const fetched = git.out(["fetch", "-q", "--prune", "origin", `+${CLAIM_REFS}/*:${FETCHED_REFS}/*`], NETWORK);
  if (!fetched.ok) return fetched;
  const listed = git.out(["for-each-ref", "--format=%(objectname)%00%(contents)%00", FETCHED_REFS]);
  if (!listed.ok) return listed;
  return { ok: true, value: toRemoteClaims(listed.value) };
}

export function branchOnOrigin(git: Git, branch: string): boolean | undefined {
  const listed = git.run(["ls-remote", "--exit-code", "--heads", "origin", branch], NETWORK);
  if (listed.code === 0) return true;
  return listed.code === LS_REMOTE_NO_MATCH ? false : undefined;
}

export function remoteClaimOf(claims: readonly RemoteClaim[], spec: string, phase: string): RemoteClaim | undefined {
  return claims.find((remote) => remote.claim.spec === spec && remote.claim.phase === phase);
}

// A claim must never wait on a credential prompt or run the repo's pre-push hooks (some run the test suite).
function push(git: Git, ref: string, expected: string, refspec: string): PushOutcome {
  const result = git.run(["push", "--porcelain", "--no-verify", `--force-with-lease=${ref}:${expected}`, "origin", refspec], NETWORK);
  return pushOutcome(result, ref);
}

function payloadCommit(git: Git, message: string): Result<string> {
  const emptyTree = git.out(["mktree"], { stdin: "" });
  return emptyTree.ok ? git.out(["commit-tree", emptyTree.value, "-m", message]) : emptyTree;
}

function toRemoteClaims(listing: string): RemoteClaim[] {
  const fields = listing.split("\0");
  const claims: RemoteClaim[] = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    const sha = fields[index]?.trim() ?? "";
    const payload = decodeRemotePayload(fields[index + 1] ?? "");
    if (sha && payload) claims.push({ ...payload, sha });
  }
  return claims;
}
