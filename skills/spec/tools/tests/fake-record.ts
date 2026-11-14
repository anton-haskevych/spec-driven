import type { Tip } from "../core/land-on-ref";
import type { Result } from "../core/result";
import { phaseDocPath } from "../plan/kinds";
import { blobVersion, parseDoc, serializeDoc } from "../record/document";
import type { RecordReadPort } from "../record/read";
import type { RecordPort } from "../record/ref";
import { viewOfTexts, type RecordView } from "../record/view";
import { fakeRef, type FakeRef } from "./fake-ref";

export { viewOfTexts };

export function viewOf(docs: Record<string, unknown>, tip: Tip = { kind: "at", sha: "t1" }): RecordView {
  return viewOfTexts(new Map(Object.entries(docs).map(([path, doc]) => [path, serializeDoc(doc)])), tip);
}

export type FakeRecord = FakeRef & RecordPort & { fetchedAt: Date | undefined };

// The in-memory record every later phase's tests use, held to the same contract as gitRecordPort
// (record-port-contract.ts): git's lease rules plus offline, busy and failed-fetch switches; absent by default.
export function fakeRecord(): FakeRecord {
  const ref = fakeRef();
  const blobs = () => new Map([...ref.commits.values()].flatMap((commit) => [...commit.files.values()].map((text) => [blobVersion(text), text] as const)));
  return Object.assign(ref, {
    fetchedAt: undefined as Date | undefined,
    blobIdsByPath: (tip: string) => ({ ok: true as const, value: new Map([...ref.filesAt(tip)].map(([path, text]) => [path, blobVersion(text)])) }),
    readBlob(version: string): Result<string> {
      const text = blobs().get(version);
      return text === undefined ? { ok: false, reason: `can't read record blob ${version}` } : { ok: true, value: text };
    },
    readBlobs(versions: readonly string[]): Result<Map<string, string>> {
      const known = blobs();
      const texts = new Map<string, string>();
      for (const version of versions) {
        const text = known.get(version);
        if (text === undefined) return { ok: false, reason: `record blob ${version} is missing` };
        texts.set(version, text);
      }
      return { ok: true, value: texts };
    },
  });
}

// Linked to the record as git links a clone's ports: one tracking ref, one fetched stamp.
export function fakeRecordReadPort(record: FakeRecord): RecordReadPort {
  return {
    fetchTip: () => record.fetchTip(),
    blobIdsByPath: record.blobIdsByPath,
    readBlobs: record.readBlobs,
    trackingTip: () => record.tracking,
    lastFetched: () => record.fetchedAt,
    markFetched: (at) => {
      record.fetchedAt = at;
    },
  };
}

export function seedRecord(record: FakeRecord, docs: Record<string, unknown>): string {
  return record.landFromAnotherMachine(Object.entries(docs).map(([path, doc]) => ({ path, text: serializeDoc(doc) })));
}

export function docOf(record: FakeRecord, path: string): unknown {
  const text = record.filesAt(record.tip).get(path);
  return text === undefined ? undefined : parseDoc(text);
}

export function recordPhaseOf(record: FakeRecord, spec: string, phase: string): unknown {
  return docOf(record, phaseDocPath(spec, phase));
}

export function commitLog(record: FakeRecord): string[] {
  const messages: string[] = [];
  for (let sha = record.tip; sha !== undefined; sha = record.commits.get(sha)?.parent) messages.push(record.commits.get(sha)?.message ?? "");
  return messages;
}
