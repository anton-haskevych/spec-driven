import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Result } from "../core/result";
import type { ClaudeSource } from "../runtime/sessions";
import { errorCode, readIfPresent } from "./atomic-file";
import { decodeClaimDocument, type ClaimDocument } from "./document";

export function readClaimDocuments(dir: string, legacySource?: ClaudeSource): Result<readonly ClaimDocument[]> {
  const names = claimNames(dir);
  if (!names.ok) return names;
  const documents: ClaimDocument[] = [];
  for (const name of names.value) {
    const document = readDocument(join(dir, name), name, legacySource);
    if (!document.ok) return document;
    if (document.value) documents.push(document.value);
  }
  return { ok: true, value: documents };
}

function claimNames(dir: string): Result<string[]> {
  try {
    return { ok: true, value: readdirSync(dir).filter((name) => name.endsWith(".json")).sort() };
  } catch (error) {
    return errorCode(error) === "ENOENT"
      ? { ok: true, value: [] }
      : { ok: false, reason: `claim storage unavailable (${errorCode(error) ?? "read failed"})` };
  }
}

function readDocument(file: string, name: string, source?: ClaudeSource): Result<ClaimDocument | undefined> {
  try {
    const text = readIfPresent(file);
    if (text === undefined) return { ok: true, value: undefined };
    const decoded = decodeClaimDocument(text, source);
    if (!decoded.ok) return { ok: false, reason: `claim ${name}: ${decoded.reason}` };
    const { claim } = decoded.value;
    if (name !== `${claim.spec}#${claim.phase}.json`)
      return { ok: false, reason: `claim ${name}: filename does not match stored target` };
    return decoded;
  } catch (error) {
    return { ok: false, reason: `claim ${name}: read failed (${errorCode(error) ?? "unavailable"})` };
  }
}
