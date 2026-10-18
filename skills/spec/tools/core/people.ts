import type { SpecMeta } from "./spec-meta";

export const UNKNOWN = "unknown";
// A malformed `owner:`: offered to no one, so a typo never hands a spec to every crew.
export const INVALID_OWNER = "?";
const MIN_PREFIX = 3;

export function personKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function hasMatchKey(name: string): boolean {
  return personKey(name).length >= MIN_PREFIX;
}

// A git name and a gh login rarely agree exactly ("Taras Korpach" vs "taras"), so one side may be a prefix.
export function samePerson(a: string, b: string): boolean {
  const [x, y] = [personKey(a), personKey(b)];
  const [shorter, longer] = x.length <= y.length ? [x, y] : [y, x];
  if (shorter === UNKNOWN || longer === UNKNOWN || shorter.length < MIN_PREFIX) return false;
  return longer.startsWith(shorter);
}

// Nobody owns it, or this person does.
export function isOffered(owner: string | undefined, person: string): boolean {
  return owner === undefined || (owner !== INVALID_OWNER && samePerson(owner, person));
}

// Code deciding who gets work reads the owner here, never `meta.owner`.
export function ownerOf(meta: SpecMeta): string | undefined {
  return meta.ownerInvalid ? INVALID_OWNER : meta.owner;
}
