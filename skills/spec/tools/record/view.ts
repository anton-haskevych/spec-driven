import type { Tip } from "../core/land-on-ref";
import type { Result } from "../core/result";
import { parseDoc } from "./document";
import type { RecordPort } from "./ref";

export interface RecordView {
  tip: Tip;
  paths(): string[];
  version(path: string): string | undefined;
  doc(path: string): unknown;
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
