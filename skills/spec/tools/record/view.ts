import type { Tip } from "../core/land-on-ref";

// One tip of the record, read once per command. `doc` is undefined for a missing or unparsable document.
export interface RecordView {
  tip: Tip;
  paths(): string[];
  version(path: string): string | undefined;
  doc(path: string): unknown;
}
