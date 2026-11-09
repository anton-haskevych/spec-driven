---
kind: principle
applies-to: [phase 2, phase 6]
created: 2026-11-09
---

# Preserve the claim document separately from its policy projection

`claims/document.ts` returns the original parsed record beside its normalized claim. Unknown fields at document, reference, source and takeover levels remain in that record. The projection deliberately contains only known policy fields; serializing it would drop extensions. Future mutation codecs must preserve the document and reject unsupported versions before writing, never re-encode a policy projection as a storage round trip.

Unversioned records require the caller's explicit legacy Claude source. Any recognized identity/version marker prevents legacy fallback; unknown source coverage holds a valid qualified claim, while undecodable identity refuses the read-only command. Schema 1 is an opt-in read contract, not writer activation or old-reader compatibility proof. Legacy `claimFromRecord` and mutators remain unchanged and must not consume qualified documents.
