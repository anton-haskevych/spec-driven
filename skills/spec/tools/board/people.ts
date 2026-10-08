const UNKNOWN = "unknown";
const MIN_PREFIX = 3;

export function personKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// A git name and a gh login rarely agree exactly ("Taras Korpach" vs "taras"), so one side may be a prefix.
export function samePerson(a: string, b: string): boolean {
  const [x, y] = [personKey(a), personKey(b)];
  const [shorter, longer] = x.length <= y.length ? [x, y] : [y, x];
  if (shorter === UNKNOWN || longer === UNKNOWN || shorter.length < MIN_PREFIX) return false;
  return longer.startsWith(shorter);
}
