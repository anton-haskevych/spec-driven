# Engineering Principles

Reference loaded by `execute.md` at the start of every execution cycle. These rules govern code that ships from a spec-driven workflow.

## 1. Names are documentation

If you need a comment to explain what a function does, rename the function. `process()` is a smell; `extractInvoiceLineItems()` is a name. Names that describe intent eliminate the comments that would otherwise paper over poor naming.

## 2. Pure functions wherever pure logic exists

Same input → same output, no side effects. Pure functions are trivially unit-testable, trivially reasoned about, and trivially refactored. Side effects live at the seams (entry points, persistence boundaries, network adapters), not woven through the business logic.

## 3. Single responsibility

If describing what a function does requires the word "and", it is two functions. Split before naming.

## 4. Small functions, small files

A function fits on one screen. A file stays under ~300 lines. Hard caps force the cohesion question — *is this still one thing?* — instead of letting growth obscure it.

## 5. Layered separation

UI ↔ business logic ↔ state ↔ API ↔ persistence. Each layer is testable in isolation by stubbing the layer below. No cross-layer reach-around. Cross-layer access goes through interfaces.

## 6. Single source of truth

One place per fact. Never duplicate the validation rule, the constant, or the datum. Duplication is a bug-in-waiting.

## 7. Cohesion over file-type clustering

Group by what changes together. `users/` containing handler + service + repository + types beats `models/` `controllers/` `views/` split by file type. The folder structure should match the bounded context, not the framework's vocabulary.

## 8. Explicit dependencies

Pass them in. No magic globals, no hidden imports inside business logic, no runtime-resolved string lookups. The dependencies of a unit appear in its signature.

## 9. Validate at boundaries, trust internally

User input, API responses, file contents — validated once at the edge. Inside the system, trust the types and the prior validation. Don't re-check the same invariant five layers deep; that pattern signals you don't trust your own code.

## 10. Tests at the right grain

Pure logic → exhaustive unit tests. Layer wiring → a small set of high-value integration tests. Don't unit-test glue; don't integration-test arithmetic. Tests should match the shape of the risk.

## 11. Composition over inheritance, composition over giant procedures

Small, sharp, single-purpose tools that pipe together. Inheritance hierarchies and 200-line procedures both hide behavior; composition exposes it.

## 12. Errors are values

Handle them explicitly at the right boundary. Don't swallow. Don't let exceptions cross major layer seams without context. The shape of error handling tells you where the system's responsibilities live.

## 13. No dead code, no "just in case" abstractions, no commented-out code

Git remembers. YAGNI is the default — three similar lines beats a premature shared helper. The first time the helper would actually be reused, it's easy to extract. Before that, it's noise.

## 14. Tests are the spec

A well-written test communicates the invariant the code guarantees. If the test is hard to write, the code shape is wrong — refactor the code first, the test second.

## 15. Readability beats cleverness

A 5% slower, 10× more readable version wins unless the perf demonstrably matters in this context. Clever code is a tax on every future reader.
