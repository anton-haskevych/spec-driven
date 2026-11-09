import type { ReadSpecFile } from "../core/spec-state";

export interface PackReferences {
  ledgerIndex?: string;
  codeMap?: string;
  instructions?: string;
  stable: readonly { name: string; text: string }[];
}

export function loadPackReferences(read: ReadSpecFile): PackReferences {
  return {
    ledgerIndex: read("ledger/INDEX.md"),
    codeMap: read("code-map.md"),
    instructions: read("CLAUDE.md"),
    stable: ["design.md", "technical.md"].flatMap((name) => {
      const text = read(name);
      return text === undefined ? [] : [{ name, text }];
    }),
  };
}
