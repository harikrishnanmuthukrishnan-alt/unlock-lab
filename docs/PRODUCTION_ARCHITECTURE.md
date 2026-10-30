# Real-world migration architecture (next phase, NOT yet implemented)

The current repository contains a functional single-instance judge demo. The following is an implementation roadmap, not a claim of deployed production features.

## Proposed services

- **Next.js/React or existing SPA** served via HTTPS with institutional branding and WCAG evaluation.
- **Managed PostgreSQL** with institutions/tenants, users, roles, training records, resources, reservations, approvals, check-ins, condition reports, incidents, audit events, notifications.
- **Institutional identity provider** via OIDC/SAML; staff verify qualifications, roles are server-authoritative; remove self-service role switching entirely.
- **Signed upload service** to private object storage, with file size/type enforcement, malware scanning and retention policy.
- **Policy engine** for training, capacity, fair-share limits, holidays/maintenance windows, conflict rules, quotas and appeal reasons.
- **Transaction boundaries** with a PostgreSQL exclusion constraint to prevent overlapping confirmed time slots even under concurrent web requests.
- **Worker** for overdue reminders, waiting-list promotion notifications and reliable retries.
- **Audit events** stored as restricted append-only data with explicit retention and legal requirements.
- **Observability**: error reporting, health checks, SLOs, rate limits, backup tests, structured logs.

## Business rule example

1. Student signs in with institutional SSO; role, verified membership and training status are checked on server.
2. Student requests a 3D printer slot; policy engine evaluates eligibility and quotas, stores pending request.
3. Manager sees competing requests and a transparent priority explanation, and records a human approval.
4. Database transaction confirms no overlapping allocation, creates custody window and sends notification.
5. Staff verify identity at physical asset, issue a time-bound one-time handoff token; borrower uploads permitted condition evidence.
6. Student records return, staff confirms condition, and incidents get human review with appeal option.

## Fairness review

Current scoring: `100 − 12 × used_hours_this_resource_30d − 2 × all_resource_hours_30d`; high score ranks ahead, timestamps break ties. This is an **explainable demo heuristic**, not a validated policy for a real institution. Real rollout requires consultation with students, disability accommodations, approved research priorities, appeal mechanisms, and audits for disparate impact.

## Data governance

Collect only required data. Restrict records by tenant + role. Train the model on **no private user data** without explicit permissions; disable unneeded AI. Document retention for photos, training and incident reports. Implement export/deletion and incident correction rights under applicable policy.
