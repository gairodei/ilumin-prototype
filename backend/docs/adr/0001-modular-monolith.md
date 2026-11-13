# ADR 0001: One TypeScript modular monolith beside the prototype

- Status: Accepted for Stage 1A (12 Nov 2026)
- Context: P10 §G recommends one backend service in TypeScript on Node.js and one PostgreSQL database. The browser prototype (repository root) is the behavioural specification and must stay untouched.

## Decision

- The production backend lives in `backend/`, a self-contained npm package. It shares no code with the prototype and is not shipped by `tools/build.mjs`, which copies only what `index.html` references.
- No `package.json` at the repository root, so the Cloudflare Pages build of the prototype is unaffected.
- One deployable process, organised by domain module: `src/modules/{auth,authz,audit,users,agencies}` now; seats, terms, enrolment, finance and agency come later as further modules in the same process and database.
- Node.js ≥ 22.12, ESM, TypeScript `strict`, compiled with `tsc` (no bundler).

## Consequences

- Cross-phase transactions (P10 §D) stay local to one database transaction. There is no network boundary inside a business operation.
- Microservices, a message broker and second databases are explicitly out of scope.
- The prototype's `js/` rules are a reference to port, not code to import.
