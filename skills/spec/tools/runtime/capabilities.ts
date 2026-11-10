import type { SourceRef } from "./sessions";

export type Capability = "session-discovery" | "managed-ownership" | "background-workers" | "mixed-writers" | "native-installation";

export interface CapabilityOutcome {
  source: SourceRef;
  capability: Capability;
  state: "observed" | "unverified" | "unsupported" | "unavailable";
  reason: string;
}

export function unverifiedManagedCapabilities(source: SourceRef): CapabilityOutcome[] {
  return [
    { source, capability: "managed-ownership", state: "unverified", reason: "complete configured-environment coverage and shared writer contract not proved" },
    { source, capability: "background-workers", state: "unverified", reason: "owned lifecycle, disconnect survival, attention and descendant cleanup not proved" },
    { source, capability: "mixed-writers", state: "unverified", reason: "old-version native entry/resume cutover not proved" },
    { source, capability: "native-installation", state: "unverified", reason: "executed installed candidate, native hook trust and fresh-session recovery not proved; hosts own updates" },
  ];
}
