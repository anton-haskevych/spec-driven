export function sessionLabel(name: string | undefined, sessionId: string): string {
  return name ?? `session ${sessionId.slice(0, 8)}`;
}
