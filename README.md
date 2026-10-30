# UNLOCK Lab Platform — real-user beta (separate from the demo)

**This is a production-oriented, multi-institution implementation, not a replacement for the fictional hackathon demo.** The platform is not yet live: it needs a **new, dedicated Supabase project**. Never put real people or equipment details into the legacy demo; its user-switching interface does not authenticate users.

## What is implemented

- Email/password registration, email verification, sign-in, sign-out, recovery initiation and recovery-token password change using Supabase Auth; HttpOnly, SameSite session cookies.
- Public discovery catalogue for approved institutions; individual verified accounts.
- Owner applications for institutions; independent human-reviewed approval by a platform administrator.
- Owners list resources with locations, local time zone, hours, safety conditions and required certifications.
- Owner-reviewed Skill Passport certificates, qualification checks, transparent fair-use cap (2 open requests and 6h per resource / 7 days).
- Transactional bookings, manager/owner explanations, fair-queue exceptions with documented overrides, **PostgreSQL exclusion constraint preventing concurrent overlapping confirmed reservations**.
- Owner-rotatable handover PINs; booking check-in; initial condition; return; final condition; confirmation.
- Private image evidence limited to booking participants, max 3MB JPEG/PNG/WebP; human-reviewed incident records and no automatic fines.
- Database-level row security; read-only client tables; approved RPC workflows; append-only activity history; in-app notifications.
- Animated, responsive UI with a reduced-motion media query; no exposed service role credentials.

## Project layout

- `server.js`: lightweight zero-dependency Node.js HTTP server. Proxies Supabase Auth/PostgREST/storage using each user's JWT (not an admin key).
- `sql/001_platform.sql`: **new-project-only** schema, security policies, database transaction functions and storage bucket policies.
- `public/`: interactive web experience.
- `validate.js` and `tests/`: input validation, fail-closed and security regression tests.

## Required setup — dedicated, isolated infrastructure

1. Create a **new Supabase project for UNLOCK Lab**, not an existing unrelated project. Apply `sql/001_platform.sql` in the SQL editor and inspect advisors. (No SQL has been applied to the user's existing Supabase project.)
2. In Supabase Auth, **enable email confirmation**, configure SMTP for reliable production mail, set Site URL to your production domain and allow redirect URL `https://YOUR-DOMAIN/`.
3. Sign up with an operator account and confirm email. Then run the documented final administrative `UPDATE` in the migration, substituting the verified operator email; this is a deliberate operator-only manual bootstrap. Verify institution ownership with external documentation before approvals.
4. Obtain the project's **publishable key**, never the service role or secret key, and its project URL.
5. On Render, create a **separate** Node web service from the `production-platform` branch, set repository root as its root directory and `npm start`, with environment variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NODE_ENV=production`, `COOKIE_SECURE=true`, and `PUBLIC_URL=https://YOUR-SERVICE.onrender.com`. This branch contains the platform at its repository root, so Render can deploy it directly. Do not change the current demo service on `main`.
6. Verify these journeys with **two real test accounts** and an operator: register → verify email → apply for institution → approve → list equipment → request training → certify → request booking → approve → check in → attach condition photo → return → owner confirmation → inspect event record.
7. Configure domain, uptime alerts, database backups, abuse monitoring, e-mail notifications, privacy documents, incident escalation and regular restore drills before broad onboarding.

Run locally after configuring `.env` values in your environment (do not commit `.env`):

```sh
node --env-file=.env server.js
npm test
```

## Explicit limitations before broad real-world launch

- The SQL schema has **not** been applied to a real dedicated project, so database-level integration, full browser journeys, email delivery and storage rules remain **unverified**.
- One owner per institution and a single global platform admin role. Delegated department managers need to be added.
- In-app notifications exist; outbound email reminders, overdue cron monitoring and SMS are not yet enabled.
- Public catalog requires signup for booking; this is intentional.
- Resource availability uses owner-defined local operating hours. The booking form currently accepts the *visitor's local time*, so international reservations require extra timezone-aware scheduling UX and DST testing.
- Handovers use owner-provided PINs, not physical door or equipment control. Dangerous equipment must be supervised as required.
- No escrow, deposit processing, insurance, identity document collection, deletion workflow, or multi-factor authentication enforcement yet.
- Password recovery requires properly configured Auth email templates and redirect links.
- A public site needs moderation, privacy-policy and terms approval, consent, lawful-basis assessment, India DPDP Act obligations where applicable, security review, penetration testing, rate limits at CDN/WAF, and data retention procedures.
- In-memory per-process rate-limiting is a small defence only; it is not distributed DDoS or credential-stuffing protection.
- No claims of production readiness or a passing real-user integration test should be made before the steps above are completed.

## Hackathon compliance

This separate implementation and earlier demo code were generated with AI assistance on 30 October 2026. If the official 48-hour window has not started, do not submit this code as if it were written inside that window. Follow event instructions on pre-existing code, templates, AI disclosures and participant contribution records.
