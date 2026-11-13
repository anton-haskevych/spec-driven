import { samePerson } from "../core/people";

// One spelling per person: an assignee is one of `board.people`, matched the way owners are.
export function resolveAssignee(name: string, people: readonly string[]): { name: string } | { refused: string } {
  if (people.length === 0) return { refused: "board.people in docs/specs/_playbook/settings.md lists nobody; add the names a card can be assigned to" };
  const matches = people.filter((person) => samePerson(person, name));
  if (matches.length === 1 && matches[0]) return { name: matches[0] };
  const listed = people.join(", ");
  return { refused: matches.length === 0 ? `${name} is not in board.people (${listed})` : `${name} matches ${matches.join(" and ")}; use the full name` };
}
