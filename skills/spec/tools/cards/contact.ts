// The Academy board's rule: no phone numbers or emails on a card or a source.

const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i;
const DIGIT_RUN = /\+?\(?\d[\d\s().-]*\d/g;
const DATE = /\d{4}-\d{2}-\d{2}/;
const PHONE_DIGITS = 10;

export function contactDetailsIn(text: string): string[] {
  return [...(EMAIL.test(text) ? ["an email"] : []), ...(hasPhone(text) ? ["a phone number"] : [])];
}

function hasPhone(text: string): boolean {
  return [...text.matchAll(DIGIT_RUN)].some(([run]) => !DATE.test(run) && run.replace(/\D/g, "").length >= PHONE_DIGITS);
}

export function contactProblems(field: string, text: string | undefined): string[] {
  return text === undefined ? [] : contactDetailsIn(text).map((kind) => `${field} holds ${kind}; never put contact details on the board`);
}
