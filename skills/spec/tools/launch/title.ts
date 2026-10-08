import { isPhaseId, normalizePhaseHint, SUB_COMMANDS } from "../context/request";

export interface LaunchTitle {
  spec: string;
  sub: string;
  phase?: string;
}

export const SPEC_NAME = /^[a-z0-9][a-z0-9-]*$/;

// The phase keeps `claude -n` names distinct; they become the claims' session names.
export function launchTitle(spec: string, sub: string, phase?: string): string {
  return [spec, sub, ...(phase === undefined ? [] : [normalizePhaseHint(phase)])].join(" ");
}

export function parseLaunchTitle(name: string): LaunchTitle | undefined {
  const [spec, sub, phase, ...extra] = name.split(" ");
  if (!spec || !sub || extra.length > 0 || !SPEC_NAME.test(spec) || !SUB_COMMANDS.has(sub)) return undefined;
  if (phase === undefined) return { spec, sub };
  return isPhaseId(phase) ? { spec, sub, phase: normalizePhaseHint(phase) } : undefined;
}
