import type { Tip } from "../core/land-on-ref";
import { blobVersion, parseDoc, serializeDoc } from "../record/document";
import type { RecordView } from "../record/view";

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
