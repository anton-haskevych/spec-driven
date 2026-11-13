import { samePerson } from "../core/people";

// `hue` picks the person's colour: violet for board.people's first, pink for its second, then a fixed list.
export interface PagePerson {
  name: string;
  initial: string;
  hue: number;
}

export function pagePeople(listed: readonly string[], seen: readonly string[]): PagePerson[] {
  const names: string[] = [];
  for (const name of [...listed, ...seen]) if (!names.some((known) => known === name || samePerson(known, name))) names.push(name);
  return names.map((name, hue) => ({ name, initial: name.trim().charAt(0).toUpperCase() || "?", hue }));
}

export function personOf(people: readonly PagePerson[], name: string | undefined): PagePerson | undefined {
  if (name === undefined) return undefined;
  return people.find((person) => person.name === name) ?? people.find((person) => samePerson(person.name, name));
}
