# Engineering Principles

Reference loaded by `execute.md` at the start of every execution cycle. These rules govern code that ships from a spec-driven workflow.

## 1. Self-documenting code

If a reader needs comments to understand what code does, the code is wrong. Code is self-documenting when intent reads off the function names, variable names, types, and structure — without surrounding prose. Comments that explain *what* the code does are a bug smell: rename, restructure, or split until the comment becomes redundant. Comments that explain *why* (a non-obvious constraint, a workaround for a specific bug, an invariant a reader would not predict) are sometimes warranted, but rare. Default to none.

Apply this every time you finish a function: read it back cold. Could a colleague describe what it does without scrolling, without guessing, without reading the test? If not, it is not done.

## 2. Names are the primary tool

Names carry the weight that comments would. `process()` is a smell; `extractInvoiceLineItems()` is a name. Variables, functions, classes, modules, files, folders — each name asserts a contract. Bad names create the demand for comments; good names eliminate it.

## 3. Pure functions wherever pure logic exists

Same input → same output, no side effects. Pure functions are trivially unit-testable, trivially reasoned about, and trivially refactored. Side effects live at the seams (entry points, persistence boundaries, network adapters), not woven through the business logic.

## 4. Single responsibility

If describing what a function does requires the word "and", it is two functions. Split before naming.

## 5. Hard size caps

A function is **under 50 lines**. A file is **under 250 lines**. Hard caps. When code approaches the cap, answer the question — *is this still one thing?* — and split when the answer is no. Most growth past the cap signals the unit is doing two things.

## 6. Layered separation — frontend

Frontend code follows a strict layered model: **UI ↔ business logic ↔ state ↔ API ↔ persistence**. Each layer is testable in isolation by stubbing the layer below. No cross-layer reach-around. Cross-layer access goes through interfaces.

## 7. Backend layout — follow project rules

For backend code, the layered model above does not apply uniformly. Hexagonal, MVC, ports-and-adapters, Clean Architecture, microservice-per-bounded-context — the conventions vary by project.

Before writing backend code, look for project-specific rules in this order:

1. `backend/docs/rules/` (or `backend/docs/architecture/`)
2. `docs/architecture/` or `docs/rules/`
3. The closest `CLAUDE.md` (project-level, then service-level if monorepo)
4. Existing handlers / services / repositories — read three or four to infer the pattern

Mirror the project's pattern. Do not impose a new one.

## 8. Single source of truth

One place per fact. Never duplicate the validation rule, the constant, or the datum. Duplication is a bug-in-waiting.

## 9. Extract on the second use — with a test

When you envision 2+ uses of the same logic, lift it into a helper **immediately** — its own file, its own unit test. Do not let duplication accumulate.

The trigger is *envisioned reuse*, not speculation: the second call site is concrete and named in the current chunk. A hypothetical future use is not a reason to extract.

When you do extract:

- The helper lives in its own file, named for what it does.
- The file has a corresponding unit test that exercises the helper directly.
- Both files commit together (or the test commits first, red, in TDD form).

## 10. Cohesion over file-type clustering

Group by what changes together. `users/` containing handler + service + repository + types beats `models/` `controllers/` `views/` split by file type. The folder structure should match the bounded context, not the framework's vocabulary.

## 11. Explicit dependencies

Pass them in. No magic globals, no hidden imports inside business logic, no runtime-resolved string lookups. The dependencies of a unit appear in its signature.

## 12. Validate at boundaries, trust internally

User input, API responses, file contents — validated once at the edge. Inside the system, trust the types and the prior validation. Don't re-check the same invariant five layers deep; that pattern signals you don't trust your own code.

## 13. Tests at the right grain

Pure logic → exhaustive unit tests. Layer wiring → a small set of high-value integration tests. Don't unit-test glue; don't integration-test arithmetic. Tests should match the shape of the risk.

Every extracted helper (per principle 9) gets a unit test. No exceptions.

## 14. Composition over inheritance, composition over giant procedures

Small, sharp, single-purpose tools that pipe together. Inheritance hierarchies and 200-line procedures both hide behavior; composition exposes it.

## 15. Errors are values

Handle them explicitly at the right boundary. Don't swallow. Don't let exceptions cross major layer seams without context. The shape of error handling tells you where the system's responsibilities live.

## 16. No dead code, no commented-out code

Git remembers. Deleted code is recoverable. Commented-out code is noise that ages into confusion — the next reader cannot tell whether the comment is a reminder, a fallback, or a fossil. Delete it.

## 17. Tests are the spec

A well-written test communicates the invariant the code guarantees. If the test is hard to write, the code shape is wrong — refactor the code first, the test second.

## 18. Readability beats cleverness

A 5% slower, 10× more readable version wins unless the perf demonstrably matters in this context. Clever code is a tax on every future reader.
