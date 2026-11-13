import type { FileChange, Tip } from "../core/land-on-ref";
import type { Result } from "../core/result";
import { blobVersion, isPlainObject, parseDoc, serializeDoc } from "./document";
import { META_PATH } from "./layout";
import type { RecordPort } from "./ref";

export interface RecordView {
  tip: Tip;
  paths(): string[];
  version(path: string): string | undefined;
  doc(path: string): unknown;
}

// Every document read up front: a reader over many specs costs two git spawns, however many it opens.
export function readRecordSnapshot(port: Pick<RecordPort, "blobIdsByPath" | "readBlobs">, tip: string): Result<RecordView> {
  const versions = port.blobIdsByPath(tip);
  if (!versions.ok) return versions;
  const blobs = port.readBlobs([...new Set(versions.value.values())]);
  if (!blobs.ok) return blobs;
  const texts = new Map([...versions.value].map(([path, version]) => [path, blobs.value.get(version) ?? ""]));
  return { ok: true, value: viewOfTexts(texts, { kind: "at", sha: tip }) };
}

export function viewOfTexts(texts: ReadonlyMap<string, string>, tip: Tip): RecordView {
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

// The view as it reads once these planned changes land (a change with no text deletes its path).
export function viewWith(view: RecordView, changes: readonly FileChange[]): RecordView {
  const texts = new Map(view.paths().map((path) => [path, serializeDoc(view.doc(path))]));
  for (const change of changes) {
    if (change.text === undefined) texts.delete(change.path);
    else texts.set(change.path, change.text);
  }
  return viewOfTexts(texts, view.tip);
}

export function recordLayout(view: RecordView): number | undefined {
  const meta = view.doc(META_PATH);
  return isPlainObject(meta) && typeof meta.layout === "number" ? meta.layout : undefined;
}

export function openRecordView(port: Pick<RecordPort, "blobIdsByPath" | "readBlob">, tip: Tip): Result<RecordView> {
  const versions = tip.kind === "at" ? port.blobIdsByPath(tip.sha) : { ok: true as const, value: new Map<string, string>() };
  if (!versions.ok) return versions;
  const docs = new Map<string, unknown>();
  const view: RecordView = {
    tip,
    paths: () => [...versions.value.keys()].toSorted(),
    version: (path) => versions.value.get(path),
    doc(path) {
      const version = versions.value.get(path);
      if (version === undefined) return undefined;
      if (!docs.has(path)) {
        const text = port.readBlob(version);
        docs.set(path, text.ok ? parseDoc(text.value) : undefined);
      }
      return docs.get(path);
    },
  };
  return { ok: true, value: view };
}
