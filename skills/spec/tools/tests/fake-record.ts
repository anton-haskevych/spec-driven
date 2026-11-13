import type { Tip } from "../core/land-on-ref";
import { blobVersion, serializeDoc } from "../record/document";
import type { RecordPort } from "../record/ref";
import { viewOfTexts, type RecordView } from "../record/view";

export { viewOfTexts };
import { fakeRef, type FakeRef } from "./fake-ref";

export function viewOf(docs: Record<string, unknown>, tip: Tip = { kind: "at", sha: "t1" }): RecordView {
  return viewOfTexts(new Map(Object.entries(docs).map(([path, doc]) => [path, serializeDoc(doc)])), tip);
}

export type FakeRecord = FakeRef & RecordPort;

// The in-memory record every later phase's tests use: git's lease rules plus offline and busy switches
// from fakeRef; an absent record is the default.
export function fakeRecord(): FakeRecord {
  const ref = fakeRef();
  return Object.assign(ref, {
    blobIdsByPath: (tip: string) => ({ ok: true as const, value: new Map([...ref.filesAt(tip)].map(([path, text]) => [path, blobVersion(text)])) }),
    readBlob(version: string) {
      for (const commit of ref.commits.values()) {
        for (const text of commit.files.values()) if (blobVersion(text) === version) return { ok: true as const, value: text };
      }
      return { ok: false as const, reason: `no blob ${version}` };
    },
    readBlobs(versions: readonly string[]) {
      const texts = new Map<string, string>();
      for (const commit of ref.commits.values()) {
        for (const text of commit.files.values()) if (versions.includes(blobVersion(text))) texts.set(blobVersion(text), text);
      }
      return { ok: true as const, value: texts };
    },
  });
}
