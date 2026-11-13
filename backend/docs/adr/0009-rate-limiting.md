# ADR 0009: Two-tier rate limiting without Redis

- Status: Accepted for Stage 1B

## Decision

| Limit (default) | Key | Store |
|---|---|---|
| Sign-in initiation `RATE_LIMIT_LOGIN` (20 / 60 s) | client IP | PostgreSQL |
| Sign-in callback **failures** `RATE_LIMIT_CALLBACK_FAILURES` (10 / 15 min); once reached, the callback is refused before any work | client IP | PostgreSQL |
| Sensitive operations (`rateLimit: 'sensitive'`: user provisioning, role grant/revoke, status change, queue requeue) `RATE_LIMIT_SENSITIVE` (30 / 60 s) | user | PostgreSQL |
| General authenticated API `RATE_LIMIT_API` (600 / 60 s) | user | process memory |

- **PostgreSQL limiter.** Fixed windows in an **UNLOGGED** table, one `INSERT … ON CONFLICT DO UPDATE` per counted event. Keys are SHA-256-hashed, so IPs are not stored in clear. It is shared by every instance and correct across restarts.
- **Memory limiter.** Per-process fixed windows, bounded in size. It has no database cost, but the effective limit is the limit × the number of instances, so it is an abuse dampener and **not** a security control.
- Every limit answers `429 RATE_LIMITED` with `Retry-After`.
- The client IP is `request.ip`, which uses `X-Forwarded-For` only from proxies listed in `TRUST_PROXY` (tested with spoofed headers both with and without a trusted proxy).

## Trade-offs

- One extra row write per sign-in attempt, callback failure and sensitive operation. These are low-volume by nature. Putting the general limit in PostgreSQL would add a write to every API request, so it stays in memory.
- UNLOGGED: there is no WAL, so writes are cheap, but counters reset after a crash or failover and are not replicated. Losing a window is acceptable for rate limits.
- Fixed windows allow up to 2× the limit across a window boundary. This is accepted for these coarse controls.
- **Redis is not added**: no requirement here needs it. Revisit only if the general limit must be exact across many instances.
- The platform or proxy should still apply coarse per-IP limits before the application.
