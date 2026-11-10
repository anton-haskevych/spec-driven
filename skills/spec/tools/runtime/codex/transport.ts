import type { Result } from "../../core/result";
import { connectProbeRpc, type ConnectionOptions, type ProbeRpc } from "./probe-rpc";

export type { ConnectionOptions } from "./probe-rpc";
export interface ReadOnlyRpc extends ProbeRpc {}

const READ_METHODS = new Set(["thread/loaded/list", "thread/read"]);

export async function connectReadOnly(options: ConnectionOptions): Promise<Result<ReadOnlyRpc>> {
  const connected = await connectProbeRpc(options, () => {});
  if (!connected.ok) return connected;
  return { ok: true, value: {
    request: (method, params) => READ_METHODS.has(method)
      ? connected.value.request(method, params)
      : Promise.resolve({ ok: false, reason: `read-only probe refuses ${method}` }),
    close: connected.value.close,
  } };
}
