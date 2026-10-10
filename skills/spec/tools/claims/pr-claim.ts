// A babysit session claims a whole PR group, not a phase: `pr-<group>` beside the phase ids.
const PR_GROUP = /^[a-z0-9]+$/i;
const PR_CLAIM = /^pr-([A-Za-z0-9]+)$/;

export function isPrGroup(token: string): boolean {
  return PR_GROUP.test(token);
}

export function prClaimId(group: string): string {
  return `pr-${group}`;
}

export function prClaimGroup(id: string): string | undefined {
  return PR_CLAIM.exec(id)?.[1];
}
