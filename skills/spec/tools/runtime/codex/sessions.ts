import type { Result } from "../../core/result";
import type { SessionReader } from "../read-sessions";
import type { CodexSource } from "../sessions";
import { scanLoaded } from "./scan";
import type { ReadOnlyRpc } from "./transport";

export function codexSessionReader(source: CodexSource, connect: () => Promise<Result<ReadOnlyRpc>>): SessionReader {
  return { source, read: async (observedAt) => {
    const connected = await connect();
    if (!connected.ok) return { sessions: [], coverage: [{ source, state: "unavailable", reason: connected.reason }] };
    try {
      return (await scanLoaded(connected.value, source, observedAt)).snapshot;
    } finally {
      connected.value.close();
    }
  } };
}
