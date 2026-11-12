import type { Tip } from "../core/land-on-ref";
import { blobVersion, parseDoc, serializeDoc } from "../record/document";
import type { RecordPort } from "../record/ref";
import type { RecordView } from "../record/view";
import { fakeRef, type FakeRef } from "./fake-ref";

export function viewOfTexts(texts: ReadonlyMap<string, string>, tip: Tip = { kind: "absent" }): RecordView {
  return {
    tip,
    paths: () => [...texts.keys()].toSorted(),
    version: (path) => {
      const text = texts.get(path);
      return text === undefined ? undefined : blobVersion(text);
    },
    doc: (path) => {
      const text = texts.get(path);
      return text === undefined ? undefined : parseDoc(text);
    },
  };
}

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
  });
}
