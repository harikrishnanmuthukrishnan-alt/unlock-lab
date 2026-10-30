# UNLOCK Lab — Hackathon Project Document

## 1. Selected use case

**Institution:** A fictional university makerspace and media lab operating within one campus. **Product:** UNLOCK Lab, a resource-sharing platform combining a campus equipment catalogue, qualification-aware access requests, fair allocation, a secure handover workflow and an auditable lifecycle. The first prototype supports fabrication tools, camera kits, workspaces, recording studios and a workstation.

**Core hypothesis:** Institutions have useful capacity, but a booking calendar alone is insufficient where equipment access depends on training, safety supervision, condition records, ownership accountability and equitable allocation. Our product focuses on moving a resource from listing to safe return with clear human ownership of decisions.

**Target users:** Students, student project groups, lab coordinators, equipment owners, and campus facilities managers. Owners remain the authority over approval and return confirmation. All demo personas and data are fictional.

## 2. Product strategy and distinct value

A normal calendar answers “Is the room free?” UNLOCK Lab answers “Can this person use it safely, why should they receive priority, and how will both sides prove the handover was completed?” The differentiation lies in bringing four pillars into one complete workflow:

1. **Skill Passport** — training requirements and clear eligibility feedback.
2. **FairQueue** — an explainable, rule-based allocation score and usage limits.
3. **Resource Passport** — a handover code, condition notes and optional before/after photos.
4. **Human-accountable decisions** — owner approvals, written reasons, incident review and an activity history.

A “LabMate” guidance layer provides context-sensitive explanations; a server-side AI integration can be enabled if a legitimate API key is available. It has no write permission to booking decisions.

## 3. Complete product workflow

1. Owner switches to Mira Kapoor and lists a resource, setting name, location, category, description, rules and training requirements.
2. Student discovers the resource through search/category filters, reads rules and sees eligibility.
3. Student requests a date, time and project purpose.
4. Server checks verification flags, skills, opening hours, maximum booking duration, duplicate requests and fair-use caps.
5. Conflict with an already-approved booking results in a waiting-list state; otherwise the request is pending human review.
6. Owner or manager reviews the request; higher-priority pending requests are protected unless an exceptional **written override** is recorded. Approval cannot double-book the asset.
7. Student enters the physical-resource handover code and records initial condition and optionally a photo.
8. Student submits the final condition, notes and optional photo. Damage creates a human-review incident, not an automatic penalty.
9. Resource owner confirms the return and may resolve any incident separately with a written outcome.
10. Booking participants see their transaction history; authorised managers may see wider operational history.

**Cancellation case:** Cancelling an approved booking triggers promotion of an eligible queued request to **pending**; a manager must still review and approve the newly available slot.

## 4. Fairness policy, transparent and deterministic

The prototype uses a **30-day activity-based priority score**:

`priority = 100 - (12 × hours used on this resource) - (2 × hours used across all resources)`

Lower prior usage improves priority. Two outstanding reservations per resource and a six-hour weekly limit reduce repeated monopolisation. In a competing pending queue, a lower-priority request cannot be approved ahead of an eligible higher-priority request without a written reason containing “override.” A manager can exercise human judgement for special needs or exceptional projects. This basic score does not itself determine the safety of equipment use. In deployment, equity tests should investigate edge cases, alternative time windows, disability accommodations and the risk of score gaming.

## 5. Technology and architecture

- **Frontend:** Accessible semantic HTML + modern CSS + vanilla JavaScript ES modules, no runtime dependencies; responsive layouts, motion-reduction setting, CSS 3D perspective and orbit animations.
- **Backend:** Node.js native HTTP server (zero external npm packages). Same-origin JSON API endpoints for bootstrap, demo login, actions, and optional assistant.
- **Persistence:** Local JSON state store, one process, synchronous state transitions. Intended only for single-instance demo; all realistic deployments must replace it with transactional relational storage.
- **Session:** HttpOnly SameSite demo cookie; openly selectable fictional identities for easy judging. **Not a secure identity service.**
- **Optional AI:** Server-only OpenAI Responses API; never stores provider keys in frontend. Model reads a simplified catalogue and current demo training tags. No model-initiated actions.
- **Notifications:** Persistent demo in-app notification records.
- **Visual system:** Hand-authored inline SVG icon paths, CSS-generated resource illustrations and gradient/3D hover motion.

### API overview

| Method | Path | Meaning |
|---|---|---|
| GET | `/healthz` | Health response |
| GET | `/api/bootstrap` | Role-scoped data and current fictional account |
| POST | `/api/demo-login` | Change a **demo-only** identity |
| POST | `/api/action` | Validated lifecycle operation |
| POST | `/api/assistant` | Optional model-backed read-only answer (key required) |

`/api/action` supports `addResource`, `request`, `review`, `cancel`, `checkin`, `checkout`, `confirmReturn`, `incident`, `resolveIncident` and manager `reset`.

## 6. Trust, safety and privacy

- Access conditions are evaluated in backend code, not taken from the visible eligibility badge.
- Owners/managers explicitly review approvals, rejections and incident resolutions.
- A rejected request requires a written explanation; exceptional fairness overrides leave a record.
- A return reported as damaged creates a review ticket, not an irreversible automatic fine or allegation of guilt.
- Owner actions and decision reasons create timestamped audit records.
- Bookings and incidents are filtered for the current borrower or authorised owner/manager; catalogue availability exposes busy times without other borrower's personal details.
- The UI strongly labels identity switching as a **judge demo**, and users must not enter sensitive real-world documents or confidential photos.
- In-app records are pseudonymous fictional examples; before/after photo upload is optional.

**Known security gaps:** Passwordless identity switching; no real SSO or secure qualification attestations; file JSON can be altered by server administrators; no durable database isolation; demo handover code visible remotely; no tamper-evident evidence handling; no physical access integration. Never use it for actual dangerous-equipment access.

## 7. Features developed in this prototype

**Functional:** owner listings; resource search/filter; eligibility checks; booking request/approval/rejection/waitlist; fair-use caps; competing-request priority; cancellation/promotion; check-in; condition evidence; check-out; owner return confirmation; incidents/resolution; in-app notifications; audit logs; demo role switching; optional assistant; manager-verified Skill Passport requests; extension requests with owner decisions; overdue monitoring and notifications; basic HTTP security headers.

**User experience:** custom UI with desktop sidebar, mobile navigation, animated hero with CSS 3D geometry, resource cards with parallax-like perspective, hover animation, status indicators, modals, reduced-motion compatibility and responsive layout.

## 8. Testing and judge credentials

Run `npm test` to exercise thirteen automated tests across the business rules and actual HTTP API (including access guards and a complete transaction). Full manual judge steps and fictional role credentials appear in the root `README.md`. All demo accounts are passwordless by design. Only fictional sample data should be used.

## 9. Limitations and future plan

1. Replace permissive demo login with institution SSO and verified qualifications administered by trained staff.
2. Use PostgreSQL with transactional booking locks/exclusion constraints, RLS and immutable audit logging.
3. Implement actual camera-based QR scanning with short-lived signed codes and on-site proximity checks.
4. Add cloud photo storage, retention windows, secure image processing and consent.
5. Move overdue monitoring to a background worker, and add scheduled reminders, email/SMS notification channels, accessibility auditing and i18n.
6. Pilot fairness policies, reserve accommodations, measure unused hours reclaimed and adoption.
7. Add verified document upload, trained-staff attestation, training renewals and internal dispute appeals.

## 10. Submission checklist and truthful disclosure

- **Functional product link:** Must be supplied after the team deploys and verifies access. Not yet created in this package.
- **Source repository:** Ready to upload. GitHub account connection is verified, but this integration cannot create a new GitHub repository. No repository URL is claimed until a dedicated repository exists and files are successfully published.
- **Project document:** This file.
- **Test instructions:** `docs/JUDGE_GUIDE.md`, README and 13 automated tests.
- **Team details:** To be added by actual team; no names or roles invented.
- **Contributions:** To be filled by actual participants based on actual work.
- **Pre-existing work disclosure:** The present source was generated through AI assistance on 2026-10-30. Teams must confirm their official hackathon build window and comply with the requirement to write submitted code within that time. Do not obscure that history.
- **Dependencies, libraries, assets:** Standard Node.js; zero npm libraries; optional fonts; hand-authored custom SVG and CSS; optional OpenAI API.

## 11. Judging criteria alignment

| Evaluation | Demonstration evidence |
|---|---|
| Problem understanding (15) | Training/safety requirements, equitable allocation, before/after records |
| Core solution (20) | Owner-controlled request + end-to-end handover |
| Working product (20) | Full judged journey completed through live API and UI |
| Technical depth (15) | Server-side permission checks, conflict prevention, independent tests |
| Trust and safety (10) | Conditions, manual approvals, signed-off returns, incident review |
| Fairness/access (10) | Score explanations, usage limits, waitlist and override reason |
| Originality (10) | Skill Passport + FairQueue + Resource Passport in one practical flow |

This is a technical demonstration and a proposal for future university pilots, **not a production-ready safety or security certification**.
