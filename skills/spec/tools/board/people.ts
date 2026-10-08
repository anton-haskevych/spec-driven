import type { FocusClaim, FocusWork, PrCell } from "./model";

const UNKNOWN = "unknown";
const MIN_PREFIX = 3;

export interface PersonClaim extends FocusClaim {
  user: string;
}

export interface AuthoredPr {
  author?: string;
  cell: PrCell;
}

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

// Only "me" matches by prefix; everyone else is keyed exactly, so two teammates never merge.
export function focusWork(claims: readonly PersonClaim[], prs: readonly AuthoredPr[], me?: string): { work: FocusWork[]; unattributedPrs: PrCell[] } {
  const buckets = new Map<string, FocusWork>();
  const bucket = (name: string): FocusWork => {
    const mine = me !== undefined && samePerson(name, me);
    const person = personKey(mine ? me : name);
    const found = buckets.get(person) ?? { person, mine, claims: [], prs: [] };
    buckets.set(person, found);
    return found;
  };
  for (const { user, ...claim } of claims) bucket(user).claims.push(claim);
  for (const { author, cell } of prs) if (author) bucket(author).prs.push(cell);
  const work = [...buckets.values()].toSorted((a, b) => Number(b.mine) - Number(a.mine) || a.person.localeCompare(b.person));
  return { work, unattributedPrs: prs.flatMap(({ author, cell }) => (author ? [] : [cell])) };
}
