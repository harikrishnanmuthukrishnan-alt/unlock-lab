# UNLOCK Lab: privacy, safety and deployment scope

## Current trust boundaries

- All examples are **fictional demo data**. Users intentionally can change role in the browser to allow judges to exercise a complete transaction without external accounts. **This is not authentication** and must never be used with real institutional data or physical access.
- Resource request eligibility, ownership checks, maximum booking hours, overlapping approved reservations, exception logging, and human approvals are enforced server-side in `logic.js`.
- All write routes accept JSON only; they check a same-origin request where an `Origin` header is supplied and require a custom application header as basic CSRF hardening. Demo cookies are HTTP-only and SameSite=Strict.
- API responses have basic security headers. Inline styles are permitted due to the presentation implementation; production should migrate to non-inline CSS and a stricter content security policy.
- Condition photographs are optional, compressed client-side; no image files or user messages are forwarded to a model by default. Any optional AI key is read server-side from environment variables.
- Auditing records a logical history but is not append-only or cryptographically immutable. The manager can reset fictional data.
- Students see their own booking records; owners see bookings for owned resources; managers see institution-wide records. Resource handover codes are provided only to owners/managers or users with approved/active bookings. **In a real institution, codes must be stored and validated as one-time secrets and checked by an employee at the physical asset.**
- No financial charges or automated penalties are applied. Incidents go to authorised human review.

## Threats / mitigations to implement before production

| Threat | Current state | Production prerequisite |
|---|---|---|
| Identity spoofing / impersonation | Open demo role switcher | Institutional SSO (OIDC/SAML), strong auth, server-provisioned roles |
| Data leakage between institutions | One fictional tenant | Tenant IDs + PostgreSQL row-level security + automated isolation tests |
| Simultaneous resource allocation | Single Node process and synchronous JSON persistence | PostgreSQL transaction with exclusion constraints on time ranges |
| Data persistence | Atomically replaced local JSON; optional persistent Docker volume | Managed DB, backups and restore drills |
| Credential reuse | Human-readable demonstration handover code | Expiring one-time QR / signed staff handoff tokens |
| Audit modification | Demo events in JSON | Append-only restricted audit table + independent retention |
| Unauthorized uploads | JPEG-converted inline demo photos | Signed uploads, antivirus scanning, type validation, object permissions |
| System abuse | Limited assistant rate check | Distributed rate limiting, monitoring, alerts, abuse controls |
| Overdue handling | Idempotent sweep when data is requested | Scheduled job and notifications service with escalation policies |
| Legal/privacy compliance | Fictional data only | Consent notice, data minimization, retention & deletion, institution DPA |
| AI bias and safety | Optional advisory assistant only | Human-reviewed decisions, model evaluations, documented limitations |

## Live demo hosting notice

If you share a public judge URL, ensure it contains **fictional data only**. Anyone who visits the demo can switch into owner or manager accounts and edit/reset the shared demo state. A public demo should be reset between judging sessions, have temporary hosting and be protected from misuse. Public access is **not evidence of production readiness**.
