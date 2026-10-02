import { firstLine } from "../core/git";
import { isRecord, stringField } from "../core/frontmatter";
import type { RunResult } from "../core/run";
import { parseJson } from "../pr/gh-records";
import { claimFromRecord, type Claim } from "./store";

export interface Holder {
  user: string;
  host: string;
}

export interface RemotePayload {
  claim: Claim;
  holder: Holder;
}

export type PushOutcome = { kind: "pushed" } | { kind: "refused" } | { kind: "offline"; reason: string };

export const CLAIM_REFS = "refs/spec-claims";

export function claimRef(spec: string, phase: string): string {
  return `${CLAIM_REFS}/${spec}/${phase}`;
}

export function remoteHolderName(remote: RemotePayload): string {
  const who = `${remote.holder.user}@${remote.holder.host}`;
  return remote.claim.sessionName ? `${who} (${remote.claim.sessionName})` : who;
}

export function encodeRemotePayload(claim: Claim, holder: Holder): string {
  return JSON.stringify({ ...claim, holder });
}

export function decodeRemotePayload(text: string): RemotePayload | undefined {
  const data = parseJson(text.trim());
  const claim = claimFromRecord(data);
  const holder = isRecord(data) && isRecord(data.holder) ? toHolder(data.holder) : undefined;
  return claim && holder ? { claim, holder } : undefined;
}

function toHolder(data: Record<string, unknown>): Holder | undefined {
  const user = stringField(data, "user");
  const host = stringField(data, "host");
  return user && host ? { user, host } : undefined;
}

// `git push --porcelain` prints one `<flag>\t<from>:<to>\t<summary>` line per ref it got an answer for;
// `!` is a refusal, whether from the client's lease check or the server's old-value check.
export function pushOutcome(result: RunResult, ref: string): PushOutcome {
  const line = result.stdout.split("\n").find((candidate) => candidate.split("\t")[1]?.endsWith(`:${ref}`));
  if (!line) return { kind: "offline", reason: firstLine(result.stderr) || `exit ${result.code}` };
  return line.startsWith("!") ? { kind: "refused" } : { kind: "pushed" };
}
